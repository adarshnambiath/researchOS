import { useState } from "react";
import { WaveformChart } from "./WaveformChart";
import { WaveformToolbar } from "./WaveformToolbar";
import type { WaveformRecord } from "../../api/waveforms";

interface WaveformViewerProps {
  record: WaveformRecord;
}

/**
 * Composable waveform viewer that assembles the metadata section,
 * toolbar, and chart into a single component.
 *
 * Used by the waveform viewer page, and can be reused by
 * investigation pages, evaluation pages, or run detail pages
 * without change.
 *
 * Supports multi-channel waveforms: when record.channel_names is present,
 * a channel selector is shown and the chart displays the selected channel.
 */
export function WaveformViewer({ record }: WaveformViewerProps) {
  const [channelIndex, setChannelIndex] = useState(0);

  const channelName =
    record.channel_names && channelIndex < record.channel_names.length
      ? record.channel_names[channelIndex]
      : null;

  const duration =
    record.sampling_rate_hz && record.samples.length > 0
      ? (record.all_channels?.[channelIndex]?.length ?? record.samples.length) / record.sampling_rate_hz
      : null;

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-(--color-border) p-4">
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <span className="text-xs" style={{ color: "var(--color-muted)" }}>
              Record
            </span>
            <p className="mt-0.5 font-medium" style={{ color: "var(--color-text-primary)" }}>
              {record.record_id || "—"}
            </p>
          </div>
          <div>
            <span className="text-xs" style={{ color: "var(--color-muted)" }}>
              Duration
            </span>
            <p className="mt-0.5 font-medium" style={{ color: "var(--color-text-primary)" }}>
              {duration != null ? `${duration.toFixed(1)} s` : "—"}
            </p>
          </div>
          <div>
            <span className="text-xs" style={{ color: "var(--color-muted)" }}>
              Sampling Rate
            </span>
            <p className="mt-0.5 font-medium" style={{ color: "var(--color-text-primary)" }}>
              {record.sampling_rate_hz ? `${record.sampling_rate_hz} Hz` : "—"}
            </p>
          </div>
          <div>
            <span className="text-xs" style={{ color: "var(--color-muted)" }}>
              Channel
            </span>
            <p className="mt-0.5 font-medium" style={{ color: "var(--color-text-primary)" }}>
              {channelName ?? "—"}
            </p>
          </div>
        </div>
        {record.channel_names && record.channel_names.length > 1 && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs" style={{ color: "var(--color-muted)" }}>
              Switch channel:
            </span>
            <div className="flex flex-wrap gap-1">
              {record.channel_names.map((name, idx) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setChannelIndex(idx)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    idx === channelIndex
                      ? "bg-(--color-primary) text-white"
                      : "border border-(--color-border) text-(--color-text-secondary) hover:bg-(--color-card)"
                  }`}
                >
                  {name} {record.channel_units?.[idx] ? `(${record.channel_units[idx]})` : ""}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {record.label && <WaveformToolbar recordId={record.record_id} label={record.label} />}

      <WaveformChart waveform={record} channelIndex={channelIndex} />
    </div>
  );
}
