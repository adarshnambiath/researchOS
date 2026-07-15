"""
Patch modality schemas — dedicated metadata models for wearable biosensor
patch datasets (broadcast.json, spout.json, spout_mnb.json, etc.).

These models live alongside the existing dataset schemas and follow the
same patterns as WaveformDefinition / WFDBDatasetMetadata.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel


# ─── Signal Definitions ─────────────────────────────────────────────


class PatchSignalDefinition(BaseModel):
    """Defines a single physiological signal contained in a patch dataset.

    Examples: ECG Channel A, Respiration, Heart Rate, Accelerometer X, …
    """

    display_name: str
    source_file: str
    source_field: str
    units: str | None = None
    scale_factor: float | None = None
    enabled: bool = True


# ─── Analysis Definitions ───────────────────────────────────────────


class PatchAnalysisDefinition(BaseModel):
    """Describes an embedded analysis stream (e.g. Mindberger rhythm analysis)."""

    name: str
    source_file: str
    sequence_field: str
    timestamp_field: str | None = None
    description: str | None = None


# ─── Calibration ────────────────────────────────────────────────────


class PatchCalibration(BaseModel):
    """Calibration parameters extracted from broadcast.json SensorCalibration."""

    ecg_conv_lo_1mv: list[int] | None = None
    ecg_conv_hi_1mv: list[int] | None = None
    resp_1_ohm: list[int] | None = None
    temp_calib: list[int] | None = None
    accel_calib: list[int] | None = None
    spo2_calib: list[int] | None = None
    ia_gain_lo: list[int] | None = None
    ia_gain_hi: list[int] | None = None
    skin_temp_calib_ext_range: list[int] | None = None
    ecg_code_permv: int | None = None
    resp_code_perohm: int | None = None


# ─── Capability ─────────────────────────────────────────────────────


class PatchCapability(BaseModel):
    """Capabilities extracted from broadcast.json Capability block."""

    ecg_supported_channels: int | None = None
    ecg_ch_sps: list[int] | None = None
    respiration_config: int | None = None
    max_patch_life: int | None = None
    accel_info: list[int] | None = None
    temp_supported: list[int] | None = None
    spo2_config: list[int] | None = None
    spo2_sps: int | None = None
    max_latency: list[int] | None = None
    total_avail_sequence: int | None = None
    start_time: int | None = None
    dest_ip: str | None = None
    broadcast_interval: int | None = None
    feature_config: int | None = None
    accel_z_config: int | None = None


# ─── File Definition ────────────────────────────────────────────────


class PatchFileDefinition(BaseModel):
    """Metadata about a single file in a patch dataset."""

    filename: str
    relative_path: str
    purpose: str


# ─── Scaling Definition ─────────────────────────────────────────────


class PatchScalingDefinition(BaseModel):
    """Scaling information extracted from sensor_lib_info.txt.

    To convert raw values to physical units:  physical = raw * (num/den)
    """

    signal_name: str
    numerator: int
    denominator: int
    engineering_unit: str


# ─── Relationship ───────────────────────────────────────────────────


class PatchRelationship(BaseModel):
    """Logical relationship between files in a patch dataset."""

    source_file: str
    target_file: str
    description: str


# ─── Patch Metadata (top-level container) ───────────────────────────


class PatchMetadata(BaseModel):
    """Complete metadata for a patch dataset.

    This is stored as JSON in the dataset's schema_json column and
    deserialised when the dataset detail is requested.
    """

    # General
    patch_id: str
    firmware_version: int | None = None
    sensor_library_version: str | None = None
    product_number: str | None = None
    serial_number: str | None = None
    patch_lifetime: int | None = None
    start_time: int | None = None
    capabilities: PatchCapability | None = None

    # Files
    files: list[PatchFileDefinition] = []

    # Signal definitions
    signals: list[PatchSignalDefinition] = []

    # Analysis streams
    analysis_streams: list[PatchAnalysisDefinition] = []

    # Calibration
    calibration: PatchCalibration | None = None

    # Scaling definitions
    scaling_definitions: list[PatchScalingDefinition] = []

    # Relationships
    relationships: list[PatchRelationship] = []

    # Recording-level metadata (computed once during registration)
    recording_start_time_us: int | None = None
    recording_end_time_us: int | None = None
    recording_duration_us: int | None = None
    total_packets: int | None = None

    def to_schema_json(self) -> str:
        return self.model_dump_json()

    @classmethod
    def from_schema_json(cls, raw: str | None) -> PatchMetadata | None:
        if not raw:
            return None
        return cls.model_validate_json(raw)
