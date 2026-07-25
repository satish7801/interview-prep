import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dataDir = path.join(root, "src", "data");
const archiveDir = path.join(dataDir, "_archive");
const outRoot = path.join(root, "public", "content");

function padDay(n) {
  return String(n).padStart(2, "0");
}

function resolveSource(name) {
  const primary = path.join(dataDir, name);
  const archived = path.join(archiveDir, name);
  if (fs.existsSync(primary)) return primary;
  if (fs.existsSync(archived)) return archived;
  return null;
}

function loadTracks() {
  const basePath = resolveSource("tracks.json");
  if (!basePath) throw new Error("tracks.json not found in src/data or _archive");
  const base = JSON.parse(fs.readFileSync(basePath, "utf8"));
  const fourYoePath = resolveSource("dotnet-4yoe-track.json");
  const tracks = [];
  if (fourYoePath) {
    tracks.push(JSON.parse(fs.readFileSync(fourYoePath, "utf8")));
  }
  for (const t of base) {
    if (!tracks.some((x) => x.id === t.id)) tracks.push(t);
  }
  return tracks;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

const tracks = loadTracks();
ensureDir(outRoot);

const catalog = {
  paths: tracks.map((t, i) => ({
    id: t.id,
    name: t.name,
    color: t.color,
    sub: t.sub,
    desc: t.desc,
    dayCount: t.days?.length ?? 0,
    qaCount: (t.days ?? []).reduce((n, d) => n + (d.qa?.length ?? 0), 0),
    featured: t.id === "dotnet4yoe" || i === 0,
  })),
};

writeJson(path.join(outRoot, "catalog.json"), catalog);

let partCount = 0;
let qaCount = 0;

for (const track of tracks) {
  const trackDir = path.join(outRoot, track.id);
  const partsDir = path.join(trackDir, "parts");
  ensureDir(partsDir);

  const parts = [];
  const quizItems = [];

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

    const part = {
      id,
      n: day.n,
      title: day.title,
      exp: day.exp ?? "",
      pts: day.pts ?? [],
      code: day.code ?? "",
      pr: day.pr ?? [],
      viz: day.viz ?? [],
      qa: day.qa ?? [],
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

  writeJson(path.join(trackDir, "manifest.json"), {
    id: track.id,
    name: track.name,
    color: track.color,
    sub: track.sub,
    desc: track.desc,
    tip: track.tip ?? "",
    setup: track.setup ?? "",
    qr: track.qr ?? null,
    parts,
  });

  writeJson(path.join(trackDir, "quiz.json"), {
    trackId: track.id,
    items: quizItems,
  });
}

console.log(`Wrote catalog with ${catalog.paths.length} paths`);
console.log(`Wrote ${partCount} parts, ${qaCount} quiz items → ${outRoot}`);
