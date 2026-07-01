import { useEffect } from "react";
import { Link } from "react-router-dom";
import type { DatasetListItem } from "../stores/datasetStore";
import type { ExperimentListItem } from "../stores/experimentStore";
import type { RunListItem } from "../stores/runStore";
import { useDatasetStore } from "../stores/datasetStore";
import { useExperimentStore } from "../stores/experimentStore";
import { useRunStore } from "../stores/runStore";
import { DataTable } from "../components/DataTable";
import { EmptyState } from "../components/EmptyState";

export function Home() {
  const { items: datasets, load: loadDatasets } = useDatasetStore();
  const { items: experiments, load: loadExperiments } = useExperimentStore();
  const { items: runs, load: loadRuns } = useRunStore();

  useEffect(() => {
    loadDatasets();
    loadExperiments();
    loadRuns();
  }, [loadDatasets, loadExperiments, loadRuns]);

  const recentDatasets = datasets.slice(0, 5);
  const recentExperiments = experiments.slice(0, 5);
  const recentRuns = runs.slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Welcome to Research OS</h1>
        <p className="mt-2 text-sm text-gray-600">
          Index, organize, and investigate experiment outputs without leaving your workspace.
        </p>
      </div>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Recent Datasets</h2>
          <Link to="/datasets" className="text-sm text-gray-600 hover:text-gray-900">
            View all
          </Link>
        </div>
        {recentDatasets.length === 0 ? (
          <EmptyState title="No datasets yet" description="Register your first dataset to get started." />
        ) : (
          <DatasetsTable datasets={recentDatasets} />
        )}
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Recent Experiments</h2>
          <Link to="/experiments" className="text-sm text-gray-600 hover:text-gray-900">
            View all
          </Link>
        </div>
        {recentExperiments.length === 0 ? (
          <EmptyState title="No experiments yet" description="Create an experiment under a dataset." />
        ) : (
          <ExperimentsTable experiments={recentExperiments} />
        )}
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Recent Runs</h2>
          <Link to="/runs" className="text-sm text-gray-600 hover:text-gray-900">
            View all
          </Link>
        </div>
        {recentRuns.length === 0 ? (
          <EmptyState title="No runs yet" description="Create a run to start producing outputs." />
        ) : (
          <RunsTable runs={recentRuns} />
        )}
      </section>
    </div>
  );
}

function DatasetsTable({ datasets }: { datasets: DatasetListItem[] }) {
  return (
    <DataTable
      columns={[
        { header: "ID", accessor: "id", width: "80px" },
        { header: "Name", accessor: "name" },
        { header: "Modality", accessor: "modality", width: "140px" },
        { header: "Rows", accessor: "row_count", width: "120px" },
        { header: "Created", accessor: "created_at" as any, width: "180px" },
      ]}
      data={datasets as never[]}
      onRowClick={(row) => (window.location.href = `/datasets/${(row as any).id}`)}
    />
  );
}

function ExperimentsTable({ experiments }: { experiments: ExperimentListItem[] }) {
  return (
    <DataTable
      columns={[
        { header: "ID", accessor: "id", width: "80px" },
        { header: "Name", accessor: "name" },
        { header: "Task", accessor: "task", width: "140px" },
        { header: "Runs", accessor: "run_count", width: "80px" },
        { header: "Created", accessor: "created_at" as any, width: "180px" },
      ]}
      data={experiments as never[]}
      onRowClick={(row) => (window.location.href = `/experiments/${(row as any).id}`)}
    />
  );
}

function RunsTable({ runs }: { runs: RunListItem[] }) {
  return (
    <DataTable
      columns={[
        { header: "ID", accessor: "id", width: "80px" },
        { header: "Model", accessor: "model_name" },
        { header: "Framework", accessor: "framework", width: "140px" },
        { header: "Seed", accessor: "seed" as any, width: "100px" },
        { header: "Has Eval", accessor: "has_evaluation" as any, width: "120px" },
        { header: "Created", accessor: "created_at" as any, width: "180px" },
      ]}
      data={runs as never[]}
      onRowClick={(row) => (window.location.href = `/runs/${(row as any).id}`)}
    />
  );
}
