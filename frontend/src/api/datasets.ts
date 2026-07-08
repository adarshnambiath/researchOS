import api from "./client";

export interface DatasetListItem {
  id: number;
  name: string;
  modality: string;
  row_count: number;
  created_at: string;
}

export interface WaveformDefinitionShape {
  name: string;
  start_column: string;
  end_column: string;
  sampling_rate?: number;
  units?: string | null;
}

export interface WFDBRecordMetadataShape {
  record_name: string;
  sampling_rate?: number | null;
  channel_names?: string[] | null;
  signal_units?: string[] | null;
  number_of_channels?: number | null;
}

export interface WFDBDatasetMetadataShape {
  number_of_records: number;
  records: WFDBRecordMetadataShape[];
  sampling_rate?: number | null;
  channel_names?: string[] | null;
  signal_units?: string[] | null;
  number_of_channels?: number | null;
}

export interface DatasetDetail extends DatasetListItem {
  description: string | null;
  source_path: string;
  label_column: string | null;
  sample_id_column: string | null;
  dataset_schema: Array<{
    name: string;
    type: string;
    nullable: boolean;
    missing_count?: number;
    unique_count?: number;
    minimum?: number | string;
    maximum?: number | string;
    mean?: number;
    categories?: string[];
    units?: string;
  }> | null;
  waveform_definitions: WaveformDefinitionShape[] | null;
  wfdb_metadata: WFDBDatasetMetadataShape | null;
  created_at: string;
}

export interface DatasetPreview {
  columns: string[];
  rows: Array<Record<string, unknown>>;
}

export interface DatasetCreate {
  name: string;
  source_path: string;
  description?: string;
  modality?: string;
  label_column?: string;
  sample_id_column?: string;
  waveform_definitions?: WaveformDefinitionShape[] | null;
}

export interface DatasetUpdate {
  name?: string;
  description?: string;
  modality?: string;
  label_column?: string;
  sample_id_column?: string;
}

export const fetchDatasets = () =>
  api.get<DatasetListItem[]>("/api/datasets").then((r) => r.data);

export const fetchDataset = (id: number) =>
  api.get<DatasetDetail>(`/api/datasets/${id}`).then((r) => r.data);

export const fetchDatasetPreview = (id: number) =>
  api.get<DatasetPreview>(`/api/datasets/${id}/preview`).then((r) => r.data);

export const createDataset = (payload: DatasetCreate) =>
  api.post<DatasetDetail>("/api/datasets", payload).then((r) => r.data);

export const updateDataset = (id: number, payload: DatasetUpdate) =>
  api.put<DatasetDetail>(`/api/datasets/${id}`, payload).then((r) => r.data);

export const deleteDataset = (id: number) =>
  api.delete(`/api/datasets/${id}`).then((r) => r.data);
