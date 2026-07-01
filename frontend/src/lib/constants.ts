export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const ROUTES = {
  HOME: "/",
  DATASETS: "/datasets",
  DATASET_DETAIL: "/datasets/:id",
  EXPERIMENTS: "/experiments",
  EXPERIMENT_DETAIL: "/experiments/:id",
  RUNS: "/runs",
  RUN_DETAIL: "/runs/:id",
  INVESTIGATION: "/runs/:id/investigate",
} as const;

export const RECOGNIZED_FILES = [
  { filename: "evaluation.parquet", type: "evaluation" },
  { filename: "metrics.json", type: "metrics" },
  { filename: "artifacts.json", type: "artifacts" },
] as const;
