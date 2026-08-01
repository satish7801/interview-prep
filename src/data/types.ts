export type QA = {
  q: string;
  a: string;
};

export type Viz =
  | { t: "table"; h: string[]; r: string[][] }
  | { t: "none"; note?: string }
  | {
      t: string;
      items?: string[];
      steps?: string[];
      cap?: string;
      note?: string;
      h?: string[];
      r?: string[][];
      [key: string]: unknown;
    };

export type PathSummary = {
  id: string;
  name: string;
  color: string;
  sub: string;
  desc: string;
  dayCount: number;
  qaCount?: number;
  featured?: boolean;
};

export type Catalog = {
  paths: PathSummary[];
};

export type PartSummary = {
  id: string;
  n: number;
  title: string;
  summary?: string;
};

export type QuickRef = {
  h: string[];
  r: string[][];
};

export type PathManifest = {
  id: string;
  name: string;
  color: string;
  sub: string;
  desc: string;
  tip?: string;
  setup?: string;
  qr?: QuickRef | null;
  parts: PartSummary[];
};

export type InterviewPlaybook = {
  openingScript: string;
  incidentStory: string;
  whiteboardSteps: string[];
};

export type PartContent = {
  id: string;
  n: number;
  title: string;
  exp?: string;
  pts?: string[];
  code?: string;
  pr?: string[];
  viz?: Viz[];
  qa?: QA[];
  interviewPlaybook?: InterviewPlaybook | null;
};

export type QuizFileItem = {
  dayN: number;
  qi: number;
  q: string;
  a: string;
};

export type QuizFile = {
  trackId: string;
  items: QuizFileItem[];
};

/** @deprecated legacy shape — prefer PartContent / PathManifest */
export type Day = PartContent;

/** @deprecated legacy shape — prefer PathManifest */
export type Track = PathManifest & { days?: PartContent[] };

export type PrepExport = {
  exportedAt: string;
  progress: Record<string, boolean>;
  notes: Record<string, string>;
  weak: Record<string, boolean>;
  version?: number;
  updatedAt?: string;
};

export type QuizMode = "all" | "weak" | string;

export type QuizItem = {
  trackId: string;
  dayN: number;
  qi: number;
  q: string;
  a: string;
};
