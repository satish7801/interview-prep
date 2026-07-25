"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { dayKey, qaKey } from "@/data/tracks";
import type { PathSummary, QuizItem, QuizMode } from "@/data/types";
import { getAllQuizItems, getCatalog, getQuiz } from "@/lib/content";
import {
  clearProgressDocument,
  downloadProgressJson,
  emptyProgressDoc,
  loadProgressDocument,
  parseProgressJson,
  persistProgressDocument,
  type ProgressDocument,
} from "@/lib/storage";

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

type ProgressContextValue = {
  hydrated: boolean;
  doc: ProgressDocument;
  lastSavedAt: string | null;
  dirty: boolean;
  paths: PathSummary[];
  totalDays: number;
  doneDays: number;
  weakCount: number;
  totalQA: number;
  trackDoneCount: (trackId: string, dayCount?: number) => number;
  isDayDone: (trackId: string, dayN: number) => boolean;
  toggleDayDone: (trackId: string, dayN: number) => void;
  getNote: (trackId: string, dayN: number) => string;
  setNote: (trackId: string, dayN: number, value: string) => void;
  saveToFile: () => void;
  loadFromFile: (file: File) => Promise<void>;
  resetAll: () => void;
  quizOpen: boolean;
  quizMode: QuizMode | null;
  quizItems: QuizItem[];
  quizIndex: number;
  quizRevealed: boolean;
  quizLoading: boolean;
  quizError: string | null;
  currentQuiz: QuizItem | null;
  openQuiz: () => void;
  startQuiz: (mode: QuizMode) => void;
  closeQuiz: () => void;
  setQuizRevealed: (v: boolean) => void;
  markWeak: (item: QuizItem, isWeak: boolean) => void;
  nextQuiz: () => void;
};

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [doc, setDoc] = useState<ProgressDocument>(emptyProgressDoc);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [paths, setPaths] = useState<PathSummary[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [quizOpen, setQuizOpen] = useState(false);
  const [quizMode, setQuizMode] = useState<QuizMode | null>(null);
  const [quizItems, setQuizItems] = useState<QuizItem[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizRevealed, setQuizRevealed] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);

  useEffect(() => {
    const loaded = loadProgressDocument();
    setDoc(loaded);
    setLastSavedAt(loaded.updatedAt);
    setHydrated(true);
    void getCatalog()
      .then((c) => setPaths(c.paths))
      .catch(() => setPaths([]));
  }, []);

  const schedulePersist = useCallback(
    (updater: (prev: ProgressDocument) => ProgressDocument) => {
      setDoc((prev) => {
        const next = updater(prev);
        setDirty(true);
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          const saved = persistProgressDocument(next);
          setDoc(saved);
          setLastSavedAt(saved.updatedAt);
          setDirty(false);
        }, 350);
        return next;
      });
    },
    [],
  );

  const totalDays = useMemo(
    () => paths.reduce((n, p) => n + (p.dayCount ?? 0), 0),
    [paths],
  );
  const totalQA = useMemo(
    () => paths.reduce((n, p) => n + (p.qaCount ?? 0), 0),
    [paths],
  );
  const doneDays = useMemo(
    () => Object.values(doc.progress).filter(Boolean).length,
    [doc.progress],
  );
  const weakCount = useMemo(
    () => Object.values(doc.weak).filter(Boolean).length,
    [doc.weak],
  );

  const trackDoneCount = useCallback(
    (trackId: string) => {
      const prefix = `${trackId}-`;
      return Object.entries(doc.progress).filter(
        ([k, v]) => v && k.startsWith(prefix),
      ).length;
    },
    [doc.progress],
  );

  const isDayDone = useCallback(
    (trackId: string, dayN: number) => !!doc.progress[dayKey(trackId, dayN)],
    [doc.progress],
  );

  const toggleDayDone = useCallback(
    (trackId: string, dayN: number) => {
      const key = dayKey(trackId, dayN);
      schedulePersist((prev) => ({
        ...prev,
        progress: { ...prev.progress, [key]: !prev.progress[key] },
      }));
    },
    [schedulePersist],
  );

  const getNote = useCallback(
    (trackId: string, dayN: number) => doc.notes[dayKey(trackId, dayN)] ?? "",
    [doc.notes],
  );

  const setNote = useCallback(
    (trackId: string, dayN: number, value: string) => {
      const key = dayKey(trackId, dayN);
      schedulePersist((prev) => ({
        ...prev,
        notes: { ...prev.notes, [key]: value },
      }));
    },
    [schedulePersist],
  );

  const saveToFile = useCallback(() => {
    const saved = persistProgressDocument(doc);
    setDoc(saved);
    setLastSavedAt(saved.updatedAt);
    setDirty(false);
    downloadProgressJson(saved);
  }, [doc]);

  const loadFromFile = useCallback(async (file: File) => {
    const text = await file.text();
    const parsed = parseProgressJson(text);
    const saved = persistProgressDocument(parsed);
    setDoc(saved);
    setLastSavedAt(saved.updatedAt);
    setDirty(false);
  }, []);

  const resetAll = useCallback(() => {
    if (
      !confirm(
        "Reset all progress, notes, and weak spots? Download a JSON backup first if you need it.",
      )
    ) {
      return;
    }
    clearProgressDocument();
    const empty = emptyProgressDoc();
    setDoc(empty);
    setLastSavedAt(empty.updatedAt);
    setDirty(false);
  }, []);

  const openQuiz = useCallback(() => {
    setQuizMode(null);
    setQuizItems([]);
    setQuizIndex(0);
    setQuizRevealed(false);
    setQuizLoading(false);
    setQuizError(null);
    setQuizOpen(true);
  }, []);

  const startQuiz = useCallback(
    (mode: QuizMode) => {
      setQuizMode(mode);
      setQuizIndex(0);
      setQuizRevealed(false);
      setQuizItems([]);
      setQuizLoading(true);
      setQuizError(null);

      const run = async () => {
        let items: QuizItem[] = [];
        if (mode === "all" || mode === "weak") {
          const ids =
            paths.length > 0
              ? paths.map((p) => p.id)
              : (await getCatalog()).paths.map((p) => p.id);
          const all = await getAllQuizItems(ids);
          items = all.map((row) => ({
            trackId: row.trackId,
            dayN: row.dayN,
            qi: row.qi,
            q: row.q,
            a: row.a,
          }));
          if (mode === "weak") {
            items = items.filter(
              (it) => doc.weak[qaKey(it.trackId, it.dayN, it.qi)],
            );
          }
        } else {
          const file = await getQuiz(mode);
          items = file.items.map((it) => ({
            trackId: file.trackId,
            dayN: it.dayN,
            qi: it.qi,
            q: it.q,
            a: it.a,
          }));
        }
        setQuizItems(shuffle(items));
        setQuizLoading(false);
      };

      void run().catch((err: unknown) => {
        setQuizLoading(false);
        setQuizError(
          err instanceof Error ? err.message : "Failed to load quiz JSON",
        );
      });
    },
    [paths, doc.weak],
  );

  const closeQuiz = useCallback(() => {
    setQuizOpen(false);
    setQuizMode(null);
    setQuizItems([]);
    setQuizIndex(0);
    setQuizRevealed(false);
    setQuizLoading(false);
    setQuizError(null);
  }, []);

  const markWeak = useCallback(
    (item: QuizItem, isWeak: boolean) => {
      const key = qaKey(item.trackId, item.dayN, item.qi);
      schedulePersist((prev) => ({
        ...prev,
        weak: { ...prev.weak, [key]: isWeak },
      }));
    },
    [schedulePersist],
  );

  const nextQuiz = useCallback(() => {
    setQuizRevealed(false);
    setQuizIndex((i) => i + 1);
  }, []);

  const value = useMemo<ProgressContextValue>(
    () => ({
      hydrated,
      doc,
      lastSavedAt,
      dirty,
      paths,
      totalDays,
      doneDays,
      weakCount,
      totalQA,
      trackDoneCount,
      isDayDone,
      toggleDayDone,
      getNote,
      setNote,
      saveToFile,
      loadFromFile,
      resetAll,
      quizOpen,
      quizMode,
      quizItems,
      quizIndex,
      quizRevealed,
      quizLoading,
      quizError,
      currentQuiz: quizItems[quizIndex] ?? null,
      openQuiz,
      startQuiz,
      closeQuiz,
      setQuizRevealed,
      markWeak,
      nextQuiz,
    }),
    [
      hydrated,
      doc,
      lastSavedAt,
      dirty,
      paths,
      totalDays,
      doneDays,
      weakCount,
      totalQA,
      trackDoneCount,
      isDayDone,
      toggleDayDone,
      getNote,
      setNote,
      saveToFile,
      loadFromFile,
      resetAll,
      quizOpen,
      quizMode,
      quizItems,
      quizIndex,
      quizRevealed,
      quizLoading,
      quizError,
      openQuiz,
      startQuiz,
      closeQuiz,
      markWeak,
      nextQuiz,
    ],
  );

  return (
    <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
  );
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress must be used within ProgressProvider");
  return ctx;
}
