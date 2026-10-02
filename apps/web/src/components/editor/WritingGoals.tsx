"use client";

import { useEffect, useState } from "react";
import { Check, Flag, Target } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/components/locale-provider";
import {
  readWritingProgress,
  saveWritingProgress,
  writingProgressEvent,
  type WritingProgress,
} from "@/lib/writing-progress";

export default function WritingGoals({
  bookId,
  currentWords,
}: {
  bookId: string;
  currentWords: number;
}) {
  const { t, intlLocale } = useI18n();
  const [progress, setProgress] = useState<WritingProgress | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [dailyGoal, setDailyGoal] = useState("500");
  const [manuscriptGoal, setManuscriptGoal] = useState("50000");
  useEffect(() => {
    const update = () => setProgress(readWritingProgress(bookId));
    update();
    window.addEventListener(writingProgressEvent, update);
    window.addEventListener("storage", update);
    window.addEventListener("focus", update);
    return () => {
      window.removeEventListener(writingProgressEvent, update);
      window.removeEventListener("storage", update);
      window.removeEventListener("focus", update);
    };
  }, [bookId]);
  const openSettings = () => {
    setDailyGoal(String(progress?.dailyGoal || 500));
    setManuscriptGoal(String(progress?.manuscriptGoal || 50000));
    setIsEditing(true);
  };
  const valid =
    Number.isInteger(Number(dailyGoal)) &&
    Number(dailyGoal) >= 1 &&
    Number(dailyGoal) <= 100000 &&
    Number.isInteger(Number(manuscriptGoal)) &&
    Number(manuscriptGoal) >= 1 &&
    Number(manuscriptGoal) <= 10000000;
  const saveGoals = () => {
    if (!valid) return;
    try {
      saveWritingProgress(bookId, {
        ...readWritingProgress(bookId),
        dailyGoal: Number(dailyGoal),
        manuscriptGoal: Number(manuscriptGoal),
      });
      setIsEditing(false);
    } catch {
      toast.error(
        t({
          de: "Ziele konnten auf diesem Gerät nicht gespeichert werden.",
          en: "Goals could not be saved on this device.",
        }),
      );
    }
  };
  const todayWords = Math.max(0, progress?.words || 0);
  return (
    <section
      className="writing-goals"
      aria-label={t({ de: "Deine Schreibziele", en: "Your writing goals" })}
    >
      <div className="writing-goals-intro">
        <Target size={20} />
        <div>
          <strong>
            {t({ de: "Wort für Wort voran.", en: "One word at a time." })}
          </strong>
          <span>
            {t({
              de: "Deine Schreibziele auf diesem Gerät",
              en: "Your writing goals on this device",
            })}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={openSettings}>
          {t({ de: "Ziele setzen", en: "Set goals" })}
        </Button>
      </div>
      <div className="writing-goal-grid">
        {[
          {
            label: t({ de: "Wortzuwachs heute", en: "Words added today" }),
            value: todayWords,
            goal: progress?.dailyGoal || 500,
            icon: Target,
          },
          {
            label: t({ de: "Manuskriptziel", en: "Manuscript goal" }),
            value: currentWords,
            goal: progress?.manuscriptGoal || 50000,
            icon: Flag,
          },
        ].map(({ label, value, goal, icon: Icon }) => (
          <div className="writing-goal" key={label}>
            <div>
              <span>
                <Icon size={14} />
                {label}
              </span>
              <strong>
                {value.toLocaleString(intlLocale)}{" "}
                <small>/ {goal.toLocaleString(intlLocale)}</small>
                {value >= goal && <Check size={15} />}
              </strong>
            </div>
            <div
              className="writing-goal-bar"
              role="progressbar"
              aria-label={label}
              aria-valuemin={0}
              aria-valuemax={goal}
              aria-valuenow={Math.min(value, goal)}
            >
              <span
                style={{ width: `${Math.min(100, (value / goal) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t({
                de: "Dein Rhythmus. Deine Ziele.",
                en: "Your rhythm. Your goals.",
              })}
            </DialogTitle>
            <DialogDescription>
              {t({
                de: "Setze dir erreichbare Ziele. Der Tagesfortschritt zählt den gespeicherten Wortzuwachs auf diesem Gerät.",
                en: "Set achievable goals. Daily progress counts saved word growth on this device.",
              })}
            </DialogDescription>
          </DialogHeader>
          <label className="space-y-2">
            <span className="text-sm">
              {t({ de: "Wörter pro Tag", en: "Words per day" })}
            </span>
            <Input
              type="number"
              min={1}
              max={100000}
              value={dailyGoal}
              onChange={(event) => setDailyGoal(event.target.value)}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm">
              {t({
                de: "Wörter im fertigen Manuskript",
                en: "Words in the finished manuscript",
              })}
            </span>
            <Input
              type="number"
              min={1}
              max={10000000}
              value={manuscriptGoal}
              onChange={(event) => setManuscriptGoal(event.target.value)}
            />
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              {t({ de: "Abbrechen", en: "Cancel" })}
            </Button>
            <Button onClick={saveGoals} disabled={!valid}>
              {t({ de: "Ziele speichern", en: "Save goals" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
