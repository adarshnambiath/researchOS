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

  if (loading) return <div className="p-6 text-sm text-[var(--color-muted)]">Loading…</div>;
  if (error) return <div className="p-6 text-sm text-red-600">{error}</div>;
  if (!selected) return <div className="p-6 text-sm text-[var(--color-muted)]">Dataset not found.</div>;

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
        <Link to="/datasets" className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
          <ArrowLeft className="h-4 w-4 inline mr-1" /> Back
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">{selected.name}</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {selected.modality} · {(preview?.rows?.length ?? 0)} of {selected.row_count} rows shown
          </p>
        </div>
        <button onClick={openEdit} className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-card)]">
          <Pencil className="h-4 w-4" /> Edit
        </button>
      </div>

      <section className="rounded-lg border border-[var(--color-border)] p-6">
        <h3 className="text-sm font-medium text-[var(--color-text-primary)]">Details</h3>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-[var(--color-muted)]">Source Path</dt>
            <dd className="mt-1 text-sm text-[var(--color-text-primary)] break-all">{selected.source_path}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-muted)]">Label Column</dt>
            <dd className="mt-1 text-sm text-[var(--color-text-primary)]">{selected.label_column ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-muted)]">Sample ID Column</dt>
            <dd className="mt-1 text-sm text-[var(--color-text-primary)]">{selected.sample_id_column ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-muted)]">Created</dt>
            <dd className="mt-1 text-sm text-[var(--color-text-primary)]">{formatDate(selected.created_at)}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-[var(--color-border)] p-6">
        <h3 className="text-sm font-medium text-[var(--color-text-primary)]">Schema</h3>
        <div className="mt-4 grid grid-cols-1 gap-2">
          {selected.dataset_schema?.map((col) => (
            <div key={col.name} className="flex items-center justify-between rounded-md border border-[var(--color-border)] px-3 py-2">
              <span className="text-sm text-[var(--color-text-primary)]">{col.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[var(--color-muted)]">{col.type}</span>
                {col.nullable && <span className="text-xs text-[var(--color-muted)]">nullable</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-[var(--color-border)] p-6">
        <h3 className="text-sm font-medium text-[var(--color-text-primary)]">Preview (Live)</h3>
        {preview ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--color-card)]">
                <tr>
                  {preview.columns?.map((col) => (
                    <th key={col} className="px-3 py-2 font-medium text-[var(--color-text-secondary)]">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {preview.rows?.map((row, idx) => (
                  <tr key={idx}>
                    {preview.columns?.map((col) => (
                      <td key={col} className="px-3 py-2 text-[var(--color-text-primary)]">
                        {String(row[col] ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--color-muted)]">Loading live preview…</p>
        )}
      </section>

      {editOpen && (
        <Modal title="Edit Dataset" onClose={() => setEditOpen(false)}>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField label="Name" required>
              <input
                className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </FormField>
            <FormField label="Modality">
              <input
                className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
                value={form.modality}
                onChange={(e) => setForm({ ...form, modality: e.target.value })}
              />
            </FormField>
            <FormField label="Description">
              <textarea
                className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Label Column">
                <input
                  className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
                  value={form.label_column}
                  onChange={(e) => setForm({ ...form, label_column: e.target.value })}
                />
              </FormField>
              <FormField label="Sample ID Column">
                <input
                  className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
                  value={form.sample_id_column}
                  onChange={(e) => setForm({ ...form, sample_id_column: e.target.value })}
                />
              </FormField>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setEditOpen(false)} className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm hover:bg-[var(--color-card)]">
                Cancel
              </button>
              <button type="submit" className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-hover)]">
                Save
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
