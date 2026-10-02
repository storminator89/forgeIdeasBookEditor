"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, PenLine } from "lucide-react";
import { useI18n } from "@/components/locale-provider";

type Chapter = {
  id: string;
  title: string;
  status: string;
  orderIndex: number;
};
export default function ContinueWriting({
  bookId,
  chapters,
}: {
  bookId: string;
  chapters: Chapter[];
}) {
  const { t } = useI18n();
  const [lastId, setLastId] = useState<string | null>(null);
  useEffect(() => {
    try {
      const last = JSON.parse(
        localStorage.getItem(`forge-last-chapter:${bookId}`) || "null",
      );
      setLastId(last?.id || null);
    } catch {
      /* Fall back to unfinished chapters. */
    }
  }, [bookId]);
  const chapter =
    chapters.find((item) => item.id === lastId) ||
    chapters.find((item) => item.status === "in_progress") ||
    chapters.find((item) => item.status !== "completed") ||
    chapters[0];
  if (!chapter) return null;
  return (
    <Link
      href={`/books/${bookId}/chapter/${chapter.id}` as Route}
      className="continue-writing"
    >
      <span className="continue-writing-icon">
        <PenLine size={19} />
      </span>
      <div>
        <span>
          {t({
            de: "Zurück in deinen Schreibflow",
            en: "Back to your writing flow",
          })}
        </span>
        <strong>
          {t(
            { de: "Kapitel {{number}}", en: "Chapter {{number}}" },
            { number: chapter.orderIndex + 1 },
          )}{" "}
          · {chapter.title}
        </strong>
      </div>
      <span className="continue-writing-action">
        {t({ de: "Weiterschreiben", en: "Keep writing" })}
        <ArrowRight size={17} />
      </span>
    </Link>
  );
}
