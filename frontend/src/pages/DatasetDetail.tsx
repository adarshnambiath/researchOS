import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useDatasetStore } from "../stores/datasetStore";

import { formatDate } from "../lib/format";

export function DatasetDetail() {
  const { id } = useParams();
  const { selected, loading, error, loadOne, clearSelected } = useDatasetStore();

  useEffect(() => {
    if (id) loadOne(Number(id));
    return () => clearSelected();
  }, [id, loadOne, clearSelected]);

  if (loading) return <div className="p-6 text-sm text-gray-500">Loading…</div>;
  if (error) return <div className="p-6 text-sm text-red-600">{error}</div>;
  if (!selected) return <div className="p-6 text-sm text-gray-500">Dataset not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/datasets" className="text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4 inline mr-1" />
          Back
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{selected.name}</h1>
          <p className="text-sm text-gray-600">{selected.modality} · {(selected.preview_rows?.length ?? 0)} of {selected.row_count} rows shown</p>
        </div>
      </div>

      <section className="rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-900">Details</h3>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-gray-500">Source Path</dt>
            <dd className="mt-1 text-sm text-gray-900 break-all">{selected.source_path}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Label Column</dt>
            <dd className="mt-1 text-sm text-gray-900">{selected.label_column ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Sample ID Column</dt>
            <dd className="mt-1 text-sm text-gray-900">{selected.sample_id_column ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Created</dt>
            <dd className="mt-1 text-sm text-gray-900">{formatDate(selected.created_at)}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-900">Schema</h3>
        <div className="mt-4 grid grid-cols-1 gap-2">
          {selected.columns?.map((col) => (
            <div key={col} className="flex items-center justify-between rounded-md border border-gray-100 px-3 py-2">
              <span className="text-sm text-gray-900">{col}</span>
              <span className="text-xs text-gray-500">{selected.dtypes?.[col]}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-900">Preview</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                {selected.columns?.map((col) => (
                  <th key={col} className="px-3 py-2 font-medium text-gray-600">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {selected.preview_rows?.map((row, idx) => (
                <tr key={idx}>
                  {selected.columns?.map((col) => (
                    <td key={col} className="px-3 py-2 text-gray-900">
                      {String(row[col] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
