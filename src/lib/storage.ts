import type { PrepExport } from "@/data/types";

export const PROGRESS_STORAGE_KEY = "prepstudio-progress-v2";
const LEGACY = {
  prog: "prep-prog",
  notes: "prep-notes",
  weak: "prep-weak",
} as const;

export type ProgressDocument = {
  version: 2;
  updatedAt: string;
  progress: Record<string, boolean>;
  notes: Record<string, string>;
  weak: Record<string, boolean>;
};

export function emptyProgressDoc(): ProgressDocument {
  return {
    version: 2,
    updatedAt: new Date().toISOString(),
    progress: {},
    notes: {},
    weak: {},
  };
}

function readRaw(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // quota / private mode
  }
}

function parseLegacy(): ProgressDocument | null {
  const prog = readRaw(LEGACY.prog);
  const notes = readRaw(LEGACY.notes);
  const weak = readRaw(LEGACY.weak);
  if (!prog && !notes && !weak) return null;
  try {
    return {
      version: 2,
      updatedAt: new Date().toISOString(),
      progress: prog ? (JSON.parse(prog) as Record<string, boolean>) : {},
      notes: notes ? (JSON.parse(notes) as Record<string, string>) : {},
      weak: weak ? (JSON.parse(weak) as Record<string, boolean>) : {},
    };
  } catch {
    return null;
  }
}

export function loadProgressDocument(): ProgressDocument {
  const raw = readRaw(PROGRESS_STORAGE_KEY);
  if (raw) {
    try {
      const data = JSON.parse(raw) as Partial<ProgressDocument>;
      return {
        version: 2,
        updatedAt: data.updatedAt ?? new Date().toISOString(),
        progress: data.progress ?? {},
        notes: data.notes ?? {},
        weak: data.weak ?? {},
      };
    } catch {
      // fall through to legacy
    }
  }
  const legacy = parseLegacy();
  if (legacy) {
    persistProgressDocument(legacy);
    return legacy;
  }
  return emptyProgressDoc();
}

export function persistProgressDocument(doc: ProgressDocument) {
  const next: ProgressDocument = {
    ...doc,
    version: 2,
    updatedAt: new Date().toISOString(),
  };
  writeRaw(PROGRESS_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function clearProgressDocument() {
  persistProgressDocument(emptyProgressDoc());
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(LEGACY.prog);
      localStorage.removeItem(LEGACY.notes);
      localStorage.removeItem(LEGACY.weak);
    } catch {
      // ignore
    }
  }
}

export function downloadProgressJson(doc: ProgressDocument) {
  const payload: PrepExport & { version: 2; updatedAt: string } = {
    version: 2,
    updatedAt: doc.updatedAt,
    exportedAt: new Date().toISOString(),
    progress: doc.progress,
    notes: doc.notes,
    weak: doc.weak,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `prepstudio-progress-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseProgressJson(text: string): ProgressDocument {
  const data = JSON.parse(text) as Partial<ProgressDocument> & PrepExport;
  if (!data || typeof data !== "object") {
    throw new Error("Invalid progress JSON");
  }
  return {
    version: 2,
    updatedAt: data.updatedAt ?? data.exportedAt ?? new Date().toISOString(),
    progress: data.progress ?? {},
    notes: data.notes ?? {},
    weak: data.weak ?? {},
  };
}
