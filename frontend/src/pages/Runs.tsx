import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useRunStore } from "../stores/runStore";
import { useExperimentStore } from "../stores/experimentStore";
import { DataTable } from "../components/DataTable";
import { EmptyState } from "../components/EmptyState";

export function Runs() {
  const { items, loading, error, load, create, remove } = useRunStore();
  const { items: experiments, load: loadExperiments } = useExperimentStore();
  const [open, setOpen] = useState(false);
  const [experimentFilter, setExperimentFilter] = useState<string>("all");
  const [form, setForm] = useState({ experiment_id: "", model_name: "", notes: "", seed: "" });

  useEffect(() => {
    load(experimentFilter === "all" ? undefined : Number(experimentFilter));
    loadExperiments();
  }, [load, experimentFilter, loadExperiments]);

  const filteredItems = experimentFilter === "all" ? items : items.filter((i) => i.experiment_id === Number(experimentFilter));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await create({
      experiment_id: Number(form.experiment_id),
      model_name: form.model_name,
      notes: form.notes || undefined,
      seed: form.seed ? Number(form.seed) : undefined,
    });
    setOpen(false);
    setForm({ experiment_id: "", model_name: "", notes: "", seed: "" });
  };

  const onRemove = async (id: number) => {
    if (!confirm("Delete this run?")) return;
    await remove(id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Runs</h1>
          <p className="mt-1 text-sm text-gray-600">Execution attempts for your experiments.</p>
        </div>
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
          <Plus className="h-4 w-4" /> New Run
        </button>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Experiment:</label>
        <select value={experimentFilter} onChange={(e) => setExperimentFilter(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="all">All</option>
          {experiments.map((exp) => (
            <option key={exp.id} value={String(exp.id)}>{exp.name}</option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <div className="p-8 text-center text-sm text-gray-500">Loading runs…</div>
      ) : (
        <DataTable
          columns={[
            { header: "ID", accessor: "id", width: "80px" },
            { header: "Model", accessor: "model_name" },
            { header: "Framework", accessor: "framework", width: "140px" },
            { header: "Seed", accessor: "seed" as any, width: "100px" },
            { header: "Has Eval", accessor: "has_evaluation" as any, width: "120px" },
            { header: "Created", accessor: "created_at", width: "180px" },
            {
              header: "",
              accessor: (row: any) => (
                <button onClick={(e) => { e.stopPropagation(); onRemove(row.id); }} className="text-gray-400 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              ),
              width: "60px",
            },
          ]}
          data={filteredItems as never[]}
          onRowClick={(row) => (window.location.href = `/experiments/${(row as any).experiment_id}/runs/${(row as any).id}`)}
          empty={<EmptyState title="No runs" description="Create a run to produce outputs." />}
        />
      )}

      {open && (
        <FormModal title="New Run" onClose={() => setOpen(false)} onSubmit={onSubmit}>
          <FormField label="Experiment" required>
            <select className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.experiment_id} onChange={(e) => setForm({ ...form, experiment_id: e.target.value })}>
              <option value="">Select an experiment</option>
              {experiments.map((exp) => (
                <option key={exp.id} value={String(exp.id)}>{exp.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Model Name" required>
            <input className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.model_name} onChange={(e) => setForm({ ...form, model_name: e.target.value })} />
          </FormField>
          <FormField label="Notes">
            <textarea className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </FormField>
          <FormField label="Seed">
            <input type="number" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.seed} onChange={(e) => setForm({ ...form, seed: e.target.value })} />
          </FormField>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">Cancel</button>
            <button type="submit" className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">Create</button>
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
