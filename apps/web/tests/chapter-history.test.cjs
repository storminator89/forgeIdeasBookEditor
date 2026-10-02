const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const { webcrypto } = require("node:crypto");

function setup({ unavailable = false, insecure = false } = {}) {
  const values = new Map();
  let now = Date.now();
  class Clock extends Date {
    static now() {
      return now;
    }
    constructor(...args) {
      super(...(args.length ? args : [now]));
    }
  }
  const context = {
    exports: {},
    Date: Clock,
    crypto: insecure
      ? { getRandomValues: webcrypto.getRandomValues.bind(webcrypto) }
      : webcrypto,
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => {
        if (unavailable) throw new Error("QuotaExceeded");
        values.set(key, value);
      },
    },
  };
  const source = fs.readFileSync(
    path.join(__dirname, "../src/lib/chapter-history.ts"),
    "utf8",
  );
  vm.runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    context,
  );
  return {
    ...context.exports,
    values,
    advance: (ms) => {
      now += ms;
    },
  };
}
const draft = (content) => ({
  title: "Kapitel",
  content,
  summary: "Kontext",
  notes: "Notiz",
  status: "draft",
});

test("manual checkpoints preserve distinct drafts and isolate chapters", () => {
  const history = setup();
  assert.equal(history.checkpointChapter("book", "a", draft("A")), true);
  assert.equal(history.checkpointChapter("book", "a", draft("B")), true);
  assert.equal(history.checkpointChapter("book", "a", draft("B")), true);
  history.checkpointChapter("book", "b", draft("C"));
  assert.equal(history.readChapterHistory("book", "a").length, 2);
  assert.equal(history.readChapterHistory("book", "a")[1].payload.content, "A");
  assert.equal(history.readChapterHistory("book", "b")[0].payload.content, "C");
});

test("automatic checkpoints respect the interval while manual ones remain available", () => {
  const history = setup();
  history.checkpointChapter("book", "a", draft("A"), "automatic");
  history.checkpointChapter("book", "a", draft("B"), "automatic");
  assert.equal(history.readChapterHistory("book", "a").length, 1);
  history.checkpointChapter("book", "a", draft("B"), "manual");
  history.advance(300_000);
  history.checkpointChapter("book", "a", draft("C"), "automatic");
  assert.equal(history.readChapterHistory("book", "a").length, 3);
});

test("history retains the newest ten snapshots", () => {
  const history = setup();
  for (let i = 0; i < 15; i++)
    history.checkpointChapter("book", "a", draft(String(i)));
  const revisions = history.readChapterHistory("book", "a");
  assert.equal(revisions.length, 10);
  assert.equal(revisions[0].payload.content, "14");
  assert.equal(revisions[9].payload.content, "5");
});

test("size limits trim old entries and refuse oversized drafts without losing history", () => {
  const history = setup();
  history.checkpointChapter("book", "a", draft("A".repeat(800_000)));
  history.checkpointChapter("book", "a", draft("B".repeat(800_000)));
  assert.equal(history.readChapterHistory("book", "a").length, 1);
  assert.equal(
    history.checkpointChapter("book", "a", draft("C".repeat(1_600_000))),
    false,
  );
  assert.ok(
    history.readChapterHistory("book", "a")[0].payload.content.startsWith("B"),
  );
});

test("storage failures return failure so the editor can refuse destructive restoration", () => {
  const history = setup({ unavailable: true });
  assert.equal(history.checkpointChapter("book", "a", draft("A")), false);
  assert.equal(history.values.size, 0);
});

test("corrupt history is preserved and malformed individual entries are filtered", () => {
  const history = setup();
  history.values.set("forge-history:book:a", "broken-json");
  assert.equal(history.checkpointChapter("book", "a", draft("A")), false);
  assert.equal(history.values.get("forge-history:book:a"), "broken-json");
  history.values.set(
    "forge-history:book:a",
    JSON.stringify([
      { id: "bad", savedAt: "invalid", kind: "manual", payload: draft("A") },
    ]),
  );
  assert.equal(history.readChapterHistory("book", "a").length, 0);
});

test("snapshots also work over a LAN HTTP connection without randomUUID", () => {
  const history = setup({ insecure: true });
  assert.equal(history.checkpointChapter("book", "a", draft("A")), true);
  assert.equal(typeof history.readChapterHistory("book", "a")[0].id, "string");
});
