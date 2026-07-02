import api from "./client";

export interface ExperimentListItem {
  id: number;
  dataset_id: number;
  name: string;
  task: string;
  created_at: string;
  run_count: number;
}

export interface ExperimentDetail extends ExperimentListItem {
  description: string | null;
  objective: string | null;
  dataset_name: string;
  run_count: number;
}

export interface ExperimentCreate {
  dataset_id: number;
  name: string;
  description?: string;
  objective?: string;
  task?: string;
}

export const fetchExperiments = (dataset_id?: number) =>
  api
    .get<ExperimentListItem[]>("/api/experiments", {
      params: dataset_id ? { dataset_id } : undefined,
    })
    .then((r) => r.data);

export const fetchExperiment = (id: number) =>
  api.get<ExperimentDetail>(`/api/experiments/${id}`).then((r) => r.data);

export const createExperiment = (payload: ExperimentCreate) =>
  api.post<ExperimentDetail>("/api/experiments", payload).then((r) => r.data);

export const deleteExperiment = (id: number) =>
  api.delete(`/api/experiments/${id}`).then((r) => r.data);

export const updateExperiment = (id: number, payload: { name?: string; description?: string; objective?: string; task?: string }) =>
  api.put<ExperimentDetail>(`/api/experiments/${id}`, payload).then((r) => r.data);
