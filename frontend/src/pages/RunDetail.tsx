import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Pencil } from "lucide-react";
import { useRunStore } from "../stores/runStore";
import { CodeBlock } from "../components/CodeBlock";
import { FormField } from "../components/FormField";
import { Modal } from "../components/Modal";
import { formatDate, formatBytes } from "../lib/format";

export function RunDetail() {
  const { id } = useParams();
  const { selected, outputItems, loading, error, loadOne, loadOutputs, clearSelected, update } = useRunStore();

  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({
    model_name: "",
    notes: "",
    seed: "",
    git_commit: "",
    repository_url: "",
    entry_point: "",
    framework: "",
    framework_version: "",
    python_version: "",
    sdk_version: "",
    execution_device: "",
  });

  useEffect(() => {
    if (id) {
      loadOne(Number(id));
      loadOutputs(Number(id));
    }
    return () => clearSelected();
  }, [id, loadOne, loadOutputs, clearSelected]);

  if (loading) return <div className="p-6 text-sm text-gray-500">Loading…</div>;
  if (error) return <div className="p-6 text-sm text-red-600">{error}</div>;
  if (!selected) return <div className="p-6 text-sm text-gray-500">Run not found.</div>;

  const codeSnippet = selected.output_directory
    ? `output_dir = r"${selected.output_directory}"
research_os.write_evaluation(output_dir, y_true, y_pred, sample_ids=ids)
research_os.write_metrics(output_dir, {accuracy: 0.9, f1: 0.88})
research_os.write_artifacts(output_dir, {model: "model.pkl", plot: "plot.png"})`
    : "# Output directory unavailable";

  const openEdit = () => {
    setForm({
      model_name: selected.model_name,
      notes: selected.notes || "",
      seed: selected.seed != null ? String(selected.seed) : "",
      git_commit: selected.git_commit || "",
      repository_url: selected.repository_url || "",
      entry_point: selected.entry_point || "",
      framework: selected.framework || "",
      framework_version: selected.framework_version || "",
      python_version: selected.python_version || "",
      sdk_version: selected.sdk_version || "",
      execution_device: selected.execution_device || "",
    });
    setEditOpen(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await update(selected.id, {
      model_name: form.model_name,
      notes: form.notes || undefined,
      seed: form.seed ? Number(form.seed) : undefined,
      git_commit: form.git_commit || undefined,
      repository_url: form.repository_url || undefined,
      entry_point: form.entry_point || undefined,
      framework: form.framework || undefined,
      framework_version: form.framework_version || undefined,
      python_version: form.python_version || undefined,
      sdk_version: form.sdk_version || undefined,
      execution_device: form.execution_device || undefined,
    });
    setEditOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to={`/experiments/${(selected as any).experiment_id}`} className="text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4 inline mr-1" /> Back
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-gray-900">{selected.model_name}</h1>
          <p className="text-sm text-gray-600">{selected.experiment_name} · {outputItems.length} output files</p>
        </div>
        <button onClick={openEdit} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50">
          <Pencil className="h-4 w-4" /> Edit
        </button>
      </div>

      <section className="rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-900">Metadata</h3>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-gray-500">Experiment</dt>
            <dd className="mt-1 text-sm text-gray-900">{selected.experiment_name}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Created</dt>
            <dd className="mt-1 text-sm text-gray-900">{formatDate(selected.created_at)}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Seed</dt>
            <dd className="mt-1 text-sm text-gray-900">{selected.seed ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Framework</dt>
            <dd className="mt-1 text-sm text-gray-900">{selected.framework ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Git Commit</dt>
            <dd className="mt-1 text-sm text-gray-900">{selected.git_commit ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Output Directory</dt>
            <dd className="mt-1 text-sm text-gray-900 break-all">{selected.output_directory ?? "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-900">SDK Integration</h3>
        <p className="mt-2 text-sm text-gray-600">Place the following files in the output directory above:</p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-gray-700">
          <li><code className="rounded bg-gray-50 px-1 py-0.5 text-xs">evaluation.parquet</code> — Row-level predictions with ground truth.</li>
          <li><code className="rounded bg-gray-50 px-1 py-0.5 text-xs">metrics.json</code> — Aggregate scores (accuracy, F1, etc.).</li>
          <li><code className="rounded bg-gray-50 px-1 py-0.5 text-xs">artifacts.json</code> — References to checkpoints, plots, logs.</li>
        </ul>
        <div className="mt-4">
          <CodeBlock code={codeSnippet} language="python" />
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-900">Outputs</h3>
        {outputItems.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No recognized files found.</p>
        ) : (
          <div className="mt-4 divide-y divide-gray-100">
            {outputItems.map((o) => (
              <div key={o.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{o.filename}</p>
                  <p className="text-xs text-gray-500">{o.type} · {formatBytes(o.file_size)}</p>
                </div>
                <span className="text-xs text-gray-400">{formatDate(o.uploaded_at)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {editOpen && (
        <Modal title="Edit Run" onClose={() => setEditOpen(false)}>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField label="Model Name" required>
              <input className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.model_name} onChange={(e) => setForm({ ...form, model_name: e.target.value })} required />
            </FormField>
            <FormField label="Notes">
              <textarea className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </FormField>
            <FormField label="Seed">
              <input type="number" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.seed} onChange={(e) => setForm({ ...form, seed: e.target.value })} />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Framework">
                <input className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.framework} onChange={(e) => setForm({ ...form, framework: e.target.value })} />
              </FormField>
              <FormField label="Execution Device">
                <input className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.execution_device} onChange={(e) => setForm({ ...form, execution_device: e.target.value })} />
              </FormField>
            </div>
            <FormField label="Git Commit">
              <input className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.git_commit} onChange={(e) => setForm({ ...form, git_commit: e.target.value })} />
            </FormField>
            <FormField label="Repository URL">
              <input className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.repository_url} onChange={(e) => setForm({ ...form, repository_url: e.target.value })} />
            </FormField>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setEditOpen(false)} className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">Cancel</button>
              <button type="submit" className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
