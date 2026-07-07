import api from "./client";

export interface WaveformDefinitionSummary {
  name: string;
  sampling_rate_hz?: number;
  units?: string | null;
  start_column: string;
  end_column: string;
}

export interface WaveformRecord {
  waveform_name: string;
  record_id: string;
  label?: string | null;
  sampling_rate_hz?: number;
  units?: string | null;
  samples: number[];
}

export const fetchWaveformDefinitions = (datasetId: number) =>
  api
    .get<WaveformDefinitionSummary[]>(`/api/datasets/${datasetId}/waveforms`)
    .then((r) => r.data);

export const fetchWaveformPreview = (datasetId: number, waveformName: string) =>
  api
    .get<WaveformRecord>(`/api/datasets/${datasetId}/waveforms/${encodeURIComponent(waveformName)}/preview`)
    .then((r) => r.data);

export const fetchWaveformRecord = (
  datasetId: number,
  waveformName: string,
  recordId: string,
) =>
  api
    .get<WaveformRecord>(
      `/api/datasets/${datasetId}/waveforms/${encodeURIComponent(waveformName)}/record/${encodeURIComponent(recordId)}`,
    )
    .then((r) => r.data);
