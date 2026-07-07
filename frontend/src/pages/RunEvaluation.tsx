import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Search, ChevronUp, ChevronDown, Check, X } from "lucide-react";
import { fetchEvaluation, fetchMetrics, fetchArtifacts } from "../api/evaluation";
import { formatNumber } from "../lib/format";

/* ───────────────────────────────────────────────────────────
   Types
   ─────────────────────────────────────────────────────────── */

interface MetricsData {
  [key: string]: unknown;
}

interface EvaluationRow {
  [key: string]: unknown;
}

interface ArtifactEntry {
  name?: string;
  type: string;
  path: string;
  timestamp?: string;
  available: boolean;
  [key: string]: unknown;
}

/* ───────────────────────────────────────────
   Helpers
   ─────────────────────────────────────────── */

/** Guess whether a column contains numeric values. */
function isNumeric(values: any[]): boolean {
  if (values.length === 0) return false;
  const sample = values.slice(0, 50);
  return sample.some((v) => typeof v === "number" || (typeof v === "string" && !Number.isNaN(Number(v)) && v.trim() !== ""));
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") {
    if (Number.isInteger(value)) return formatNumber(value);
    if (Math.abs(value) < 0.01) return value.toExponential(3);
    return value.toFixed(4);
  }
  if (typeof value === "boolean") return value ? "True" : "False";
  return String(value);
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] p-4">
      <p className="text-xs text-[var(--color-muted)] uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-[var(--color-text-primary)] truncate" title={value}>{value}</p>
    </div>
  );
}

/** Render a flat confusion matrix as an HTML table. */
function ConfusionMatrix({ matrix, labels }: { matrix: number[][]; labels: string[] }) {
  const rows = labels;
  const grid: Record<string, Record<string, number>> = {};

  for (let i = 0; i < labels.length; i++) {
    grid[labels[i]] = {};
    for (let j = 0; j < labels.length; j++) {
      grid[labels[i]][labels[j]] = matrix[i]?.[j] ?? 0;
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-max text-xs border-collapse">
        <thead>
          <tr>
            <th className="p-1" />
            {rows.map((c) => (
              <th key={c} className="p-1 font-medium text-[var(--color-muted)] text-center">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r}>
              <td className="p-1 font-medium text-[var(--color-muted)] text-right pr-2">{r}</td>
              {rows.map((c) => {
                const val = grid[r]?.[c] ?? 0;
                const allVals = Object.values(grid).flatMap((row) => Object.values(row));
                const maxVal = Math.max(...allVals, 1);
                const intensity = maxVal > 0 ? val / maxVal : 0;
                return (
                  <td
                    key={c}
                    className="p-1 text-center rounded"
                    style={{
                      backgroundColor: `rgba(59, 130, 246, ${intensity * 0.35})`,
                      fontWeight: r === c ? 600 : 400,
                    }}
                  >
                    {formatNumber(val)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Expandable JSON viewer for arbitrary nested data. */
function JsonViewer({ data, label }: { data: unknown; label: string }) {
  const [open, setOpen] = useState(false);
  const isObject = data !== null && typeof data === "object";
  return (
    <div className="rounded-lg border border-[var(--color-border)] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-card)]"
      >
        <span>{label}</span>
        {isObject ? (open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />) : null}
      </button>
      {open && (
        <pre className="px-4 pb-3 text-xs text-[var(--color-text-secondary)] overflow-x-auto max-h-96">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

/* ───────────────────────────────────────────────────────────
   Main Page
   ─────────────────────────────────────────────────────────── */

export function RunEvaluation() {
  const { experimentId, runId } = useParams();
  const effectiveId = runId || experimentId;

  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<EvaluationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [evalLoading, setEvalLoading] = useState(true);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [filterColumn, setFilterColumn] = useState<string>("");
  const [filterValue, setFilterValue] = useState("");
  const LIMIT = 100;

  const [artifacts, setArtifacts] = useState<ArtifactEntry[]>([]);
  const [artifactsLoading, setArtifactsLoading] = useState(true);
  const [artifactsError, setArtifactsError] = useState<string | null>(null);

  useEffect(() => {
    if (!effectiveId) return;
    setMetricsLoading(true);
    fetchMetrics(Number(effectiveId))
      .then((data) => setMetrics(data))
      .catch((e) => setMetricsError(e.message))
      .finally(() => setMetricsLoading(false));
  }, [effectiveId]);

  const loadEvaluation = useCallback((newOffset: number) => {
    if (!effectiveId) return;
    setEvalLoading(true);
    fetchEvaluation(Number(effectiveId), LIMIT, newOffset)
      .then((result) => {
        setColumns(result.columns);
        setRows(result.rows);
        setTotal(result.total);
        setOffset(result.offset);
      })
      .catch((e) => setEvalError(e.message))
      .finally(() => setEvalLoading(false));
  }, [effectiveId]);

  useEffect(() => { loadEvaluation(0); }, [loadEvaluation]);

  useEffect(() => {
    if (!effectiveId) return;
    setArtifactsLoading(true);
    fetchArtifacts(Number(effectiveId))
      .then((data) => setArtifacts(Array.isArray(data) ? data : []))
      .catch((e) => setArtifactsError(e.message))
      .finally(() => setArtifactsLoading(false));
  }, [effectiveId]);

  const { scalarMetrics, confusionMatrix, otherMetrics } = useMemo(() => {
    if (!metrics) return { scalarMetrics: {}, confusionMatrix: null, otherMetrics: {} };
    const scalars: Record<string, string> = {};
    let cm: { labels: string[]; matrix: number[][] } | null = null;
    const others: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(metrics)) {
      if (k === "confusion_matrix" && v && typeof v === "object") {
        const obj = v as Record<string, unknown>;
        if (Array.isArray(obj) && Array.isArray(obj[0])) {
          // Backwards compatibility: old format is just a matrix array.
          const arr = obj as number[][];
          const labels = arr.map((_, i) => String(i));
          cm = { labels, matrix: arr };
        } else if (Array.isArray(obj.matrix) && Array.isArray(obj.labels)) {
          cm = {
            labels: (obj.labels as unknown[]).map((l) => String(l)),
            matrix: obj.matrix as number[][],
          };
        }
      } else if (typeof v === "number") {
        scalars[k] = k.toLowerCase().includes("count") ? formatNumber(v) : v.toFixed(v >= 100 ? 0 : v >= 1 ? 3 : 4);
      } else if (typeof v === "string" && !Number.isNaN(Number(v))) {
        scalars[k] = v;
      } else {
        others[k] = v;
      }
    }
    return { scalarMetrics: scalars, confusionMatrix: cm, otherMetrics: others };
  }, [metrics]);

  const displayedRows = useMemo(() => {
    let filtered = [...rows];
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      filtered = filtered.filter((row) => Object.values(row).some((v) => String(v ?? "").toLowerCase().includes(q)));
    }
    if (filterColumn && filterValue.trim()) {
      const q = filterValue.toLowerCase();
      filtered = filtered.filter((row) => String(row[filterColumn] ?? "").toLowerCase().includes(q));
    }
    if (sortColumn) {
      filtered.sort((a, b) => {
        const va = a[sortColumn];
        const vb = b[sortColumn];
        let cmp = 0;
        if (typeof va === "number" && typeof vb === "number") cmp = va - vb;
        else cmp = String(va ?? "").localeCompare(String(vb ?? ""));
        return sortAsc ? cmp : -cmp;
      });
    }
    return filtered;
  }, [rows, searchText, filterColumn, filterValue, sortColumn, sortAsc]);

  const columnConfigs = useMemo(() => {
    return columns.map((col) => ({ key: col, numeric: isNumeric(rows.map((r) => r[col])) }));
  }, [columns, rows]);

  const handleSort = (col: string) => {
    if (sortColumn === col) setSortAsc((a) => !a);
    else { setSortColumn(col); setSortAsc(true); }
  };

  const totalPages = Math.ceil(total / LIMIT);
  const currentPage = Math.floor(offset / LIMIT) + 1;

  if (!effectiveId) return <div className="p-6 text-sm text-[var(--color-muted)]">Run ID not specified.</div>;

  const navUrl = experimentId ? `/experiments/${experimentId}/runs/${runId}` : `/runs/${effectiveId}`;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link to={navUrl} className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
          <ArrowLeft className="h-4 w-4 inline mr-1" /> Back to Run
        </Link>
        <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">Evaluation</h1>
      </div>


      {/* ═══════════════════════════════════════════
         1. METRICS
         ═══════════════════════════════════════════ */}
      <section className="rounded-lg border border-[var(--color-border)] p-6">
        <h2 className="text-sm font-medium text-[var(--color-text-primary)] mb-4">Metrics</h2>
        {metricsLoading && <p className="text-sm text-[var(--color-muted)]">Loading metrics…</p>}
        {metricsError && <p className="text-sm text-red-600">{metricsError}</p>}
        {!metricsLoading && !metricsError && metrics && (
          <div className="space-y-6">
            {Object.keys(scalarMetrics).length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {Object.entries(scalarMetrics).map(([key, val]) => (
                  <MetricCard key={key} label={key.replace(/_/g, " ")} value={val} />
                ))}
              </div>
            )}
            {confusionMatrix && (
              <div>
                <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">Confusion Matrix</h3>
                <ConfusionMatrix matrix={confusionMatrix.matrix} labels={confusionMatrix.labels} />
              </div>
            )}
            {Object.keys(otherMetrics).length > 0 && (
              <div className="space-y-2">
                {Object.entries(otherMetrics).map(([key, val]) => (
                  <JsonViewer key={key} label={key} data={val} />
                ))}
              </div>
            )}
          </div>
        )}
        {!metricsLoading && !metricsError && !metrics && (
          <p className="text-sm text-[var(--color-muted)] italic">No metrics available yet.</p>
        )}
      </section>

{/* ═════════════════════════════──────────
         2. ARTIFACTS
         ═══════════════════════════════════════════ */}
      <section className="rounded-lg border border-[var(--color-border)] p-6">
        <h2 className="text-sm font-medium text-[var(--color-text-primary)] mb-4">Artifacts</h2>
        {artifactsLoading && <p className="text-sm text-[var(--color-muted)]">Loading artifacts…</p>}
        {artifactsError && <p className="text-sm text-red-600">{artifactsError}</p>}
        {!artifactsLoading && !artifactsError && artifacts.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--color-card)]">
                <tr>
                  <th className="px-4 py-2 font-medium text-[var(--color-text-secondary)]">Name</th>
                  <th className="px-4 py-2 font-medium text-[var(--color-text-secondary)]">Type</th>
                  <th className="px-4 py-2 font-medium text-[var(--color-text-secondary)]">Path</th>
                  <th className="px-4 py-2 font-medium text-[var(--color-text-secondary)]">Timestamp</th>
                  <th className="px-4 py-2 font-medium text-[var(--color-text-secondary)]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {artifacts.map((art, idx) => (
                  <tr key={idx} className="hover:bg-[var(--color-card)]">
                    <td className="px-4 py-2 text-[var(--color-text-primary)] font-medium">{art.name || "—"}</td>
                    <td className="px-4 py-2 text-[var(--color-text-primary)]">
                      <code className="rounded bg-[var(--color-card)] px-1 py-0.5 text-xs">{art.type}</code>
                    </td>
                    <td className="px-4 py-2 text-[var(--color-muted)] font-mono text-xs max-w-[300px] truncate" title={art.path}>{art.path}</td>
                    <td className="px-4 py-2 text-[var(--color-muted)] text-xs">{art.timestamp || "—"}</td>
                    <td className="px-4 py-2">
                      {art.available ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          <Check className="h-3 w-3" /> Available
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-hover)] px-2 py-0.5 text-xs font-medium text-[var(--color-muted)]">
                          <X className="h-3 w-3" /> Missing
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!artifactsLoading && !artifactsError && artifacts.length === 0 && (
          <p className="text-sm text-[var(--color-muted)] italic">No artifacts registered yet.</p>
        )}
      </section>
      {/* ═══════════════════════════════════════════
         3. EVALUATION TABLE
         ═══════════════════════════════════════════ */}
      <section className="rounded-lg border border-[var(--color-border)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-[var(--color-text-primary)]">Evaluation Table</h2>
          <span className="text-xs text-[var(--color-muted)]">
            {formatNumber(total)} total rows · page {currentPage} of {Math.max(totalPages, 1)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[var(--color-muted)]" />
            <input type="text" placeholder="Search all columns…" value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full rounded-md border border-[var(--color-border)] pl-8 pr-3 py-2 text-sm" />
          </div>
          <select value={filterColumn} onChange={(e) => setFilterColumn(e.target.value)}
            className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm">
            <option value="">Filter column…</option>
            {columns.map((col) => (<option key={col} value={col}>{col}</option>))}
          </select>
          {filterColumn && (
            <input type="text" placeholder="Filter value…" value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm max-w-[160px]" />
          )}
        </div>

        {evalLoading && <p className="text-sm text-[var(--color-muted)]">Loading evaluation data…</p>}
        {evalError && <p className="text-sm text-red-600">{evalError}</p>}

        {!evalLoading && !evalError && columns.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--color-card)]">
                <tr>
                  {columnConfigs.map((col) => (
                    <th key={col.key}
                      className={`px-4 py-2 font-medium text-[var(--color-text-secondary)] cursor-pointer select-none hover:text-[var(--color-text-primary)] ${col.numeric ? "text-right" : ""}`}
                      onClick={() => handleSort(col.key)}>
                      <span className="inline-flex items-center gap-1">
                        {col.key}
                        {sortColumn === col.key && (sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {displayedRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[var(--color-card)]">
                    {columnConfigs.map((col) => {
                      const val = row[col.key];
                      const display = formatCell(val);
                      const isBool = typeof val === "boolean";
                      return (
                        <td key={col.key}
                          className={`px-4 py-2 ${col.numeric ? "text-right font-mono tabular-nums" : ""} ${isBool ? "" : "text-[var(--color-text-primary)]"}`}>
                          {isBool ? (
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${val ? "bg-green-100 text-green-700" : "bg-[var(--color-hover)] text-[var(--color-muted)]"}`}>
                              {val ? "True" : "False"}
                            </span>
                          ) : display}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!evalLoading && !evalError && columns.length === 0 && (
          <p className="text-sm text-[var(--color-muted)] italic">No evaluation data available yet.</p>
        )}

        {total > LIMIT && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-[var(--color-text-secondary)]">Page {currentPage} of {totalPages}</span>
            <div className="flex gap-2">
              <button disabled={offset === 0}
                onClick={() => loadEvaluation(Math.max(0, offset - LIMIT))}
                className="rounded-md border border-[var(--color-border)] px-3 py-1 disabled:opacity-50 hover:bg-[var(--color-card)]">Previous</button>
              <button disabled={offset + LIMIT >= total}
                onClick={() => loadEvaluation(offset + LIMIT)}
                className="rounded-md border border-[var(--color-border)] px-3 py-1 disabled:opacity-50 hover:bg-[var(--color-card)]">Next</button>
            </div>
          </div>
        )}
      </section>

    </div>
  );
}

