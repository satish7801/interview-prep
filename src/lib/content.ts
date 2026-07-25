import type {
  Catalog,
  PathManifest,
  PartContent,
  QuizFile,
} from "@/data/types";

const cache = new Map<string, unknown>();

function padDay(n: number): string {
  return String(n).padStart(2, "0");
}

async function fetchJson<T>(url: string): Promise<T> {
  if (cache.has(url)) return cache.get(url) as T;
  const res = await fetch(url, { cache: "force-cache" });
  if (!res.ok) {
    throw new Error(`Failed to load ${url} (${res.status})`);
  }
  const data = (await res.json()) as T;
  cache.set(url, data);
  return data;
}

export function clearContentCache() {
  cache.clear();
}

export function getCatalog(): Promise<Catalog> {
  return fetchJson<Catalog>("/content/catalog.json");
}

export function getManifest(trackId: string): Promise<PathManifest> {
  return fetchJson<PathManifest>(`/content/${trackId}/manifest.json`);
}

export function getPart(trackId: string, dayN: number): Promise<PartContent> {
  return fetchJson<PartContent>(
    `/content/${trackId}/parts/day-${padDay(dayN)}.json`,
  );
}

export function getQuiz(trackId: string): Promise<QuizFile> {
  return fetchJson<QuizFile>(`/content/${trackId}/quiz.json`);
}

export async function getAllQuizItems(
  trackIds: string[],
): Promise<Array<QuizFile["items"][number] & { trackId: string }>> {
  const files = await Promise.all(trackIds.map((id) => getQuiz(id)));
  return files.flatMap((f) =>
    f.items.map((item) => ({ ...item, trackId: f.trackId })),
  );
}

export { padDay };
