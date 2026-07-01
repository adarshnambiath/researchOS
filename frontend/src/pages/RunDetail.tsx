import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useRunStore } from "../stores/runStore";
import { CodeBlock } from "../components/CodeBlock";
import { formatDate, formatBytes } from "../lib/format";

export function RunDetail() {
  const { id } = useParams();
  const { selected, outputItems, loading, error, loadOne, loadOutputs, clearSelected } = useRunStore();

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/runs" className="text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4 inline mr-1" /> Back
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{selected.model_name}</h1>
          <p className="text-sm text-gray-600">{selected.experiment_name} · {outputItems.length} output files</p>
        </div>
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
    </div>
  );
}
