import api from "./client";

export interface DatasetListItem {
  id: number;
  name: string;
  modality: string;
  row_count: number;
  created_at: string;
}

export interface DatasetDetail extends DatasetListItem {
  description: string | null;
  source_path: string;
  label_column: string | null;
  sample_id_column: string | null;
  columns: string[] | null;
  dtypes: Record<string, string> | null;
  preview_rows: Array<Record<string, unknown>> | null;
  created_at: string;
}

export interface DatasetCreate {
  name: string;
  source_path: string;
  description?: string;
  modality?: string;
  label_column?: string;
  sample_id_column?: string;
}

export const fetchDatasets = () => api.get<DatasetListItem[]>("/api/datasets").then((r) => r.data);

export const fetchDataset = (id: number) =>
  api.get<DatasetDetail>(`/api/datasets/${id}`).then((r) => r.data);

export const createDataset = (payload: DatasetCreate) =>
  api.post<DatasetDetail>("/api/datasets", payload).then((r) => r.data);

export const deleteDataset = (id: number) =>
  api.delete(`/api/datasets/${id}`).then((r) => r.data);
