import type { PatchSignalRecord } from "../../api/patch";

interface PatchToolbarProps {
  record: PatchSignalRecord;
  startIndex: number;
  windowSize: number;
  onPrev: () => void;
  onNext: () => void;
  onJump: (index: number) => void;
  onWindowSizeChange: (size: number) => void;
}

export function PatchToolbar({
  record,
  startIndex,
  windowSize,
  onPrev,
  onNext,
  onJump,
  onWindowSizeChange,
}: PatchToolbarProps) {
  const total = record.record_info?.total_samples;
  const currentEnd = record.end_index;

  return (
    <div className="rounded-lg border border-(--color-border) p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm">
          <span className="font-medium" style={{ color: "var(--color-text-primary)" }}>
            {record.signal_info.signal_name}
          </span>
          <span className="ml-2 text-xs" style={{ color: "var(--color-muted)" }}>
            Samples {startIndex}–{currentEnd}{total != null ? ` of ${total}` : ""}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <button
            type="button"
            onClick={onPrev}
            disabled={startIndex === 0}
            className="rounded-md border border-(--color-border) px-3 py-1.5 text-xs hover:bg-(--color-card) disabled:opacity-40"
          >
            ← Prev Window
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={total != null && startIndex + windowSize >= total}
            className="rounded-md border border-(--color-border) px-3 py-1.5 text-xs hover:bg-(--color-card) disabled:opacity-40"
          >
            Next Window →
          </button>
          <div className="flex items-center gap-1">
            <span className="text-xs" style={{ color: "var(--color-muted)" }}>Jump to:</span>
            <input
              type="number"
              min={0}
              value={startIndex}
              onChange={(e) => onJump(Number(e.target.value))}
              className="w-24 rounded-md border border-(--color-border) px-2 py-1 text-sm"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs" style={{ color: "var(--color-muted)" }}>Window:</span>
            <input
              type="number"
              min={10}
              max={10000}
              value={windowSize}
              onChange={(e) => onWindowSizeChange(Number(e.target.value))}
              className="w-24 rounded-md border border-(--color-border) px-2 py-1 text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
