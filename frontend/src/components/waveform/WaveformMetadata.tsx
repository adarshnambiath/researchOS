import type { WaveformDefinitionSummary } from "../../api/waveforms";

interface WaveformMetadataProps {
  definition: WaveformDefinitionSummary;
}

/**
 * Displays waveform definition metadata: name, sampling rate,
 * units, and column range.
 *
 * Reusable — only cares about the definition shape, not about
 * datasets or storage format.
 */
export function WaveformMetadata({ definition }: WaveformMetadataProps) {
  return (
    <div className="grid grid-cols-2 gap-4 text-sm">
      <div>
        <span className="text-xs" style={{ color: "var(--color-muted)" }}>
          Sampling Rate
        </span>
        <p className="mt-0.5 font-medium" style={{ color: "var(--color-text-primary)" }}>
          {definition.sampling_rate_hz ? `${definition.sampling_rate_hz} Hz` : "—"}
        </p>
      </div>
      <div>
        <span className="text-xs" style={{ color: "var(--color-muted)" }}>
          Units
        </span>
        <p className="mt-0.5 font-medium" style={{ color: "var(--color-text-primary)" }}>
          {definition.units || "—"}
        </p>
      </div>
      <div>
        <span className="text-xs" style={{ color: "var(--color-muted)" }}>
          Start Column
        </span>
        <p className="mt-0.5 font-medium" style={{ color: "var(--color-text-primary)" }}>
          {definition.start_column}
        </p>
      </div>
      <div>
        <span className="text-xs" style={{ color: "var(--color-muted)" }}>
          End Column
        </span>
        <p className="mt-0.5 font-medium" style={{ color: "var(--color-text-primary)" }}>
          {definition.end_column}
        </p>
      </div>
    </div>
  );
}
