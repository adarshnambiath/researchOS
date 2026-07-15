"""
Patch dataset reader — validates a patch folder, discovers files, and
extracts metadata without parsing large NDJSON streams.
"""

import json
import os
from typing import Any

from app.readers.dataset_reader import DatasetReader
from app.schemas.patch import (
    PatchAnalysisDefinition,
    PatchCalibration,
    PatchCapability,
    PatchFileDefinition,
    PatchMetadata,
    PatchRelationship,
    PatchScalingDefinition,
    PatchSignalDefinition,
)

REQUIRED_FILES: list[str] = [
    "broadcast.json",
    "spout.json",
    "spout_mnb.json",
    "sensor_lib_info.txt",
    "spout_mnb_info.txt",
]

KNOWN_SIGNAL_FIELDS: dict[str, tuple[str, str]] = {
    "ECG_CH_A": ("ECG Channel A", "mV"),
    "ECG_CH_B": ("ECG Channel B", "mV"),
    "HR": ("Heart Rate", "BPM"),
    "RR_INTERVAL": ("RR Interval", "us"),
    "RESP": ("Respiration", "Ohm"),
    "SKIN_IMPEDANCE": ("Skin Impedance", "Ohm"),
    "RR": ("Respiratory Rate", "BrPM"),
    "SKINTEMP": ("Skin Temperature", "degC"),
    "BODYTEMP": ("Body Temperature", "degC"),
    "ACCEL_X": ("Accelerometer X", "g"),
    "ACCEL_Y": ("Accelerometer Y", "g"),
    "ACCEL_Z": ("Accelerometer Z", "g"),
    "POSTURE": ("Posture", "code"),
    "POSTURE_FINE": ("Fine Posture", "code"),
    "ACTIVITY": ("Activity", "code"),
    "SPO2": ("SpO₂", "%"),
    "PR": ("Pulse Rate", "BPM"),
}

FILE_RELATIONSHIPS: list[dict[str, str]] = [
    {
        "source": "broadcast.json",
        "target": "spout.json",
        "description": "Patch configuration provides context for raw physiological streams",
    },
    {
        "source": "broadcast.json",
        "target": "spout_mnb.json",
        "description": "Patch configuration provides context for rhythm analysis",
    },
    {
        "source": "spout.json",
        "target": "spout_mnb.json",
        "description": "Raw sensor data linked to rhythm analysis via Seq & TsECG fields",
    },
    {
        "source": "sensor_lib_info.txt",
        "target": "spout.json",
        "description": "Scaling definitions for raw sensor values in spout.json",
    },
    {
        "source": "spout_mnb_info.txt",
        "target": "spout_mnb.json",
        "description": "Rhythm/beat code definitions for spout_mnb.json analysis",
    },
]


def _read_json_file(filepath: str) -> dict[str, Any] | None:
    """Safely read and parse a JSON file, handling MongoDB-wrapped format."""
    try:
        with open(filepath, "r") as f:
            data = json.load(f)
        if isinstance(data, dict) and "broadcast" in data:
            return data["broadcast"]
        return data
    except (json.JSONDecodeError, FileNotFoundError, PermissionError):
        return None


def _parse_python_dict_file(filepath: str) -> dict[str, Any] | None:
    """Parse a Python-dict-format file (sensor_lib_info.txt) safely."""
    try:
        with open(filepath, "r") as f:
            content = f.read().strip()
        import ast
        return ast.literal_eval(content)
    except Exception:
        return None


def _extract_serial_number(raw: list[int]) -> str:
    chars = [chr(b) for b in raw if 32 <= b <= 126]
    return "".join(chars).strip("\x00").strip()


def _extract_product_number(raw: list[int]) -> str:
    chars = [chr(b) for b in raw if 32 <= b <= 126]
    return "".join(chars).strip("\x00").strip()


class PatchDatasetReader(DatasetReader):
    """Reader for Patch modality datasets."""

    def register(self, path: str) -> tuple[int, PatchMetadata]:
        """Validate and register a patch dataset folder."""
        missing: list[str] = []
        for fname in REQUIRED_FILES:
            if not os.path.isfile(os.path.join(path, fname)):
                missing.append(fname)
        if missing:
            raise ValueError(
                f"Missing required patch files: {', '.join(missing)}"
            )

        broadcast = _read_json_file(os.path.join(path, "broadcast.json"))
        if broadcast is None:
            raise ValueError("Cannot parse broadcast.json")

        version_info = broadcast.get("VersionInfo", {})
        patch_info = broadcast.get("PatchInfo", {})

        patch_id = patch_info.get("PatchId", "") or broadcast.get("patchId", "")
        firmware_version = version_info.get("FWVersion")
        sensor_lib_version = version_info.get("LsApiVersion")

        serial_raw = patch_info.get("SerialNum", [])
        serial_number = _extract_serial_number(serial_raw) if serial_raw else None

        product_raw = patch_info.get("ProductPartNumber", [])
        product_number = _extract_product_number(product_raw) if product_raw else None

        capability = broadcast.get("Capability", {})
        patch_lifetime = capability.get("MaxPatchLife")
        start_time = capability.get("StartTime") or broadcast.get("startTime")

        cap_model = self._extract_capabilities(capability)
        calibration = self._extract_calibration(
            broadcast.get("SensorCalibration", {})
        )
        files = self._discover_files(path)
        signals = self._extract_signal_definitions(os.path.join(path, "spout.json"))
        analysis = self._extract_analysis_definitions(os.path.join(path, "spout_mnb.json"))
        scaling = self._extract_scaling_definitions(os.path.join(path, "sensor_lib_info.txt"))

        # Scan spout.json once to capture recording-level metadata.
        # This is O(N) but happens only once at registration time,
        # not on every window request.
        rec_meta = _scan_spout_recording_metadata(os.path.join(path, "spout.json"))

        relationships = [
            PatchRelationship(
                source_file=r["source"],
                target_file=r["target"],
                description=r["description"],
            )
            for r in FILE_RELATIONSHIPS
        ]

        metadata = PatchMetadata(
            patch_id=patch_id,
            firmware_version=firmware_version,
            sensor_library_version=sensor_lib_version,
            product_number=product_number,
            serial_number=serial_number,
            patch_lifetime=patch_lifetime,
            start_time=start_time,
            capabilities=cap_model,
            files=files,
            signals=signals,
            analysis_streams=analysis,
            calibration=calibration,
            scaling_definitions=scaling,
            relationships=relationships,
            recording_start_time_us=rec_meta.get("recording_start_time_us"),
            recording_end_time_us=rec_meta.get("recording_end_time_us"),
            recording_duration_us=rec_meta.get("recording_duration_us"),
            total_packets=rec_meta.get("total_packets"),
        )

        return len(files), metadata

    def read_preview(
        self, path: str, limit: int = 20
    ) -> tuple[list[str], list[dict[str, Any]]]:
        return [], []

    # ── Private helpers ──────────────────────────────────────────

    def _extract_capabilities(
        self, capability: dict[str, Any]
    ) -> PatchCapability | None:
        if not capability:
            return None
        return PatchCapability(
            ecg_supported_channels=capability.get("ECGSupportedCh"),
            ecg_ch_sps=capability.get("ECGChSps"),
            respiration_config=capability.get("RespirationConfig"),
            max_patch_life=capability.get("MaxPatchLife"),
            accel_info=capability.get("AccelInfo"),
            temp_supported=capability.get("TempSupported"),
            spo2_config=capability.get("SpO2Config"),
            spo2_sps=capability.get("SpO2SPS"),
            max_latency=capability.get("MaxLatency"),
            total_avail_sequence=capability.get("TotalAvailSequence"),
            start_time=capability.get("StartTime"),
            dest_ip=capability.get("DestIP"),
            broadcast_interval=capability.get("BroadcastInterval"),
            feature_config=capability.get("FeatureConfig"),
            accel_z_config=capability.get("AccelZConfig"),
        )

    def _extract_calibration(
        self, calib: dict[str, Any]
    ) -> PatchCalibration | None:
        if not calib:
            return None
        return PatchCalibration(
            ecg_conv_lo_1mv=calib.get("IAConvLo1mv"),
            ecg_conv_hi_1mv=calib.get("IAConvHi1mv"),
            resp_1_ohm=calib.get("Resp1Ohm"),
            temp_calib=calib.get("TempCalib"),
            accel_calib=calib.get("AccelCalib"),
            spo2_calib=calib.get("SpO2Calib"),
            ia_gain_lo=calib.get("IAGainLo"),
            ia_gain_hi=calib.get("IAGainHi"),
            skin_temp_calib_ext_range=calib.get("SkinTempCalibExtRange"),
            ecg_code_permv=calib.get("ECGCodePermv"),
            resp_code_perohm=calib.get("RespCodePerohm"),
        )

    def _discover_files(self, path: str) -> list[PatchFileDefinition]:
        purposes: dict[str, str] = {
            "broadcast.json": "Patch configuration and metadata",
            "spout.json": "Raw physiological sensor data streams (NDJSON)",
            "spout_mnb.json": "Embedded rhythm analysis data (NDJSON)",
            "sensor_lib_info.txt": "Sensor output parameter scaling definitions",
            "spout_mnb_info.txt": "Rhythm/beat code definitions",
        }
        files: list[PatchFileDefinition] = []
        for fname, purpose in purposes.items():
            if os.path.isfile(os.path.join(path, fname)):
                files.append(
                    PatchFileDefinition(
                        filename=fname,
                        relative_path=fname,
                        purpose=purpose,
                    )
                )
        return files

    def _extract_signal_definitions(
        self, spout_path: str
    ) -> list[PatchSignalDefinition]:
        """Read only the first line of spout.json to discover signals."""
        try:
            with open(spout_path, "r") as f:
                first_line = f.readline()
            first_record = json.loads(first_line)
        except Exception:
            return []

        signals: list[PatchSignalDefinition] = []
        for field_name in first_record:
            if field_name in KNOWN_SIGNAL_FIELDS:
                display_name, units = KNOWN_SIGNAL_FIELDS[field_name]
                signals.append(
                    PatchSignalDefinition(
                        display_name=display_name,
                        source_file="spout.json",
                        source_field=field_name,
                        units=units,
                        enabled=True,
                    )
                )
        return signals

    def _extract_analysis_definitions(
        self, mnb_path: str
    ) -> list[PatchAnalysisDefinition]:
        """Read only the first line of spout_mnb.json."""
        try:
            with open(mnb_path, "r") as f:
                first_line = f.readline()
            first_record = json.loads(first_line)
        except Exception:
            return []

        analysis: list[PatchAnalysisDefinition] = []
        seq_field = first_record.get("Seq", "Seq")
        ts_field = first_record.get("TsECG", "TsECG")

        if "RHYTHMS" in first_record:
            analysis.append(
                PatchAnalysisDefinition(
                    name="Mindberger Rhythm Analysis",
                    source_file="spout_mnb.json",
                    sequence_field=str(seq_field),
                    timestamp_field=str(ts_field),
                    description=(
                        "Embedded real-time rhythm classification produced by the "
                        "Mindberger algorithm. Contains rhythm type, confidence, "
                        "and heart-rate measurements per segment."
                    ),
                )
            )
        if "FIDUCIARY_POINTS" in first_record:
            analysis.append(
                PatchAnalysisDefinition(
                    name="ECG Fiduciary Points",
                    source_file="spout_mnb.json",
                    sequence_field=str(seq_field),
                    timestamp_field=str(ts_field),
                    description=(
                        "ECG fiduciary point markers (sampleNumber, Type) for "
                        "beat-by-beat alignment."
                    ),
                )
            )
        return analysis

    def _extract_scaling_definitions(
        self, lib_path: str
    ) -> list[PatchScalingDefinition]:
        """Parse sensor_lib_info.txt to extract scaling ratios."""
        parsed = _parse_python_dict_file(lib_path)
        if parsed is None:
            return []
        outparams = parsed.get("outparams", [])
        field_to_signal: dict[str, str] = {
            "ECG_CH_A": "ECG Channel A",
            "ECG_CH_B": "ECG Channel B",
            "HR": "Heart Rate",
            "RR_INTERVAL": "RR Interval",
            "RESP": "Respiration",
            "SKIN_IMPEDANCE": "Skin Impedance",
            "RR": "Respiratory Rate",
            "SKINTEMP": "Skin Temperature",
            "BODYTEMP": "Body Temperature",
            "ACCEL_X": "Accelerometer X",
            "ACCEL_Y": "Accelerometer Y",
            "ACCEL_Z": "Accelerometer Z",
            "POSTURE": "Posture",
            "POSTURE_FINE": "Fine Posture",
            "ACTIVITY": "Activity",
        }
        scaling_defs: list[PatchScalingDefinition] = []
        for entry in outparams:
            if len(entry) >= 4:
                field_name = entry[0]
                signal_name = field_to_signal.get(field_name, field_name)
                scaling_defs.append(
                    PatchScalingDefinition(
                        signal_name=signal_name,
                        numerator=entry[1],
                        denominator=entry[2],
                        engineering_unit=entry[3],
                    )
                )
        return scaling_defs


def _scan_spout_recording_metadata(spout_path: str) -> dict[str, Any]:
    """Stream spout.json once and return recording-level metadata.

    This is deliberately separate from window extraction so it can be
    called at registration time without affecting provider complexity.
    """
    first_ts_ecg: int | None = None
    first_epoch: int | None = None
    first_seq: int | None = None

    last_ts_ecg: int | None = None
    last_epoch: int | None = None
    last_seq: int | None = None
    last_n: int = 0
    last_sps: float = 0.0

    total_packets = 0
    estimates_sps: float | None = None

    try:
        with open(spout_path, "r", encoding="utf-8", errors="replace") as fh:
            for line in fh:
                if not line.strip():
                    continue
                try:
                    record = json.loads(line)
                except json.JSONDecodeError:
                    continue

                total_packets += 1
                packet_seq = record.get("Seq", total_packets)
                packet_ts_ecg = record.get("TsECG", 0)
                packet_epoch = record.get("TsEPOCH_US", 0)
                chip_sps = record.get("sps")
                if chip_sps:
                    estimates_sps = float(chip_sps)

                field_data = record.get("ECG_CH_A")
                if not isinstance(field_data, list):
                    field_data = []
                n = len(field_data)

                if n > 0:
                    if first_ts_ecg is None:
                        first_ts_ecg = packet_ts_ecg
                        first_epoch = packet_epoch
                        first_seq = packet_seq

                    last_ts_ecg = packet_ts_ecg
                    last_epoch = packet_epoch
                    last_seq = packet_seq
                    last_n = n
                    last_sps = estimates_sps or 0.0
    except Exception:
        pass

    recording_start_time_us: int | None = None
    recording_end_time_us: int | None = None
    recording_duration_us: int | None = None

    if first_ts_ecg is not None and last_ts_ecg is not None:
        recording_start_time_us = first_ts_ecg
        last_packet_dur = (last_n * 1_000_000 / last_sps) if last_sps > 0 else 0
        recording_end_time_us = last_ts_ecg + int(last_packet_dur)
        recording_duration_us = recording_end_time_us - recording_start_time_us

    return {
        "recording_start_time_us": recording_start_time_us,
        "recording_end_time_us": recording_end_time_us,
        "recording_duration_us": recording_duration_us,
        "total_packets": total_packets or None,
    }
