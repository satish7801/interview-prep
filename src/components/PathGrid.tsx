"use client";

import Link from "next/link";
import { getTrackColor } from "@/data/tracks";
import { useCatalog } from "@/hooks/useContent";
import { useProgress } from "@/context/ProgressContext";
import ContentStatus from "./ContentStatus";

export default function PathGrid() {
  const { data, error, loading } = useCatalog();
  const { trackDoneCount, hydrated } = useProgress();

  if (!hydrated || loading || error || !data) {
    return (
      <ContentStatus
        loading={!hydrated || loading}
        error={error}
        label="paths"
      />
    );
  }

  return (
    <div className="home-page">
      <section className="home-hero">
        <p className="eyebrow">Choose a path</p>
        <h1>Your interview prep paths</h1>
        <p className="lede">
          Content and Q&amp;A load from JSON per part — only what you open is
          fetched. Progress still saves as JSON on this device.
        </p>
      </section>

      <div className="path-grid">
        {data.paths.map((track) => {
          const done = trackDoneCount(track.id, track.dayCount);
          const total = track.dayCount;
          const pct = total ? Math.round((done / total) * 100) : 0;
          const color = getTrackColor(track.color);

          return (
            <Link
              key={track.id}
              href={`/paths/${track.id}`}
              className={`path-card${track.featured ? " featured" : ""}`}
              style={{ ["--tc" as string]: color }}
            >
              <div className="path-card-top">
                <span className="path-dot" />
                <span className="path-name">{track.name}</span>
                {track.featured && (
                  <span className="path-pill">Recommended</span>
                )}
              </div>
              <p className="path-sub">{track.sub}</p>
              <p className="path-desc">{track.desc}</p>
              <div className="path-footer">
                <div className="path-meter">
                  <span style={{ width: `${pct}%` }} />
                </div>
                <span className="path-meta">
                  {done}/{total} days · {pct}%
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
