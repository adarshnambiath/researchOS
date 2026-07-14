import api from "./client";

export interface PatchRecordInfo {
  total_packets: number | null;
  total_samples: number | null;
  packets_in_window: number | null;
}

export interface PatchSignalInfo {
  signal_name: string;
  units: string | null;
  scale_factor: number | null;
  source_field: string;
  enabled: boolean;
}

export interface PatchSignalRecord {
  signal_info: PatchSignalInfo;
  samples: number[];
  start_index: number;
  end_index: number;
  record_info: PatchRecordInfo | null;
}

export const fetchPatchSignals = (datasetId: number) =>
  api.get<PatchSignalInfo[]>(`/api/datasets/${datasetId}/patch/signals`).then((r) => r.data);

export const fetchPatchSignalPreview = (datasetId: number, signalName: string) =>
  api
    .get<PatchSignalRecord>(`/api/datasets/${datasetId}/patch/signals/${encodeURIComponent(signalName)}/preview`)
    .then((r) => r.data);

export const fetchPatchSignalWindow = (
  datasetId: number,
  signalName: string,
  start: number,
  count: number,
) =>
  api
    .get<PatchSignalRecord>(`/api/datasets/${datasetId}/patch/signals/${encodeURIComponent(signalName)}`, {
      params: { start, count },
    })
    .then((r) => r.data);
