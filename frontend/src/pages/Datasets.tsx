import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useDatasetStore } from "../stores/datasetStore";
import { DataTable } from "../components/DataTable";
import { EmptyState } from "../components/EmptyState";

export function Datasets() {
  const { items, loading, error, load, create, remove } = useDatasetStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    source_path: "",
    description: "",
    modality: "tabular",
    label_column: "",
    sample_id_column: "",
  });

  useEffect(() => {
    load();
  }, [load]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await create({
      name: form.name,
      source_path: form.source_path,
      description: form.description || undefined,
      modality: form.modality,
      label_column: form.label_column || undefined,
      sample_id_column: form.sample_id_column || undefined,
    });
    setOpen(false);
    setForm({ name: "", source_path: "", description: "", modality: "tabular", label_column: "", sample_id_column: "" });
  };

  const onRemove = async (id: number) => {
    if (!confirm("Delete this dataset registration? Source file will not be deleted.")) return;
    await remove(id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Datasets</h1>
          <p className="mt-1 text-sm text-gray-600">Registered data sources for model evaluation.</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          <Plus className="h-4 w-4" /> Register Dataset
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <div className="p-8 text-center text-sm text-gray-500">Loading datasets…</div>
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
                  className="text-gray-400 hover:text-red-600"
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
              <button onClick={() => setOpen(true)} className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">Register Dataset</button>
            } />
          }
        />
      )}

      {open && (
        <FormModal title="Register Dataset" onClose={() => setOpen(false)} onSubmit={onSubmit}>
          <FormField label="Name" required>
            <input className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FormField>
          <FormField label="Source Path" required>
            <input className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.source_path} onChange={(e) => setForm({ ...form, source_path: e.target.value })} placeholder="/absolute/path/to/data.csv" />
          </FormField>
          <FormField label="Description">
            <textarea className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Modality">
              <input className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.modality} onChange={(e) => setForm({ ...form, modality: e.target.value })} />
            </FormField>
            <FormField label="Label Column">
              <input className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.label_column} onChange={(e) => setForm({ ...form, label_column: e.target.value })} />
            </FormField>
          </div>
          <FormField label="Sample ID Column">
            <input className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.sample_id_column} onChange={(e) => setForm({ ...form, sample_id_column: e.target.value })} />
          </FormField>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">Cancel</button>
            <button type="submit" className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">Register</button>
          </div>
        </FormModal>
      )}
    </div>
  );
}

function FormModal({ title, onClose, onSubmit, children }: { title: string; onClose: () => void; onSubmit: (e: React.FormEvent) => Promise<void>; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-xl rounded-lg bg-white shadow">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-medium">{title}</h2>
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-900">Close</button>
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
    <label className="block text-sm font-medium text-gray-700">
      {label}
      {required && <span className="ml-1 text-red-500">*</span>}
      {children}
    </label>
  );
}
