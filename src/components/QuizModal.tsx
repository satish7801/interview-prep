"use client";

import { useEffect } from "react";
import type { PathSummary, QuizItem, QuizMode } from "@/data/types";
import { formatInline } from "@/lib/format";

type Props = {
  open: boolean;
  mode: QuizMode | null;
  items: QuizItem[];
  index: number;
  revealed: boolean;
  weakCount: number;
  totalQA: number;
  paths: PathSummary[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onStart: (mode: QuizMode) => void;
  onReveal: () => void;
  onGotIt: () => void;
  onStillLearning: () => void;
  onNext: () => void;
};

export default function QuizModal({
  open,
  mode,
  items,
  index,
  revealed,
  weakCount,
  totalQA,
  paths,
  loading,
  error,
  onClose,
  onStart,
  onReveal,
  onGotIt,
  onStillLearning,
  onNext,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const current = items[index] ?? null;
  const done = mode !== null && !loading && !error && index >= items.length;
  const pct = items.length ? Math.min(100, (index / items.length) * 100) : 0;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label="Quiz">
        {mode === null && (
          <>
            <p className="modal-kicker">Choose a quiz set</p>
            <p className="quiz-note">
              Questions load from JSON only when you start a set.
            </p>
            <div className="quiz-picker">
              <button
                type="button"
                className="quiz-pick"
                onClick={() => onStart("weak")}
              >
                <span>
                  Weak spots
                  <span className="quiz-badge">review</span>
                </span>
                <span className="quiz-pick-count">{weakCount} marked</span>
              </button>
              <button
                type="button"
                className="quiz-pick"
                onClick={() => onStart("all")}
              >
                <span>All tracks (mixed)</span>
                <span className="quiz-pick-count">{totalQA} questions</span>
              </button>
              {paths.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="quiz-pick"
                  onClick={() => onStart(t.id)}
                >
                  <span>{t.name}</span>
                  <span className="quiz-pick-count">
                    {t.qaCount ?? 0} questions
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-ghost modal-cancel"
              onClick={onClose}
            >
              Cancel
            </button>
          </>
        )}

        {mode !== null && loading && (
          <>
            <p className="modal-kicker">Loading quiz JSON…</p>
            <div className="page-loading">Fetching questions…</div>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
          </>
        )}

        {mode !== null && error && (
          <>
            <p className="modal-kicker">Could not load quiz</p>
            <p className="quiz-answer">{error}</p>
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Close
            </button>
          </>
        )}

        {mode !== null && !loading && !error && !done && current && (
          <>
            <p className="modal-kicker">
              Question {index + 1} of {items.length}
            </p>
            <div className="quiz-progress">
              <span style={{ width: `${pct}%` }} />
            </div>
            <h2 className="quiz-question">{current.q}</h2>
            {revealed && (
              <div className="quiz-answer">{formatInline(current.a)}</div>
            )}
            <div className="quiz-actions">
              {!revealed ? (
                <button type="button" className="btn" onClick={onReveal}>
                  Reveal answer
                </button>
              ) : (
                <>
                  <button type="button" className="btn btn-ok" onClick={onGotIt}>
                    Got it
                  </button>
                  <button
                    type="button"
                    className="btn btn-weak"
                    onClick={onStillLearning}
                  >
                    Still learning
                  </button>
                  <button type="button" className="btn" onClick={onNext}>
                    Next
                  </button>
                </>
              )}
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        )}

        {mode !== null && !loading && !error && done && (
          <>
            <p className="modal-kicker">Session complete</p>
            <h2 className="quiz-question">
              {items.length
                ? `You reviewed ${items.length} question${items.length === 1 ? "" : "s"}.`
                : mode === "weak"
                  ? "No weak spots marked yet. Quiz a track and tap Still learning to build this list."
                  : "No questions found in JSON for this set."}
            </h2>
            <div className="quiz-actions">
              <button type="button" className="btn btn-primary" onClick={onClose}>
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
