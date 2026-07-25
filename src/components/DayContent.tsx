"use client";

import Link from "next/link";
import { getTrackColor } from "@/data/tracks";
import { useManifest, usePart } from "@/hooks/useContent";
import { useProgress } from "@/context/ProgressContext";
import { formatInline } from "@/lib/format";
import CodeBlock from "./CodeBlock";
import ContentStatus from "./ContentStatus";
import FlashcardGrid from "./FlashcardGrid";
import VizBlock from "./VizBlock";

type Props = {
  trackId: string;
  dayN: number;
};

export default function DayContent({ trackId, dayN }: Props) {
  const {
    data: manifest,
    loading: manifestLoading,
    error: manifestError,
  } = useManifest(trackId);
  const { data: day, loading: partLoading, error: partError } = usePart(
    trackId,
    dayN,
  );
  const { isDayDone, toggleDayDone, getNote, setNote, hydrated } = useProgress();

  const loading = !hydrated || manifestLoading || partLoading;
  const error = manifestError || partError;

  if (loading || error || !manifest || !day) {
    return (
      <ContentStatus loading={loading} error={error} label="lesson" />
    );
  }

  const color = getTrackColor(manifest.color);
  const done = isDayDone(trackId, dayN);
  const idx = manifest.parts.findIndex((p) => p.n === dayN);
  const prevDay = idx > 0 ? manifest.parts[idx - 1].n : undefined;
  const nextDay =
    idx >= 0 && idx < manifest.parts.length - 1
      ? manifest.parts[idx + 1].n
      : undefined;

  return (
    <article className="day-page" style={{ ["--tc" as string]: color }}>
      <nav className="crumbs">
        <Link href="/">Paths</Link>
        <span>/</span>
        <Link href={`/paths/${trackId}`}>{manifest.name}</Link>
        <span>/</span>
        <span>Day {day.n}</span>
      </nav>

      <header className="day-page-hero">
        <div className="day-page-hero-row">
          <span className="day-badge">Day {day.n}</span>
          <button
            type="button"
            className={`done-toggle${done ? " on" : ""}`}
            onClick={() => toggleDayDone(trackId, day.n)}
          >
            {done ? "Completed" : "Mark complete"}
          </button>
        </div>
        <h1>{day.title}</h1>
        {day.exp && <p className="lede">{formatInline(day.exp)}</p>}
      </header>

      {(day.pts?.length ?? 0) > 0 && (
        <section className="content-section">
          <h2 className="section-label">Key concepts</h2>
          <ul className="concept-list">
            {day.pts!.map((pt, i) => (
              <li key={i}>{formatInline(pt)}</li>
            ))}
          </ul>
        </section>
      )}

      {day.code && (
        <section className="content-section">
          <h2 className="section-label">Code example</h2>
          <CodeBlock code={day.code} />
        </section>
      )}

      {(day.viz?.length ?? 0) > 0 && (
        <section className="content-section">
          <h2 className="section-label">Visualization</h2>
          <div className="viz-stack">
            {day.viz!.map((v, i) => (
              <VizBlock key={i} viz={v} />
            ))}
          </div>
        </section>
      )}

      {(day.qa?.length ?? 0) > 0 && (
        <section className="content-section">
          <h2 className="section-label">Interview flashcards</h2>
          <FlashcardGrid items={day.qa!} />
        </section>
      )}

      {(day.pr?.length ?? 0) > 0 && (
        <section className="content-section">
          <h2 className="section-label">Practice</h2>
          <div className="chip-row">
            {day.pr!.map((p) => (
              <span className="chip" key={p}>
                {p}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="content-section">
        <h2 className="section-label">My notes</h2>
        <textarea
          className="notes"
          placeholder="Notes auto-save into your progress JSON…"
          value={getNote(trackId, day.n)}
          onChange={(e) => setNote(trackId, day.n, e.target.value)}
        />
      </section>

      <footer className="day-nav">
        {prevDay ? (
          <Link className="btn" href={`/paths/${trackId}/days/${prevDay}`}>
            ← Day {prevDay}
          </Link>
        ) : (
          <span />
        )}
        <Link className="btn btn-ghost" href={`/paths/${trackId}`}>
          All days
        </Link>
        {nextDay ? (
          <Link
            className="btn btn-primary"
            href={`/paths/${trackId}/days/${nextDay}`}
          >
            Day {nextDay} →
          </Link>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              if (!done) toggleDayDone(trackId, day.n);
            }}
          >
            {done ? "Path day complete" : "Mark complete"}
          </button>
        )}
      </footer>
    </article>
  );
}
