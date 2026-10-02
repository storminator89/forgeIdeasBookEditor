export type WritingProgress = {
  dailyGoal: number;
  manuscriptGoal: number;
  date: string;
  words: number;
};
export const writingProgressEvent = "forge-writing-progress";
export function localWritingDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
export function readWritingProgress(bookId: string): WritingProgress {
  const defaults: WritingProgress = {
    dailyGoal: 500,
    manuscriptGoal: 50000,
    date: localWritingDate(),
    words: 0,
  };
  try {
    const saved = JSON.parse(
      localStorage.getItem(`forge-writing:${bookId}`) || "null",
    );
    if (
      !saved ||
      !Number.isFinite(saved.dailyGoal) ||
      !Number.isFinite(saved.manuscriptGoal)
    )
      return defaults;
    return {
      dailyGoal: Math.max(1, saved.dailyGoal),
      manuscriptGoal: Math.max(1, saved.manuscriptGoal),
      date: defaults.date,
      words:
        saved.date === defaults.date && Number.isFinite(saved.words)
          ? saved.words
          : 0,
    };
  } catch {
    return defaults;
  }
}
export function saveWritingProgress(bookId: string, progress: WritingProgress) {
  localStorage.setItem(`forge-writing:${bookId}`, JSON.stringify(progress));
  window.dispatchEvent(new Event(writingProgressEvent));
}
export function recordWritingProgress(bookId: string, delta: number) {
  try {
    const progress = readWritingProgress(bookId);
    saveWritingProgress(bookId, { ...progress, words: progress.words + delta });
  } catch {
    /* Saving the manuscript must also work without browser storage. */
  }
}
