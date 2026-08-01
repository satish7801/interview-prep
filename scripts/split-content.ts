import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { Catalog, PartContent, PathManifest, QuizFileItem } from "../src/data/types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const dataDir = path.join(root, "src", "data");
const archiveDir = path.join(dataDir, "_archive");
const outRoot = path.join(root, "public", "content");

interface TrackSourceData {
  id: string;
  name: string;
  color: string;
  sub: string;
  desc: string;
  tip?: string;
  setup?: string;
  qr?: { h: string[]; r: string[][] } | null;
  days?: PartContent[];
}

function padDay(n: number): string {
  return String(n).padStart(2, "0");
}

function resolveSource(name: string): string | null {
  const primary = path.join(dataDir, name);
  const archived = path.join(archiveDir, name);
  if (fs.existsSync(primary)) return primary;
  if (fs.existsSync(archived)) return archived;
  return null;
}

function loadTracks(): TrackSourceData[] {
  const basePath = resolveSource("tracks.json");
  if (!basePath) throw new Error("tracks.json not found in src/data or _archive");
  return JSON.parse(fs.readFileSync(basePath, "utf8")) as TrackSourceData[];
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(filePath: string, data: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

const tracks = loadTracks();
ensureDir(outRoot);

const catalog: Catalog = {
  paths: tracks.map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
    sub: t.sub,
    desc: t.desc,
    dayCount: t.days?.length ?? 0,
    qaCount: (t.days ?? []).reduce((n, d) => n + (d.qa?.length ?? 0), 0),
    featured: t.id === "dotnet",
  })),
};

writeJson(path.join(outRoot, "catalog.json"), catalog);

let partCount = 0;
let qaCount = 0;

for (const track of tracks) {
  const trackDir = path.join(outRoot, track.id);
  const partsDir = path.join(trackDir, "parts");
  ensureDir(partsDir);

  const parts: PathManifest["parts"] = [];
  const quizItems: QuizFileItem[] = [];

  for (const day of track.days ?? []) {
    const id = `day-${padDay(day.n)}`;
    const summary =
      typeof day.exp === "string"
        ? day.exp.slice(0, 160) + (day.exp.length > 160 ? "…" : "")
        : "";

    parts.push({
      id,
      n: day.n,
      title: day.title,
      summary,
    });

    const part: PartContent = {
      id,
      n: day.n,
      title: day.title,
      exp: day.exp ?? "",
      pts: day.pts ?? [],
      code: day.code ?? "",
      pr: day.pr ?? [],
      viz: day.viz ?? [],
      qa: day.qa ?? [],
      interviewPlaybook: day.interviewPlaybook ?? null,
    };
    writeJson(path.join(partsDir, `${id}.json`), part);
    partCount++;

    (day.qa ?? []).forEach((qa, qi) => {
      quizItems.push({
        dayN: day.n,
        qi,
        q: qa.q,
        a: qa.a,
      });
      qaCount++;
    });
  }

  const manifest: PathManifest = {
    id: track.id,
    name: track.name,
    color: track.color,
    sub: track.sub,
    desc: track.desc,
    tip: track.tip ?? "",
    setup: track.setup ?? "",
    qr: track.qr ?? null,
    parts,
  };

  writeJson(path.join(trackDir, "manifest.json"), manifest);

  writeJson(path.join(trackDir, "quiz.json"), {
    trackId: track.id,
    items: quizItems,
  });
}

console.log(`Wrote catalog with ${catalog.paths.length} paths`);
console.log(`Wrote ${partCount} parts, ${qaCount} quiz items → ${outRoot}`);
