"use client";

import { useState } from "react";
import type { QA } from "@/data/types";
import { formatInline } from "@/lib/format";

export default function FlashcardGrid({ items }: { items: QA[] }) {
  return (
    <>
      <div className="flash-grid">
        {items.map((qa, i) => (
          <Flashcard key={`${qa.q}-${i}`} qa={qa} />
        ))}
      </div>
      <p className="flash-hint">Tap a card to reveal the answer</p>
    </>
  );
}

function Flashcard({ qa }: { qa: QA }) {
  const [open, setOpen] = useState(false);

  return (
    <button
      type="button"
      className={`flash-card${open ? " open" : ""}`}
      onClick={() => setOpen((v) => !v)}
      aria-pressed={open}
    >
      {open ? (
        <>
          <div className="flash-kicker a">Answer</div>
          <div className="flash-a">{formatInline(qa.a)}</div>
        </>
      ) : (
        <>
          <div className="flash-kicker q">Question</div>
          <div className="flash-q">{qa.q}</div>
        </>
      )}
    </button>
  );
}
