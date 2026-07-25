"use client";

import { useEffect, useState } from "react";
import type {
  Catalog,
  PathManifest,
  PartContent,
  QuizFile,
} from "@/data/types";
import {
  getCatalog,
  getManifest,
  getPart,
  getQuiz,
} from "@/lib/content";

type LoadState<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
};

function useAsync<T>(loader: () => Promise<T>, deps: unknown[]): LoadState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    loader()
      .then((result) => {
        if (!alive) return;
        setData(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "Failed to load content");
        setData(null);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading };
}

export function useCatalog() {
  return useAsync<Catalog>(() => getCatalog(), []);
}

export function useManifest(trackId: string) {
  return useAsync<PathManifest>(() => getManifest(trackId), [trackId]);
}

export function usePart(trackId: string, dayN: number) {
  return useAsync<PartContent>(() => getPart(trackId, dayN), [trackId, dayN]);
}

export function useQuizFile(trackId: string | null) {
  return useAsync<QuizFile | null>(
    () => (trackId ? getQuiz(trackId) : Promise.resolve(null)),
    [trackId],
  );
}
