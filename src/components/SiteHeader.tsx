"use client";

import Link from "next/link";
import { useRef } from "react";
import { useProgress } from "@/context/ProgressContext";

export default function SiteHeader() {
  const {
    doneDays,
    totalDays,
    dirty,
    lastSavedAt,
    saveToFile,
    loadFromFile,
    resetAll,
    openQuiz,
  } = useProgress();
  const fileRef = useRef<HTMLInputElement>(null);
  const pct = totalDays ? Math.round((doneDays / totalDays) * 100) : 0;

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="brand-link">
          <span className="brand-name">
            Prep<span>Studio</span>
          </span>
          <span className="brand-tag">Interview paths</span>
        </Link>

        <div className="header-progress">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="progress-count">
            {doneDays}/{totalDays}
          </span>
          <span className={`save-status${dirty ? " dirty" : ""}`}>
            {dirty
              ? "Saving…"
              : lastSavedAt
                ? `Saved ${new Date(lastSavedAt).toLocaleTimeString()}`
                : "—"}
          </span>
        </div>

        <div className="header-actions">
          <button type="button" className="btn btn-primary" onClick={openQuiz}>
            Quiz
          </button>
          <button type="button" className="btn" onClick={saveToFile}>
            Save JSON
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => fileRef.current?.click()}
          >
            Load JSON
          </button>
          <button type="button" className="btn btn-ghost" onClick={resetAll}>
            Reset
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              void loadFromFile(file)
                .then(() => alert("Progress loaded from JSON."))
                .catch(() =>
                  alert("Could not read that JSON file. Use a PrepStudio export."),
                );
              e.target.value = "";
            }}
          />
        </div>
      </div>
    </header>
  );
}
