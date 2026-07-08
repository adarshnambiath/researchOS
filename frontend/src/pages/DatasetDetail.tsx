import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Pencil } from "lucide-react";
import { useDatasetStore } from "../stores/datasetStore";
import { FormField } from "../components/FormField";
import { Modal } from "../components/Modal";
import { formatDate } from "../lib/format";

export function DatasetDetail() {
  const { id } = useParams();
  const { selected, preview, loading, error, loadOne, loadPreview, clearSelected, update } = useDatasetStore();

  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", modality: "", label_column: "", sample_id_column: "" });

  useEffect(() => {
    if (id) {
      loadOne(Number(id));
      loadPreview(Number(id));
    }
    return () => clearSelected();
  }, [id, loadOne, loadPreview, clearSelected]);

  if (loading) return <div className="p-6 text-sm text-(--color-muted)">Loading…</div>;
  if (error) return <div className="p-6 text-sm text-red-600">{error}</div>;
  if (!selected) return <div className="p-6 text-sm text-(--color-muted)">Dataset not found.</div>;

  const openEdit = () => {
    setForm({
      name: selected.name,
      description: selected.description || "",
      modality: selected.modality,
      label_column: selected.label_column || "",
      sample_id_column: selected.sample_id_column || "",
    });
    setEditOpen(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await update(selected.id, {
      name: form.name,
      description: form.description || undefined,
      modality: form.modality,
      label_column: form.label_column || undefined,
      sample_id_column: form.sample_id_column || undefined,
    });
    setEditOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/datasets" className="text-sm text-(--color-text-secondary) hover:text-(--color-text-primary)">
          <ArrowLeft className="h-4 w-4 inline mr-1" /> Back
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-(--color-text-primary)">{selected.name}</h1>
          <p className="text-sm text-(--color-text-secondary)">
            {selected.modality === "ecg_wfdb"
              ? `ECG (WFDB) · ${selected.row_count} records`
              : `${selected.modality} · ${(preview?.rows?.length ?? 0)} of ${selected.row_count} rows shown`}
          </p>
        </div>
        <button onClick={openEdit} className="inline-flex items-center gap-2 rounded-lg border border-(--color-border) px-4 py-2 text-sm font-medium hover:bg-(--color-card)">
          <Pencil className="h-4 w-4" /> Edit
        </button>
      </div>

      <section className="rounded-lg border border-(--color-border) p-6">
        <h3 className="text-sm font-medium text-(--color-text-primary)">Details</h3>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-(--color-muted)">Source Path</dt>
            <dd className="mt-1 text-sm text-(--color-text-primary) break-all">{selected.source_path}</dd>
          </div>
          {selected.modality === "ecg_wfdb" && selected.wfdb_metadata ? (
            <>
              <div>
                <dt className="text-xs text-(--color-muted)">Dataset Type</dt>
                <dd className="mt-1 text-sm text-(--color-text-primary)">ECG (WFDB)</dd>
              </div>
              <div>
                <dt className="text-xs text-(--color-muted)">Number of Records</dt>
                <dd className="mt-1 text-sm text-(--color-text-primary)">{selected.wfdb_metadata.number_of_records}</dd>
              </div>
              <div>
                <dt className="text-xs text-(--color-muted)">Directory</dt>
                <dd className="mt-1 text-sm text-(--color-text-primary) break-all">{selected.source_path}</dd>
              </div>
              {selected.wfdb_metadata.sampling_rate != null && (
                <div>
                  <dt className="text-xs text-(--color-muted)">Sampling Rate</dt>
                  <dd className="mt-1 text-sm text-(--color-text-primary)">{selected.wfdb_metadata.sampling_rate} Hz</dd>
                </div>
              )}
              {selected.wfdb_metadata.channel_names && selected.wfdb_metadata.channel_names.length > 0 && (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-(--color-muted)">Channels</dt>
                  <dd className="mt-1 text-sm text-(--color-text-primary)">{selected.wfdb_metadata.channel_names.join(", ")}</dd>
                </div>
              )}
              {selected.wfdb_metadata.signal_units && selected.wfdb_metadata.signal_units.length > 0 && (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-(--color-muted)">Units</dt>
                  <dd className="mt-1 text-sm text-(--color-text-primary)">{selected.wfdb_metadata.signal_units.join(", ")}</dd>
                </div>
              )}
              <div className="sm:col-span-2">
                <dt className="text-xs text-(--color-muted)">Records</dt>
                <dd className="mt-1">
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {selected.wfdb_metadata.records.slice(0, 5).map((rec) => (
                      <a
                        key={rec.record_name}
                        href={`/datasets/${selected.id}/waveforms/${encodeURIComponent(rec.record_name)}`}
                        className="text-sm font-medium text-(--color-primary) hover:underline"
                      >
                        {rec.record_name}
                      </a>
                    ))}
                    {selected.wfdb_metadata.records.length > 5 && (
                      <span className="text-sm text-(--color-muted)">
                        +{selected.wfdb_metadata.records.length - 5} more
                      </span>
                    )}
                  </div>
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-(--color-muted)">View Record</dt>
                <dd className="mt-1">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const input = (e.target as HTMLFormElement).elements.namedItem("recordId") as HTMLInputElement;
                      if (input.value) {
                        window.location.href = `/datasets/${selected.id}/waveforms/${encodeURIComponent(input.value)}`;
                      }
                    }}
                    className="flex items-center gap-2"
                  >
                    <input
                      name="recordId"
                      type="text"
                      placeholder="Enter record ID (e.g. 100)"
                      className="flex-1 rounded-md border border-(--color-border) px-3 py-1.5 text-sm"
                    />
                    <button
                      type="submit"
                      className="shrink-0 rounded-md bg-(--color-primary) px-3 py-1.5 text-sm font-medium text-white hover:bg-(--color-hover-button)"
                    >
                      View
                    </button>
                  </form>
                </dd>
              </div>
            </>
          ) : (
            <>
              <div>
                <dt className="text-xs text-(--color-muted)">Label Column</dt>
                <dd className="mt-1 text-sm text-(--color-text-primary)">{selected.label_column ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-(--color-muted)">Sample ID Column</dt>
                <dd className="mt-1 text-sm text-(--color-text-primary)">{selected.sample_id_column ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-(--color-muted)">Created</dt>
                <dd className="mt-1 text-sm text-(--color-text-primary)">{formatDate(selected.created_at)}</dd>
              </div>
            </>
          )}
        </dl>
      </section>

      <section className="rounded-lg border border-(--color-border) p-6">
        <h3 className="text-sm font-medium text-(--color-text-primary)">Schema</h3>
        <div className="mt-4 grid grid-cols-1 gap-2">
          {selected.waveform_definitions && selected.waveform_definitions.length > 0 ? (
            <>
              {selected.waveform_definitions.map((waveform) => {
                return (
                  <div
                    key={waveform.name}
                    className="rounded-lg border border-(--color-border) p-4"
                    style={{ backgroundColor: "var(--color-card)" }}
                  >
                    <h4 className="text-sm font-medium text-(--color-text-primary)">
                      {waveform.name}
                    </h4>
                    <div className="mt-2 space-y-1 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                      {waveform.sampling_rate && <p>Sampling Rate: {waveform.sampling_rate} Hz</p>}
                      {waveform.units && <p>Units: {waveform.units}</p>}
                      <p>Columns: {waveform.start_column} → {waveform.end_column}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => (window.location.href = `/datasets/${selected.id}/waveforms/${encodeURIComponent(waveform.name)}`)}
                      className="mt-3 inline-flex items-center gap-1 rounded-md bg-(--color-primary) px-3 py-1.5 text-xs font-medium text-white hover:bg-(--color-hover-button)"
                    >
                      Preview Waveform
                    </button>
                  </div>
                );
              })}
              {selected.dataset_schema?.length ? (() => {
                const waveformColumnNames = new Set<string>();
                selected.waveform_definitions?.forEach((waveform) => {
                  const startIdx = selected.dataset_schema!.findIndex((col) => col.name === waveform.start_column);
                  const endIdx = selected.dataset_schema!.findIndex((col) => col.name === waveform.end_column);
                  if (startIdx >= 0 && endIdx >= startIdx) {
                    selected.dataset_schema!.slice(startIdx, endIdx + 1).forEach((col) => waveformColumnNames.add(col.name));
                  }
                });
                const remainingColumns = selected.dataset_schema.filter((col) => !waveformColumnNames.has(col.name));
                if (!remainingColumns.length) return null;
                return (
                  <>
                    {remainingColumns.map((col) => (
                      <div key={col.name} className="flex items-center justify-between rounded-md border border-(--color-border) px-3 py-2">
                        <span className="text-sm text-(--color-text-primary)">{col.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-(--color-muted)">{col.type}</span>
                          {col.nullable && <span className="text-xs text-(--color-muted)">nullable</span>}
                        </div>
                      </div>
                    ))}
                  </>
                );
              })() : null}
            </>
          ) : (
            selected.dataset_schema?.length ? (
              <>
                {selected.dataset_schema.map((col) => (
                  <div key={col.name} className="flex items-center justify-between rounded-md border border-(--color-border) px-3 py-2">
                    <span className="text-sm text-(--color-text-primary)">{col.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-(--color-muted)">{col.type}</span>
                      {col.nullable && <span className="text-xs text-(--color-muted)">nullable</span>}
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="px-3 py-2 text-xs text-(--color-muted)">No schema available.</div>
            )
          )}
        </div>
      </section>

      {editOpen && (
        <Modal title="Edit Dataset" onClose={() => setEditOpen(false)}>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField label="Name" required>
              <input
                className="mt-1 w-full rounded-md border border-(--color-border) px-3 py-2 text-sm"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </FormField>
            <FormField label="Modality">
              <select
                className="mt-1 w-full rounded-md border border-(--color-border) px-3 py-2 text-sm"
                value={form.modality}
                onChange={(e) => setForm({ ...form, modality: e.target.value })}
              >
                <option value="tabular">Tabular</option>
                <option value="ecg_wfdb">ECG (WFDB)</option>
              </select>
            </FormField>
            <FormField label="Description">
              <textarea
                className="mt-1 w-full rounded-md border border-(--color-border) px-3 py-2 text-sm"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </FormField>
            {form.modality === "tabular" && (
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Label Column">
                  <input
                    className="mt-1 w-full rounded-md border border-(--color-border) px-3 py-2 text-sm"
                    value={form.label_column}
                    onChange={(e) => setForm({ ...form, label_column: e.target.value })}
                  />
                </FormField>
                <FormField label="Sample ID Column">
                  <input
                    className="mt-1 w-full rounded-md border border-(--color-border) px-3 py-2 text-sm"
                    value={form.sample_id_column}
                    onChange={(e) => setForm({ ...form, sample_id_column: e.target.value })}
                  />
                </FormField>
              </div>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setEditOpen(false)} className="rounded-md border border-(--color-border) px-4 py-2 text-sm hover:bg-(--color-card)">
                Cancel
              </button>
              <button type="submit" className="rounded-md bg-(--color-primary) px-4 py-2 text-sm font-medium text-white hover:bg-(--color-hover-button)">
                Save
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
