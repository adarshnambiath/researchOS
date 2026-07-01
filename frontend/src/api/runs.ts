import api from "./client";

export interface RunListItem {
  id: number;
  experiment_id: number;
  model_name: string;
  seed: number | null;
  framework: string | null;
  created_at: string;
  has_evaluation: boolean;
}

export interface RunDetail extends RunListItem {
  notes: string | null;
  git_commit: string | null;
  repository_url: string | null;
  entry_point: string | null;
  hyperparameters: Record<string, string> | null;
  framework_version: string | null;
  python_version: string | null;
  sdk_version: string | null;
  execution_device: string | null;
  environment_metadata: Record<string, string> | null;
  output_directory: string | null;
  experiment_name: string;
}

export interface RunCreate {
  experiment_id: number;
  model_name: string;
  notes?: string;
  seed?: number;
  git_commit?: string;
  repository_url?: string;
  entry_point?: string;
  hyperparameters?: Record<string, string>;
  framework?: string;
  framework_version?: string;
  python_version?: string;
  sdk_version?: string;
  execution_device?: string;
  environment_metadata?: Record<string, string>;
}

export const fetchRuns = (experiment_id?: number) =>
  api
    .get<RunListItem[]>("/api/runs", {
      params: experiment_id ? { experiment_id } : undefined,
    })
    .then((r) => r.data);

export const fetchRun = (id: number) =>
  api.get<RunDetail>(`/api/runs/${id}`).then((r) => r.data);

export const createRun = (payload: RunCreate) =>
  api.post<RunDetail>("/api/runs", payload).then((r) => r.data);

export const deleteRun = (id: number) =>
  api.delete(`/api/runs/${id}`).then((r) => r.data);
