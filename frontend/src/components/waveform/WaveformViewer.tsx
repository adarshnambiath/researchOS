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
 */
export function WaveformViewer({ record }: WaveformViewerProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-[var(--color-border)] p-4">
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-xs" style={{ color: "var(--color-muted)" }}>
              Record ID
            </span>
            <p className="mt-0.5 font-medium" style={{ color: "var(--color-text-primary)" }}>
              {record.record_id || "—"}
            </p>
          </div>
          <div>
            <span className="text-xs" style={{ color: "var(--color-muted)" }}>
              Label
            </span>
            <p className="mt-0.5 font-medium" style={{ color: "var(--color-text-primary)" }}>
              {record.label || "—"}
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
              Units
            </span>
            <p className="mt-0.5 font-medium" style={{ color: "var(--color-text-primary)" }}>
              {record.units || "—"}
            </p>
          </div>
        </div>
      </section>

      <WaveformToolbar recordId={record.record_id} label={record.label} />

      <WaveformChart waveform={record} />
    </div>
  );
}
