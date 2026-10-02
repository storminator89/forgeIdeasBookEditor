export type ChapterDraft = {
  title: string;
  content: string;
  summary: string;
  notes: string;
  status: string;
};

export type ChapterRevision = {
  id: string;
  savedAt: string;
  kind: "automatic" | "manual";
  payload: ChapterDraft;
};

const MAX_REVISIONS = 10;
const MAX_STORAGE_LENGTH = 1_500_000;
const AUTO_INTERVAL = 5 * 60 * 1000;

export function isChapterDraft(value: unknown): value is ChapterDraft {
  return (
    !!value &&
    typeof value === "object" &&
    ["title", "content", "summary", "notes", "status"].every(
      (key) => typeof (value as Record<string, unknown>)[key] === "string",
    )
  );
}

function historyKey(bookId: string, chapterId: string) {
  return `forge-history:${bookId}:${chapterId}`;
}

export function readChapterHistory(
  bookId: string,
  chapterId: string,
): ChapterRevision[] {
  const parsed: unknown = JSON.parse(
    localStorage.getItem(historyKey(bookId, chapterId)) || "[]",
  );
  if (!Array.isArray(parsed)) throw new Error("Invalid chapter history");
  return parsed
    .filter(
      (value): value is ChapterRevision =>
        !!value &&
        typeof value === "object" &&
        typeof value.id === "string" &&
        typeof value.savedAt === "string" &&
        Number.isFinite(Date.parse(value.savedAt)) &&
        (value.kind === "automatic" || value.kind === "manual") &&
        isChapterDraft(value.payload),
    )
    .slice(0, MAX_REVISIONS);
}

// Local, bounded snapshots supplement the manuscript; they are not a server backup.
export function checkpointChapter(
  bookId: string,
  chapterId: string,
  payload: ChapterDraft,
  kind: ChapterRevision["kind"] = "manual",
): boolean {
  try {
    const revisions = readChapterHistory(bookId, chapterId);
    if (
      revisions[0] &&
      JSON.stringify(revisions[0].payload) === JSON.stringify(payload)
    )
      return true;
    const lastAutomatic = revisions.find(
      (revision) => revision.kind === "automatic",
    );
    if (
      kind === "automatic" &&
      lastAutomatic &&
      Date.now() - Date.parse(lastAutomatic.savedAt) < AUTO_INTERVAL
    )
      return true;
    const revision: ChapterRevision = {
      id:
        typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Array.from(crypto.getRandomValues(new Uint32Array(2))).join("-")}`,
      savedAt: new Date().toISOString(),
      kind,
      payload: { ...payload },
    };
    const next = [revision, ...revisions].slice(0, MAX_REVISIONS);
    let serialized = JSON.stringify(next);
    while (serialized.length > MAX_STORAGE_LENGTH && next.length > 1) {
      next.pop();
      serialized = JSON.stringify(next);
    }
    if (serialized.length > MAX_STORAGE_LENGTH) return false;
    localStorage.setItem(historyKey(bookId, chapterId), serialized);
    return true;
  } catch {
    return false;
  }
}
