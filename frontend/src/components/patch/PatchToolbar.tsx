import type { PatchSignalRecord } from "../../api/patch";

interface PatchToolbarProps {
  record: PatchSignalRecord;
  startTimeUs: number;
  durationUs: number;
  onPrev: () => void;
  onNext: () => void;
  onJumpToTime: (timeUs: number) => void;
  onDurationChange: (durUs: number) => void;
}

function formatUs(value: number | null | undefined): string {
  if (value == null || !isFinite(value)) return "—";
  const totalSec = value / 1_000_000;
  if (totalSec < 0) return "—";
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const parts = [
    hours > 0 ? `${hours} h` : null,
    hours > 0 || minutes > 0 ? `${minutes} min` : null,
    `${seconds.toFixed(2)} s`,
  ].filter(Boolean);
  return parts.join(" ");
}

export function PatchToolbar({
  record,
  startTimeUs,
  durationUs,
  onPrev,
  onNext,
  onJumpToTime,
  onDurationChange,
}: PatchToolbarProps) {
  const {
    signal_info,
    sampling_rate_hz,
    duration_us,
    packet_boundaries,
    record_info,
    recording_start_time_us,
    recording_end_time_us,
    recording_duration_us,
  } = record;

  const validSamples = record.samples.filter((s) => s != null).length;
  const packetCount = packet_boundaries.length;
  const totalPackets = record_info?.total_packets;
  const windowStartSec = startTimeUs / 1_000_000;
  const windowEndSec = (startTimeUs + durationUs) / 1_000_000;
  const windowDurationSec = durationUs / 1_000_000;

  const recordingStartSec = recording_start_time_us != null ? recording_start_time_us / 1_000_000 : null;
  const recordingEndSec = recording_end_time_us != null ? recording_end_time_us / 1_000_000 : null;
  const progress =
    recordingStartSec != null && recordingEndSec != null && recordingEndSec > recordingStartSec
      ? ((windowStartSec - recordingStartSec) / (recordingEndSec - recordingStartSec)) * 100
      : 0;

  const progressPct = Math.max(0, Math.min(100, progress));

  return (
    <div className="rounded-lg border border-(--color-border) p-4 space-y-4">
      {/* Signal summary */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
            {signal_info.signal_name}
            {signal_info.units ? ` (${signal_info.units})` : ""}
          </div>
          <div className="mt-1 text-xs" style={{ color: "var(--color-muted)" }}>
            {sampling_rate_hz != null ? `${sampling_rate_hz.toFixed(2)} Hz` : "— Hz"}
            {validSamples > 0 ? ` • ${validSamples} valid sample${validSamples !== 1 ? "s" : ""}` : ""}
            {packetCount > 0 ? ` • ${packetCount} packet${packetCount !== 1 ? "s" : ""}` : ""}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <button
            type="button"
            onClick={onPrev}
            disabled={startTimeUs <= 0}
            className="rounded-md border border-(--color-border) px-3 py-1.5 text-xs hover:bg-(--color-card) disabled:opacity-40"
          >
            ← Prev Window
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={recordingEndSec != null && windowEndSec >= recordingEndSec}
            className="rounded-md border border-(--color-border) px-3 py-1.5 text-xs hover:bg-(--color-card) disabled:opacity-40"
          >
            Next Window →
          </button>
          <div className="flex items-center gap-1">
            <span className="text-xs" style={{ color: "var(--color-muted)" }}>Jump to (s):</span>
            <input
              type="number"
              min={0}
              step={0.01}
              value={windowStartSec}
              onChange={(e) => onJumpToTime(Math.max(0, Number(e.target.value) * 1_000_000))}
              className="w-24 rounded-md border border-(--color-border) px-2 py-1 text-sm"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs" style={{ color: "var(--color-muted)" }}>Duration (s):</span>
            <input
              type="number"
              min={0.01}
              max={60}
              step={0.1}
              value={windowDurationSec}
              onChange={(e) => onDurationChange(Math.max(10_000, Number(e.target.value) * 1_000_000))}
              className="w-24 rounded-md border border-(--color-border) px-2 py-1 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Current window */}
      <div className="text-xs space-y-1" style={{ color: "var(--color-muted)" }}>
        <div className="font-medium" style={{ color: "var(--color-text-secondary)" }}>Current Window</div>
        <div>
          Start: {formatUs(startTimeUs)} → End: {formatUs(startTimeUs + durationUs)}
        </div>
        <div>Duration: {formatUs(durationUs)}</div>
      </div>

      {/* Recording range */}
      {recordingStartSec != null && recordingEndSec != null && (
        <div className="text-xs space-y-1" style={{ color: "var(--color-muted)" }}>
          <div className="font-medium" style={{ color: "var(--color-text-secondary)" }}>Recording Range</div>
          <div>
            {formatUs(recording_start_time_us)} → {formatUs(recording_end_time_us)}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: "var(--color-border)" }}>
              <div
                className="h-1.5 rounded-full"
                style={{ width: `${progressPct}%`, backgroundColor: "var(--color-primary)" }}
              />
            </div>
            <span style={{ color: "var(--color-text-secondary)" }}>
              {progressPct.toFixed(1)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
