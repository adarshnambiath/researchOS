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
  channel_names?: string[] | null;
  channel_units?: string[] | null;
  all_channels?: number[][] | null;
  total_samples?: number | null;
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
  startSample?: number,
  numSamples?: number,
) => {
  let url = `/api/datasets/${datasetId}/waveforms/${encodeURIComponent(waveformName)}/record/${encodeURIComponent(recordId)}`;
  const params = new URLSearchParams();
  if (startSample !== undefined && startSample > 0) params.set("start_sample", String(startSample));
  if (numSamples !== undefined) params.set("num_samples", String(numSamples));
  const qs = params.toString();
  if (qs) url += `?${qs}`;
  return api.get<WaveformRecord>(url).then((r) => r.data);
};
