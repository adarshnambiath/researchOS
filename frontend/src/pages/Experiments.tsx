import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { useExperimentStore } from "../stores/experimentStore";
import { useDatasetStore } from "../stores/datasetStore";
import { DataTable } from "../components/DataTable";
import { EmptyState } from "../components/EmptyState";

export function Experiments() {
  const { items, loading, error, load, create, remove } = useExperimentStore();
  const { items: datasets, load: loadDatasets } = useDatasetStore();
  const [open, setOpen] = useState(false);
  const [datasetFilter, setDatasetFilter] = useState<string>("all");
  const [form, setForm] = useState({ dataset_id: "", name: "", description: "", objective: "", task: "classification" });

  useEffect(() => { load(); loadDatasets(); }, [load, loadDatasets]);

  const filteredItems = datasetFilter === "all" ? items : items.filter((i) => i.dataset_id === Number(datasetFilter));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await create({ dataset_id: Number(form.dataset_id), name: form.name, description: form.description || undefined, objective: form.objective || undefined, task: form.task });
    setOpen(false);
    setForm({ dataset_id: "", name: "", description: "", objective: "", task: "classification" });
  };

  const onRemove = async (id: number) => {
    if (!confirm("Delete this experiment?")) return;
    await remove(id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-(--color-text-primary)">Experiments</h1>
          <p className="mt-1 text-sm text-(--color-text-secondary)">Group runs under a dataset and research question.</p>
        </div>
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-(--color-primary) px-4 py-2 text-sm font-medium text-white hover:bg-(--color-hover-button)">
          <Plus className="h-4 w-4" /> New Experiment
        </button>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-(--color-text-secondary)">Filter by dataset:</label>
        <select value={datasetFilter} onChange={(e) => setDatasetFilter(e.target.value)} className="rounded-md border border-(--color-border) px-3 py-2 text-sm">
          <option value="all">All</option>
          {datasets.map((d) => (
            <option key={d.id} value={String(d.id)}>{d.name}</option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <div className="p-8 text-center text-sm text-(--color-muted)">Loading experiments…</div>
      ) : (
        <DataTable
          columns={[
            { header: "ID", accessor: "id", width: "80px" },
            { header: "Name", accessor: "name" },
            { header: "Task", accessor: "task", width: "140px" },
            { header: "Runs", accessor: "run_count", width: "80px" },
            { header: "Created", accessor: "created_at" as any, width: "180px" },
            {
              header: "",
              accessor: (row: any) => (
                <button onClick={(e) => { e.stopPropagation(); onRemove(row.id); }} className="text-(--color-muted) hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              ),
              width: "60px",
            },
          ]}
          data={filteredItems as never[]}
          onRowClick={(row) => (window.location.href = `/experiments/${(row as any).id}`)}
          empty={<EmptyState title="No experiments" description="Create an experiment under a dataset." />}
        />
      )}

      {open && (
        <FormModal title="New Experiment" onClose={() => setOpen(false)} onSubmit={onSubmit}>
          <FormField label="Dataset" required>
            <select className="mt-1 w-full rounded-md border border-(--color-border) px-3 py-2 text-sm" value={form.dataset_id} onChange={(e) => setForm({ ...form, dataset_id: e.target.value })}>
              <option value="">Select a dataset</option>
              {datasets.map((d) => (
                <option key={d.id} value={String(d.id)}>{d.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Name" required>
            <input className="mt-1 w-full rounded-md border border-(--color-border) px-3 py-2 text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FormField>
          <FormField label="Description">
            <textarea className="mt-1 w-full rounded-md border border-(--color-border) px-3 py-2 text-sm" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Objective">
              <textarea className="mt-1 w-full rounded-md border border-(--color-border) px-3 py-2 text-sm" value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} />
            </FormField>
            <FormField label="Task">
              <input className="mt-1 w-full rounded-md border border-(--color-border) px-3 py-2 text-sm" value={form.task} onChange={(e) => setForm({ ...form, task: e.target.value })} />
            </FormField>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-(--color-border) px-4 py-2 text-sm hover:bg-(--color-card)">Cancel</button>
            <button type="submit" className="rounded-md bg-(--color-primary) px-4 py-2 text-sm font-medium text-white hover:bg-(--color-hover-button)">Create</button>
          </div>
        </FormModal>
      )}
    </div>
  );
}

function FormModal({ title, onClose, onSubmit, children }: { title: string; onClose: () => void; onSubmit: (e: React.FormEvent) => Promise<void>; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-(--color-primary)/40">
      <div className="w-full max-w-xl rounded-lg bg-(--color-surface) shadow">
        <div className="flex items-center justify-between border-b border-(--color-border) px-6 py-4">
          <h2 className="text-lg font-medium">{title}</h2>
          <button onClick={onClose} className="text-sm text-(--color-muted) hover:text-(--color-text-primary)">Close</button>
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
    <label className="block text-sm font-medium text-(--color-text-secondary)">
      {label}
      {required && <span className="ml-1 text-red-500">*</span>}
      {children}
    </label>
  );
}
