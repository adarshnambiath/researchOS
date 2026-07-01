import api from "./client";

export interface QueryFilters {
  preset?: string;
  ground_truth?: string;
  prediction?: string;
  confidence_min?: number;
  confidence_max?: number;
  sample_id?: string | number;
  limit?: number;
  offset?: number;
}

export interface QueryResult {
  rows: Array<Record<string, any>>;
  total: number;
  offset: number;
  limit: number;
  columns: string[];
}

export interface Insights {
  accuracy: number | null;
  total_rows: number;
  correct_count: number;
  incorrect_count: number;
  false_positive_count: number;
  false_negative_count: number;
  prediction_distribution: Record<string, number>;
  ground_truth_distribution: Record<string, number>;
  top_confusion_pairs: Array<Record<string, any>>;
}

export interface RowDetail {
  evaluation_row: Record<string, any>;
  dataset_row: Record<string, any> | null;
}

export interface QueryFiltersPayload extends Omit<QueryFilters, "limit" | "offset"> {
  limit?: number;
  offset?: number;
}

export const queryEvaluation = (runId: number, filters: QueryFiltersPayload) =>
  api.post<QueryResult>(`/api/runs/${runId}/investigation/query`, filters).then((r) => r.data);

export const getRowDetail = (runId: number, index: number) =>
  api.post<RowDetail>(`/api/runs/${runId}/investigation/row/${index}`).then((r) => r.data);

export const computeInsights = (runId: number) =>
  api.post<Insights>(`/api/runs/${runId}/investigation/insights`).then((r) => r.data);
