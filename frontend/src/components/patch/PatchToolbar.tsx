import type { PatchSignalRecord } from "../../api/patch";

interface PatchToolbarProps {
  record: PatchSignalRecord;
  startSample: number;
  maxSamples: number;
  onPrev: () => void;
  onNext: () => void;
  onJump: (sample: number) => void;
  onMaxSamplesChange: (max: number) => void;
}

export function PatchToolbar({
  record,
  startSample,
  maxSamples,
  onPrev,
  onNext,
  onJump,
  onMaxSamplesChange,
}: PatchToolbarProps) {
  const {
    signal_info,
    sampling_rate_hz,
    duration_us,
    packet_boundaries,
    record_info,
    start_sample,
    end_sample,
  } = record;

  const durationSec = duration_us != null ? duration_us / 1_000_000 : null;
  const sampleCount = record.samples.filter((s) => s != null).length;
  const gapCount = record.samples.length - sampleCount;
  const packetCount = packet_boundaries.length;
  const estimateTotal = record_info?.total_packets;

  return (
    <div className="rounded-lg border border-(--color-border) p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm">
          <span className="font-medium" style={{ color: "var(--color-text-primary)" }}>
            {signal_info.signal_name}
          </span>
          <span className="ml-2 text-xs" style={{ color: "var(--color-muted)" }}>
            {sampleCount} sample{gapCount > 0 ? ` + ${gapCount} gap(s)` : ""}
            {durationSec != null ? ` · ${durationSec.toFixed(2)} s` : ""}
          </span>
          <span className="ml-2 text-xs" style={{ color: "var(--color-muted)" }}>
            {sampling_rate_hz != null ? `${sampling_rate_hz} Hz` : ""}
            {packetCount > 0 ? ` · ${packetCount} pkt` : ""}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <button
            type="button"
            onClick={onPrev}
            disabled={startSample === 0}
            className="rounded-md border border-(--color-border) px-3 py-1.5 text-xs hover:bg-(--color-card) disabled:opacity-40"
          >
            ← Prev Window
          </button>
          <button
            type="button"
            onClick={onNext}
            className="rounded-md border border-(--color-border) px-3 py-1.5 text-xs hover:bg-(--color-card)"
          >
            Next Window →
          </button>
          <div className="flex items-center gap-1">
            <span className="text-xs" style={{ color: "var(--color-muted)" }}>Jump to:</span>
            <input
              type="number"
              min={0}
              value={startSample}
              onChange={(e) => onJump(Number(e.target.value))}
              className="w-24 rounded-md border border-(--color-border) px-2 py-1 text-sm"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs" style={{ color: "var(--color-muted)" }}>Samples:</span>
            <input
              type="number"
              min={10}
              max={10000}
              value={maxSamples}
              onChange={(e) => onMaxSamplesChange(Number(e.target.value))}
              className="w-24 rounded-md border border-(--color-border) px-2 py-1 text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
