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
  patch_metadata: {
    patch_id: string;
    firmware_version: number | null;
    sensor_library_version: string | null;
    product_number: string | null;
    serial_number: string | null;
    patch_lifetime: number | null;
    start_time: number | null;
    capabilities: {
      ecg_supported_channels: number | null;
      ecg_ch_sps: number[] | null;
      respiration_config: number | null;
      max_patch_life: number | null;
      accel_info: number[] | null;
      temp_supported: number[] | null;
      spo2_config: number[] | null;
      spo2_sps: number | null;
      max_latency: number[] | null;
      total_avail_sequence: number | null;
      start_time: number | null;
      dest_ip: string | null;
      broadcast_interval: number | null;
      feature_config: number | null;
      accel_z_config: number | null;
    } | null;
    files: Array<{ filename: string; relative_path: string; purpose: string }>;
    signals: Array<{
      display_name: string;
      source_file: string;
      source_field: string;
      units: string | null;
      scale_factor: number | null;
      enabled: boolean;
    }>;
    analysis_streams: Array<{
      name: string;
      source_file: string;
      sequence_field: string;
      timestamp_field: string | null;
      description: string | null;
    }>;
    calibration: {
      ecg_conv_lo_1mv: number[] | null;
      ecg_conv_hi_1mv: number[] | null;
      resp_1_ohm: number[] | null;
      temp_calib: number[] | null;
      accel_calib: number[] | null;
      spo2_calib: number[] | null;
      ia_gain_lo: number[] | null;
      ia_gain_hi: number[] | null;
      skin_temp_calib_ext_range: number[] | null;
      ecg_code_permv: number | null;
      resp_code_perohm: number | null;
    } | null;
    scaling_definitions: Array<{
      signal_name: string;
      numerator: number;
      denominator: number;
      engineering_unit: string;
    }>;
    relationships: Array<{
      source_file: string;
      target_file: string;
      description: string;
    }>;
  } | null;
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
