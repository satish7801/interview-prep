"use client";

import type { Viz } from "@/data/types";
import { formatInline } from "@/lib/format";

export default function VizBlock({ viz }: { viz: Viz }) {
  if (viz.t === "none") {
    const note = typeof viz.note === "string" ? viz.note : "";
    return <p className="viz-note">{note}</p>;
  }

  if (viz.t === "table" && Array.isArray(viz.h) && Array.isArray(viz.r)) {
    return (
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {viz.h.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {viz.r.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j}>{formatInline(String(cell))}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const label =
    typeof viz.t === "string"
      ? viz.t.replace(/([a-z])([A-Z])/g, "$1 $2")
      : "diagram";

  return (
    <p className="viz-fallback">
      Diagram: <strong>{label}</strong> — key ideas are covered in the concepts
      and code above.
    </p>
  );
}
