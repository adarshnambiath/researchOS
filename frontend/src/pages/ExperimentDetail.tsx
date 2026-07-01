import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import { useExperimentStore } from "../stores/experimentStore";
import { useRunStore } from "../stores/runStore";

import { formatDate } from "../lib/format";

export function ExperimentDetail() {
  const { id } = useParams();
  const { selected, loading, error, loadOne, clearSelected } = useExperimentStore();
  const { load, create } = useRunStore();

  useEffect(() => {
    if (id) {
      loadOne(Number(id));
      load(Number(id));
    }
    return () => clearSelected();
  }, [id, loadOne, clearSelected, load]);

  if (loading) return <div className="p-6 text-sm text-gray-500">Loading…</div>;
  if (error) return <div className="p-6 text-sm text-red-600">{error}</div>;
  if (!selected) return <div className="p-6 text-sm text-gray-500">Experiment not found.</div>;

  const onCreateRun = async () => {
    const modelName = prompt("Model name:");
    if (!modelName) return;
    await create({ experiment_id: selected.id, model_name: modelName });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/experiments" className="text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4 inline mr-1" /> Back
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{selected.name}</h1>
          <p className="text-sm text-gray-600">{selected.task} · {selected.run_count} runs</p>
        </div>
      </div>

      <section className="rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">Details</h3>
          <button onClick={onCreateRun} className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
            <Plus className="h-4 w-4" /> New Run
          </button>
        </div>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-gray-500">Dataset</dt>
            <dd className="mt-1 text-sm text-gray-900">{selected.dataset_name}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Task</dt>
            <dd className="mt-1 text-sm text-gray-900">{selected.task}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-gray-500">Description</dt>
            <dd className="mt-1 text-sm text-gray-900">{selected.description || "—"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-gray-500">Objective</dt>
            <dd className="mt-1 text-sm text-gray-900">{selected.objective || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Created</dt>
            <dd className="mt-1 text-sm text-gray-900">{formatDate(selected.created_at)}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
