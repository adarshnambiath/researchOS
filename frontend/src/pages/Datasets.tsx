import { useEffect, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { useDatasetStore } from "../stores/datasetStore";
import { DataTable } from "../components/DataTable";
import { EmptyState } from "../components/EmptyState";

export function Datasets() {
  const { items, loading, error, load, create, remove } = useDatasetStore();
  const [open, setOpen] = useState(false);
  const initialForm = {
    name: "",
    source_path: "",
    description: "",
    modality: "tabular",
    label_column: "",
    sample_id_column: "",
    add_waveform: false,
    waveforms: [] as Array<{
      name: string;
      start_column: string;
      end_column: string;
      sampling_rate: string;
      units: string;
    }>,
  };
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    load();
  }, [load]);

  const addWaveform = () => {
    setForm((prev) => ({
      ...prev,
      waveforms: [...prev.waveforms, { name: "", start_column: "", end_column: "", sampling_rate: "", units: "" }],
    }));
  };

  const removeWaveform = (index: number) => {
    setForm((prev) => ({
      ...prev,
      waveforms: prev.waveforms.filter((_, i) => i !== index),
    }));
  };

  const updateWaveform = (index: number, field: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      waveforms: prev.waveforms.map((w, i) => (i === index ? { ...w, [field]: value } : w)),
    }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const waveformDefinitions = form.add_waveform && form.waveforms.length > 0
      ? form.waveforms.map((w) => ({
          name: w.name,
          start_column: w.start_column,
          end_column: w.end_column,
          sampling_rate: w.sampling_rate ? Number(w.sampling_rate) : undefined,
          units: w.units || undefined,
        }))
      : undefined;

    await create({
      name: form.name,
      source_path: form.source_path,
      description: form.description || undefined,
      modality: form.modality,
      label_column: form.label_column || undefined,
      sample_id_column: form.sample_id_column || undefined,
      waveform_definitions: waveformDefinitions,
    });
    setOpen(false);
    setForm(initialForm);
  };

  const onRemove = async (id: number) => {
    if (!confirm("Delete this dataset registration? Source file will not be deleted.")) return;
    await remove(id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">Datasets</h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Registered data sources for model evaluation.</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-hover-button)]"
        >
          <Plus className="h-4 w-4" /> Register Dataset
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <div className="p-8 text-center text-sm text-[var(--color-muted)]">Loading datasets…</div>
      ) : (
        <DataTable
          columns={[
            { header: "ID", accessor: "id", width: "80px" },
            { header: "Name", accessor: "name" },
            { header: "Modality", accessor: "modality", width: "140px" },
            { header: "Rows", accessor: "row_count", width: "120px" },
            { header: "Created", accessor: "created_at" as any, width: "180px" },
            {
              header: "",
              accessor: (row: any) => (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(row.id);
                  }}
                  className="text-[var(--color-muted)] hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ),
              width: "60px",
            },
          ]}
          data={items as never[]}
          onRowClick={(row) => (window.location.href = `/datasets/${(row as any).id}`)}
          empty={
            <EmptyState title="No datasets registered" description="Register a CSV to begin." action={
              <button onClick={() => setOpen(true)} className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-hover-button)]">Register Dataset</button>
            } />
          }
        />
      )}

      {open && (
        <FormModal title="Register Dataset" onClose={() => setOpen(false)} onSubmit={onSubmit}>
          <FormField label="Name" required>
            <input className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FormField>
          <FormField label="Source Path" required>
            <input className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm" value={form.source_path} onChange={(e) => setForm({ ...form, source_path: e.target.value })} placeholder="/absolute/path/to/data.csv" />
          </FormField>
          <FormField label="Description">
            <textarea className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Modality">
              <input className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm" value={form.modality} onChange={(e) => setForm({ ...form, modality: e.target.value })} />
            </FormField>
            <FormField label="Label Column">
              <input className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm" value={form.label_column} onChange={(e) => setForm({ ...form, label_column: e.target.value })} />
            </FormField>
          </div>
          <FormField label="Sample ID Column">
            <input className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm" value={form.sample_id_column} onChange={(e) => setForm({ ...form, sample_id_column: e.target.value })} />
          </FormField>
          <div className="mt-6 space-y-4 rounded-lg border border-[var(--color-border)] p-4">
            <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
              <input
                type="checkbox"
                checked={form.add_waveform}
                onChange={(e) => setForm({ ...form, add_waveform: e.target.checked })}
                className="h-4 w-4 rounded border-[var(--color-border)]"
              />
              Add Waveform Definition
            </label>
            {form.add_waveform && (
              <div className="space-y-4">
                {form.waveforms.map((waveform, index) => (
                  <div key={index} className="rounded-lg border border-[var(--color-border)] p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-[var(--color-text-primary)]">Waveform {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeWaveform(index)}
                        className="text-[var(--color-muted)] hover:text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField label="Waveform Name" required>
                        <input className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm" value={waveform.name} onChange={(e) => updateWaveform(index, "name", e.target.value)} />
                      </FormField>
                      <FormField label="Sampling Rate">
                        <input type="number" step="any" className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm" value={waveform.sampling_rate} onChange={(e) => updateWaveform(index, "sampling_rate", e.target.value)} />
                      </FormField>
                      <FormField label="Start Column" required>
                        <input className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm" value={waveform.start_column} onChange={(e) => updateWaveform(index, "start_column", e.target.value)} />
                      </FormField>
                      <FormField label="End Column" required>
                        <input className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm" value={waveform.end_column} onChange={(e) => updateWaveform(index, "end_column", e.target.value)} />
                      </FormField>
                      <FormField label="Units">
                        <input className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm" value={waveform.units} onChange={(e) => updateWaveform(index, "units", e.target.value)} />
                      </FormField>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addWaveform}
                  className="flex items-center gap-2 text-sm font-medium text-[var(--color-primary)] hover:text-[var(--color-secondary)]"
                >
                  <Plus className="h-4 w-4" /> Add Another Waveform
                </button>
              </div>
            )}
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm hover:bg-[var(--color-card)]">Cancel</button>
            <button type="submit" className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-hover-button)]">Register</button>
          </div>
        </FormModal>
      )}
    </div>
  );
}

function FormModal({ title, onClose, onSubmit, children }: { title: string; onClose: () => void; onSubmit: (e: React.FormEvent) => Promise<void>; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-primary)]/40">
      <div className="w-full max-w-xl rounded-lg bg-[var(--color-surface)] shadow">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
          <h2 className="text-lg font-medium">{title}</h2>
          <button onClick={onClose} className="text-sm text-[var(--color-muted)] hover:text-[var(--color-text-primary)]">Close</button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          {children}
        </form>
      </div>
    </div>
  );
}

function FormField({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
      {label}
      {required && <span className="ml-1 text-red-500">*</span>}
      {children}
    </label>
  );
}
