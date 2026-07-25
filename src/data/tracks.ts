export const TRACK_COLOR: Record<string, string> = {
  "--sql": "#f0a843",
  "--dotnet": "#a78bfa",
  "--ng": "#f06070",
  "--sr": "#3db9a8",
  "--py": "#3d9eff",
  "--spark": "#e8824a",
  "--cloud": "#2ec4b6",
  "--infra": "#9b59f5",
  "--domain": "#e84393",
  "--azure": "#0078d4",
  "--gcp": "#4285f4",
};

export function getTrackColor(colorVar: string): string {
  return TRACK_COLOR[colorVar] ?? "#3db9a8";
}

export function dayKey(trackId: string, dayN: number): string {
  return `${trackId}-${dayN}`;
}

export function qaKey(trackId: string, dayN: number, qi: number): string {
  return `${trackId}-${dayN}-${qi}`;
}
