import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useRunStore } from "../stores/runStore";
import { queryEvaluation, computeInsights, getRowDetail } from "../api/investigation";
import { DataTable } from "../components/DataTable";
import { Modal } from "../components/Modal";
import { formatNumber } from "../lib/format";
import type { RowDetail } from "../api/investigation";

export function Investigation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { selected } = useRunStore();
  const [insights, setInsights] = useState<any>(null);
  const [rows, setRows] = useState<Array<Record<string, any>>>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState("all");
  const [selectedRow, setSelectedRow] = useState<RowDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    computeInsights(Number(id))
      .then((data) => setInsights(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    queryEvaluation(Number(id), { preset, limit, offset })
      .then((result) => {
        setRows(result.rows);
        setTotal(result.total);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, preset, offset]);

  const columns = useMemo(() => {
    if (!rows.length) return [];
    return Object.keys(rows[0]).map((key) => ({
      header: key,
      accessor: (row: Record<string, any>) => String(row[key] ?? "—"),
    }));
  }, [rows]);

  const onRowClick = async (row: Record<string, any>) => {
    if (!id) return;
    const index = rows.indexOf(row);
    if (index < 0) return;
    const detail = await getRowDetail(Number(id), offset + index);
    setSelectedRow(detail);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(`/runs/${id}`)} className="text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4 inline mr-1" /> Back to run
        </button>
        <h1 className="text-2xl font-semibold text-gray-900">{selected?.model_name ?? "Investigation"}</h1>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {insights && (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Stat label="Accuracy" value={insights.accuracy != null ? `${(insights.accuracy * 100).toFixed(1)}%` : "—"} />
          <Stat label="Correct" value={String(insights.correct_count)} />
          <Stat label="Incorrect" value={String(insights.incorrect_count)} />
          <Stat label="Total" value={String(insights.total_rows)} />
        </section>
      )}

      <section className="rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Filter:</label>
          <select value={preset} onChange={(e) => { setPreset(e.target.value); setOffset(0); }} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
            <option value="all">All</option>
            <option value="correct">Correct</option>
            <option value="incorrect">Incorrect</option>
            <option value="false_positive">False Positive</option>
            <option value="false_negative">False Negative</option>
          </select>
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-500">Querying…</div>
          ) : (
            <DataTable
              columns={columns as any}
              data={rows}
              onRowClick={onRowClick}
              empty={<p className="p-8 text-center text-sm text-gray-500">No rows match the current filter.</p>}
            />
          )}
        </div>

        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-gray-600">{formatNumber(total)} total</span>
          <div className="flex gap-2">
            <button
              disabled={offset === 0}
              onClick={() => setOffset((o) => Math.max(0, o - limit))}
              className="rounded-md border border-gray-300 px-3 py-1 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              disabled={offset + limit >= total}
              onClick={() => setOffset((o) => o + limit)}
              className="rounded-md border border-gray-300 px-3 py-1 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {selectedRow && (
        <Modal title="Row Detail" onClose={() => setSelectedRow(null)} maxWidth="max-w-3xl">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Evaluation Row</h3>
              <pre className="mt-2 rounded-md border border-gray-200 bg-gray-50 p-4 text-sm overflow-auto max-h-96">
                {JSON.stringify(selectedRow.evaluation_row, null, 2)}
              </pre>
            </div>
            {selectedRow.dataset_row && (
              <div>
                <h3 className="text-sm font-medium text-gray-900">Dataset Row</h3>
                <pre className="mt-2 rounded-md border border-gray-200 bg-gray-50 p-4 text-sm overflow-auto max-h-96">
                  {JSON.stringify(selectedRow.dataset_row, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}
