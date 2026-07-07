import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Plus, Pencil } from "lucide-react";
import { useExperimentStore } from "../stores/experimentStore";
import { useRunStore } from "../stores/runStore";
import { Modal } from "../components/Modal";
import { FormField } from "../components/FormField";
import { formatDate } from "../lib/format";
import { useNavigate } from "react-router-dom";

export function ExperimentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { selected, loading, error, loadOne, clearSelected, update } =
    useExperimentStore();
  const { load, create, items: runs } = useRunStore();

  const [editOpen, setEditOpen] = useState(false);
  const [runOpen, setRunOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    objective: "",
    task: "",
  });
  const [runForm, setRunForm] = useState({
    model_name: "",
    notes: "",
    seed: "",
  });

  useEffect(() => {
    if (id) {
      loadOne(Number(id));
      load(Number(id));
    }
    return () => clearSelected();
  }, [id, loadOne, clearSelected, load]);

  if (loading) return <div className="p-6 text-sm text-[var(--color-muted)]">Loading…</div>;
  if (error) return <div className="p-6 text-sm text-red-600">{error}</div>;
  if (!selected)
    return (
      <div className="p-6 text-sm text-[var(--color-muted)]">Experiment not found.</div>
    );

  const openEdit = () => {
    setEditForm({
      name: selected.name,
      description: selected.description || "",
      objective: selected.objective || "",
      task: selected.task,
    });
    setEditOpen(true);
  };

  const onEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await update(selected.id, {
      name: editForm.name,
      description: editForm.description || undefined,
      objective: editForm.objective || undefined,
      task: editForm.task,
    });
    setEditOpen(false);
  };

  const onCreateRun = async (e: React.FormEvent) => {
    e.preventDefault();
    await create({
      experiment_id: selected.id,
      model_name: runForm.model_name,
      notes: runForm.notes || undefined,
      seed: runForm.seed ? Number(runForm.seed) : undefined,
    });
    setRunForm({ model_name: "", notes: "", seed: "" });
    setRunOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/experiments"
          className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        >
          <ArrowLeft className="h-4 w-4 inline mr-1" /> Back
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
            {selected.name}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {selected.task} · {runs.length} runs
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={openEdit}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-card)]"
          >
            <Pencil className="h-4 w-4" /> Edit
          </button>
          <button
            onClick={() => setRunOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-hover)]"
          >
            <Plus className="h-4 w-4" /> New Run
          </button>
        </div>
      </div>

      <section className="rounded-lg border border-[var(--color-border)] p-6">
        <h3 className="text-sm font-medium text-[var(--color-text-primary)]">Details</h3>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-[var(--color-muted)]">Dataset</dt>
            <dd className="mt-1 text-sm text-[var(--color-text-primary)]">
              {selected.dataset_name}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-muted)]">Task</dt>
            <dd className="mt-1 text-sm text-[var(--color-text-primary)]">{selected.task}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-[var(--color-muted)]">Description</dt>
            <dd className="mt-1 text-sm text-[var(--color-text-primary)]">
              {selected.description || "—"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-[var(--color-muted)]">Objective</dt>
            <dd className="mt-1 text-sm text-[var(--color-text-primary)]">
              {selected.objective || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-muted)]">Created</dt>
            <dd className="mt-1 text-sm text-[var(--color-text-primary)]">
              {formatDate(selected.created_at)}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-[var(--color-border)] p-6">
        <h3 className="text-sm font-medium text-[var(--color-text-primary)]">Runs</h3>
        {runs.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--color-muted)]">No runs yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--color-card)]">
                <tr>
                  <th className="px-4 py-2 font-medium text-[var(--color-text-secondary)]">ID</th>
                  <th className="px-4 py-2 font-medium text-[var(--color-text-secondary)]">Model</th>
                  <th className="px-4 py-2 font-medium text-[var(--color-text-secondary)]">
                    Framework
                  </th>
                  <th className="px-4 py-2 font-medium text-[var(--color-text-secondary)]">Seed</th>
                  <th className="px-4 py-2 font-medium text-[var(--color-text-secondary)]">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {runs.map((run) => (
                  <tr
                    key={run.id}
                    className="cursor-pointer hover:bg-[var(--color-card)]"
                    onClick={() => navigate(`/experiments/${selected.id}/runs/${run.id}`)}
                  >
                    <td className="px-4 py-2">{run.id}</td>
                    <td className="px-4 py-2">{run.model_name}</td>
                    <td className="px-4 py-2">{run.framework ?? "—"}</td>
                    <td className="px-4 py-2">{run.seed ?? "—"}</td>
                    <td className="px-4 py-2">{formatDate(run.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editOpen && (
        <Modal title="Edit Experiment" onClose={() => setEditOpen(false)}>
          <form onSubmit={onEditSubmit} className="space-y-4">
            <FormField label="Name" required>
              <input
                className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
                required
              />
            </FormField>
            <FormField label="Description">
              <textarea
                className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
                value={editForm.description}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
              />
            </FormField>
            <FormField label="Objective">
              <textarea
                className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
                value={editForm.objective}
                onChange={(e) =>
                  setEditForm({ ...editForm, objective: e.target.value })
                }
              />
            </FormField>
            <FormField label="Task">
              <input
                className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
                value={editForm.task}
                onChange={(e) =>
                  setEditForm({ ...editForm, task: e.target.value })
                }
              />
            </FormField>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm hover:bg-[var(--color-card)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-hover)]"
              >
                Save
              </button>
            </div>
          </form>
        </Modal>
      )}

      {runOpen && (
        <Modal title="New Run" onClose={() => setRunOpen(false)}>
          <form onSubmit={onCreateRun} className="space-y-4">
            <FormField label="Model Name" required>
              <input
                className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
                value={runForm.model_name}
                onChange={(e) =>
                  setRunForm({ ...runForm, model_name: e.target.value })
                }
                required
              />
            </FormField>
            <FormField label="Notes">
              <textarea
                className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
                value={runForm.notes}
                onChange={(e) =>
                  setRunForm({ ...runForm, notes: e.target.value })
                }
              />
            </FormField>
            <FormField label="Seed">
              <input
                type="number"
                className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
                value={runForm.seed}
                onChange={(e) =>
                  setRunForm({ ...runForm, seed: e.target.value })
                }
              />
            </FormField>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRunOpen(false)}
                className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm hover:bg-[var(--color-card)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-hover)]"
              >
                Create
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
