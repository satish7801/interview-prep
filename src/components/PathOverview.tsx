"use client";

import Link from "next/link";
import { getTrackColor } from "@/data/tracks";
import { useManifest } from "@/hooks/useContent";
import { useProgress } from "@/context/ProgressContext";
import { formatInline } from "@/lib/format";
import ContentStatus from "./ContentStatus";

export default function PathOverview({ trackId }: { trackId: string }) {
  const { data: track, error, loading } = useManifest(trackId);
  const { isDayDone, hydrated } = useProgress();

  if (!hydrated || loading || error || !track) {
    return (
      <ContentStatus
        loading={!hydrated || loading}
        error={error}
        label="path"
      />
    );
  }

  const color = getTrackColor(track.color);
  const done = track.parts.filter((p) => isDayDone(track.id, p.n)).length;
  const total = track.parts.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="path-page" style={{ ["--tc" as string]: color }}>
      <nav className="crumbs">
        <Link href="/">Paths</Link>
        <span>/</span>
        <span>{track.name}</span>
      </nav>

      <header className="path-hero">
        <h1>{track.name}</h1>
        <p>{track.desc}</p>
        {track.setup && <pre className="path-setup">{track.setup}</pre>}
        <div className="path-hero-meta">
          <div className="path-meter large">
            <span style={{ width: `${pct}%` }} />
          </div>
          <span>
            {done}/{total} complete
          </span>
        </div>
      </header>

      <ol className="day-path">
        {track.parts.map((part, idx) => {
          const finished = isDayDone(track.id, part.n);
          const prevDone =
            idx === 0 || isDayDone(track.id, track.parts[idx - 1].n);
          return (
            <li key={part.id} className={`day-step${finished ? " done" : ""}`}>
              <div className="day-step-rail" aria-hidden>
                <span className={`day-step-node${finished ? " on" : ""}`}>
                  {finished ? "✓" : part.n}
                </span>
              </div>
              <Link
                href={`/paths/${track.id}/days/${part.n}`}
                className="day-step-card"
              >
                <div className="day-step-head">
                  <span className="day-badge">Day {part.n}</span>
                  {!prevDone && idx > 0 && (
                    <span className="day-hint">Continue when ready</span>
                  )}
                  {finished && <span className="day-hint done">Done</span>}
                </div>
                <h2>{part.title}</h2>
                {part.summary && <p>{part.summary}</p>}
                <span className="day-cta">Open lesson →</span>
              </Link>
            </li>
          );
        })}
      </ol>

      {track.tip && (
        <aside className="tip-banner">
          <div className="tip-kicker">Interview tip</div>
          <p className="tip-body">{formatInline(track.tip)}</p>
        </aside>
      )}

      {track.qr && (
        <section className="quick-ref">
          <h3>Quick reference</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  {track.qr.h.map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {track.qr.r.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j}>{formatInline(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
