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
import AudioExplainer from "./AudioExplainer";

interface CodeSection {
  title: string;
  code: string;
}

function parseCodeBlocks(codeText: string): CodeSection[] {
  if (!codeText) return [];
  const lines = codeText.split("\n");
  const sections: CodeSection[] = [];
  let currentTitle = "";
  let currentCodeLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const isComment = trimmed.startsWith("--") || trimmed.startsWith("//") || (trimmed.startsWith("#") && !trimmed.startsWith("#!"));
    
    if (isComment && (trimmed.includes(":") || trimmed.toLowerCase().includes("trap") || trimmed.toLowerCase().includes("fix") || trimmed.toLowerCase().includes("basics") || trimmed.toLowerCase().includes("alternative") || trimmed.toLowerCase().includes("vs") || trimmed.toLowerCase().includes("example") || trimmed.toLowerCase().includes("safe") || trimmed.length > 10)) {
      if (currentCodeLines.length > 0 || currentTitle) {
        sections.push({
          title: currentTitle || "Example",
          code: currentCodeLines.join("\n").trim()
        });
        currentCodeLines = [];
      }
      currentTitle = trimmed.replace(/^(--|\/\/|#)\s*/, "").trim();
    } else {
      currentCodeLines.push(line);
    }
  }

  if (currentCodeLines.length > 0 || currentTitle) {
    sections.push({
      title: currentTitle || "Example",
      code: currentCodeLines.join("\n").trim()
    });
  }

  return sections;
}

function findMatchingCodeSection(pt: string, sections: CodeSection[]): CodeSection[] {
  const cleanPt = pt.toLowerCase();
  const backticks = [...pt.matchAll(/`([^`]+)`/g)].map(m => m[1].toLowerCase());
  const boldTerms = [...pt.matchAll(/\*\*([^*]+)\*\*/g)].map(m => m[1].toLowerCase());
  
  return sections.filter(sec => {
    const cleanTitle = sec.title.toLowerCase();
    
    if (backticks.some(bt => cleanTitle.includes(bt) || bt.includes(cleanTitle))) return true;
    if (boldTerms.some(bt => cleanTitle.includes(bt) || bt.includes(cleanTitle))) return true;
    
    const keywords = ["join", "apply", "exists", "isnull", "coalesce", "nullif", "try_convert", "try_cast", "rollup", "cube", "grouping", "string_agg", "having", "group by", "where", "window", "rank", "partition", "cte", "lead", "lag", "index", "statistics", "tempdb", "lock", "transaction", "isolation"];
    
    for (const kw of keywords) {
      if (cleanPt.includes(kw) && cleanTitle.includes(kw)) {
        return true;
      }
    }
    
    const words = cleanTitle.split(/\s+/).filter(w => w.length > 3);
    const matches = words.filter(w => cleanPt.includes(w));
    return matches.length >= 2;
  });
}

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

      <AudioExplainer day={day} trackName={manifest.name} />

      {(day.pts?.length ?? 0) > 0 && (
        <section className="content-section">
          <h2 className="section-label">Key concepts & SQL examples</h2>
          <div className="concept-detail-list">
            {day.pts!.map((pt, i) => {
              const matchedSecs = day.code ? findMatchingCodeSection(pt, parseCodeBlocks(day.code)) : [];
              return (
                <div key={i} className="concept-detail-card">
                  <div className="concept-detail-header">
                    <span className="concept-number">0{i + 1}</span>
                    <p className="concept-text">{formatInline(pt)}</p>
                  </div>
                  {matchedSecs.length > 0 && (
                    <div className="concept-examples">
                      {matchedSecs.map((sec, sidx) => (
                        <div key={sidx} className="concept-example-item">
                          <span className="example-title">💡 Example: {sec.title}</span>
                          <CodeBlock code={sec.code} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {day.code && (
        <section className="content-section">
          <h2 className="section-label">Complete Practice Script</h2>
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

      {day.interviewPlaybook && (
        <section className="content-section interview-playbook-section">
          <h2 className="section-label">Interview Playbook</h2>
          <div className="playbook-box p-4 rounded-lg bg-card border border-border space-y-4">
            <div>
              <h3 className="font-semibold text-primary mb-1">🎙️ 30-Second Opening Script</h3>
              <p className="text-sm text-foreground/90 italic">&ldquo;{day.interviewPlaybook.openingScript}&rdquo;</p>
            </div>
            <div>
              <h3 className="font-semibold text-primary mb-1">🔥 Real Production Incident (STAR Story)</h3>
              <p className="text-sm text-foreground/90">{formatInline(day.interviewPlaybook.incidentStory)}</p>
            </div>
            {(day.interviewPlaybook.whiteboardSteps?.length ?? 0) > 0 && (
              <div>
                <h3 className="font-semibold text-primary mb-1">📐 Whiteboard Execution Flow</h3>
                <ol className="list-decimal list-inside text-sm space-y-1 text-foreground/90">
                  {day.interviewPlaybook.whiteboardSteps.map((step, idx) => (
                    <li key={idx}>{formatInline(step)}</li>
                  ))}
                </ol>
              </div>
            )}
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
            onClick={() => {
              if (!done) toggleDayDone(trackId, day.n);
            }}
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
