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

export interface PacketBoundary {
  seq: number;
  ts_ecg: number;
  ts_epoch_us: number;
  sample_offset_start: number;
  sample_count: number;
}

export interface PatchSignalRecord {
  signal_info: PatchSignalInfo;
  samples: (number | null)[];
  sampling_rate_hz: number | null;
  start_sample: number;
  end_sample: number;
  start_packet_seq: number | null;
  end_packet_seq: number | null;
  start_ts_ecg: number | null;
  end_ts_ecg: number | null;
  start_epoch_us: number | null;
  end_epoch_us: number | null;
  duration_us: number | null;
  packet_boundaries: PacketBoundary[];
  continuous: boolean;
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
  startSample: number,
  maxSamples: number,
) =>
  api
    .get<PatchSignalRecord>(`/api/datasets/${datasetId}/patch/signals/${encodeURIComponent(signalName)}`, {
      params: { start_sample: startSample, max_samples: maxSamples },
    })
    .then((r) => r.data);
