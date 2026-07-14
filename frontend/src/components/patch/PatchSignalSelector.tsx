import type { PatchSignalInfo } from "../../api/patch";

interface PatchSignalSelectorProps {
  signals: PatchSignalInfo[];
  active: PatchSignalInfo | null;
  onChange: (signal: PatchSignalInfo) => void;
}

export function PatchSignalSelector({ signals, active, onChange }: PatchSignalSelectorProps) {
  const enabled = signals.filter((s) => s.enabled);

  return (
    <select
      value={active?.source_field || ""}
      onChange={(e) => {
        const found = signals.find((s) => s.source_field === e.target.value);
        if (found) onChange(found);
      }}
      className="rounded-md border border-(--color-border) px-3 py-1.5 text-sm"
    >
      <option value="" disabled>
        Select a signal…
      </option>
      {enabled.map((s) => (
        <option key={s.source_field} value={s.source_field}>
          {s.signal_name}
        </option>
      ))}
    </select>
  );
}
