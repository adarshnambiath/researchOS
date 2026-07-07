interface WaveformToolbarProps {
  recordId: string;
  label?: string | null;
  onRecordChange?: (recordId: string) => void;
}

/**
 * Minimal toolbar for waveform navigation.
 *
 * Future: add zoom controls, play/pause, record selector dropdown, etc.
 */
export function WaveformToolbar({ recordId, label }: WaveformToolbarProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-4 py-3">
      <div className="flex items-center gap-4 text-sm">
        <span style={{ color: "var(--color-text-secondary)" }}>
          Record ID:
        </span>
        <span className="font-medium" style={{ color: "var(--color-text-primary)" }}>
          {recordId || "—"}
        </span>
        {label && (
          <>
            <span style={{ color: "var(--color-text-secondary)" }}>Label:</span>
            <span className="font-medium" style={{ color: "var(--color-text-primary)" }}>
              {label}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
