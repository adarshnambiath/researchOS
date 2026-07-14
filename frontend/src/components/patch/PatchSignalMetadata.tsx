import type { PatchSignalInfo } from "../../api/patch";

interface PatchSignalMetadataProps {
  signal: PatchSignalInfo;
}

export function PatchSignalMetadata({ signal }: PatchSignalMetadataProps) {
  return (
    <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
      <div>
        <dt className="text-xs" style={{ color: "var(--color-muted)" }}>Source Field</dt>
        <dd className="mt-0.5 font-medium" style={{ color: "var(--color-text-primary)" }}>
          {signal.source_field}
        </dd>
      </div>
      <div>
        <dt className="text-xs" style={{ color: "var(--color-muted)" }}>Units</dt>
        <dd className="mt-0.5 font-medium" style={{ color: "var(--color-text-primary)" }}>
          {signal.units || "—"}
        </dd>
      </div>
      <div>
        <dt className="text-xs" style={{ color: "var(--color-muted)" }}>Scale Factor</dt>
        <dd className="mt-0.5 font-medium" style={{ color: "var(--color-text-primary)" }}>
          {signal.scale_factor != null ? signal.scale_factor : "—"}
        </dd>
      </div>
      <div>
        <dt className="text-xs" style={{ color: "var(--color-muted)" }}>Status</dt>
        <dd
          className="mt-0.5 font-medium"
          style={{ color: signal.enabled ? "var(--color-text-primary)" : "var(--color-muted)" }}
        >
          {signal.enabled ? "Enabled" : "Disabled"}
        </dd>
      </div>
    </dl>
  );
}
