import type { PatchSignalInfo, PatchSignalRecord } from "../../api/patch";
import { PatchChart } from "./PatchChart";
import { PatchToolbar } from "./PatchToolbar";
import { PatchSignalSelector } from "./PatchSignalSelector";
import { PatchSignalMetadata } from "./PatchSignalMetadata";

interface PatchViewerLayoutProps {
  signals: PatchSignalInfo[];
  active: PatchSignalInfo | null;
  onSignalChange: (signal: PatchSignalInfo) => void;
  record: PatchSignalRecord | null;
  loading: boolean;
  error: string | null;
  startTimeUs: number;
  durationUs: number;
  onStartTimeChange: (t: number) => void;
  onDurationChange: (d: number) => void;
  onPrev: () => void;
  onNext: () => void;
}

export function PatchViewerLayout({
  signals,
  active,
  onSignalChange,
  record,
  loading,
  error,
  startTimeUs,
  durationUs,
  onStartTimeChange,
  onDurationChange,
  onPrev,
  onNext,
}: PatchViewerLayoutProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-(--color-border) p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
            Signals
          </h3>
          <PatchSignalSelector signals={signals} active={active} onChange={onSignalChange} />
        </div>
        {active && <PatchSignalMetadata signal={active} />}
      </section>

      {!loading && !error && record && (
        <PatchToolbar
          record={record}
          startTimeUs={startTimeUs}
          durationUs={durationUs}
          onPrev={onPrev}
          onNext={onNext}
          onJumpToTime={onStartTimeChange}
          onDurationChange={onDurationChange}
        />
      )}

      {loading && (
        <div className="p-8 text-center text-sm" style={{ color: "var(--color-muted)" }}>
          Loading signal…
        </div>
      )}
      {error && <div className="p-8 text-center text-sm text-red-600">{error}</div>}
      {!loading && !error && record && <PatchChart record={record} />}
    </div>
  );
}
