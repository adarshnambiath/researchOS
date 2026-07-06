import api from "./client";

export interface OutputListItem {
  id: number;
  run_id: number;
  type: string;
  filename: string;
  file_size: number;
  uploaded_at: string;
}

export interface OutputRegister {
  filename: string;
  type: string;
  file_size: number;
}

export interface OutputDetection {
  filename: string;
  type: string;
  found: boolean;
  file_size: number;
}

export const fetchOutputs = (runId: number) =>
  api.get<OutputDetection[]>(`/api/runs/${runId}/outputs`).then((r) => r.data);

export const syncOutputs = (runId: number) =>
  api.post<OutputRegister[]>(`/api/runs/${runId}/outputs/sync`).then((r) => r.data);

export const deleteOutput = (outputId: number) =>
  api.delete(`/api/outputs/${outputId}`).then((r) => r.data);
