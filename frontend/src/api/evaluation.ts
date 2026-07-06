import api from "./client";

export interface EvaluationResult {
  columns: string[];
  rows: Array<Record<string, unknown>>;
  total: number;
  offset: number;
  limit: number;
}

export interface ArtifactEntry {
  name?: string;
  type: string;
  path: string;
  timestamp?: string;
  available: boolean;
  [key: string]: unknown;
}

export const fetchEvaluation = (
  runId: number,
  limit = 100,
  offset = 0,
) =>
  api
    .get<EvaluationResult>(`/api/runs/${runId}/evaluation`, {
      params: { limit, offset },
    })
    .then((r) => r.data);

export const fetchMetrics = (runId: number) =>
  api
    .get<Record<string, unknown>>(`/api/runs/${runId}/metrics`)
    .then((r) => r.data);

export const fetchArtifacts = (runId: number) =>
  api
    .get<ArtifactEntry[]>(`/api/runs/${runId}/artifacts`)
    .then((r) => r.data);