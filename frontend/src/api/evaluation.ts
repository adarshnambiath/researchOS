import api from "./client";

export interface EvaluationResult {
  columns: string[];
  rows: Array<Record<string, unknown>>;
  total: number;
  offset: number;
  limit: number;
}

export interface EvaluationQueryParams {
  search?: string;
  sort_column?: string;
  sort_direction?: "asc" | "desc";
  filter_column?: string;
  filter_value?: string;
  true_label?: string;
  predicted_label?: string;
  limit?: number;
  offset?: number;
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
  params?: EvaluationQueryParams,
) =>
  api
    .get<EvaluationResult>(`/api/runs/${runId}/evaluation`, {
      params: {
        limit,
        offset,
        ...params,
      },
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