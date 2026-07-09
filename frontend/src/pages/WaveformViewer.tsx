import { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { WaveformViewer } from "../components/waveform/WaveformViewer";
import { fetchWaveformPreview, fetchWaveformRecord, fetchEvaluationWaveform } from "../api/waveforms";
import type { WaveformRecord } from "../api/waveforms";

export function WaveformViewerPage() {
  const { datasetId, waveformName, experimentId, runId } = useParams<{
    datasetId: string;
    waveformName: string;
    experimentId: string;
    runId: string;
  }>();
  const [searchParams] = useSearchParams();
  const recordIdParam = searchParams.get("recordId");
  const fromParam = searchParams.get("from");
  const fromRunId = searchParams.get("runId");
  const fromExperimentId = searchParams.get("experimentId");
  const evalRecordName = searchParams.get("recordName");
  const evalWindowStart = searchParams.get("windowStart");
  const evalWindowEnd = searchParams.get("windowEnd");

  // Determine if this is an evaluation-waveform view
  const isEvaluationWaveform = fromParam === "evaluation"
    && evalRecordName && evalWindowStart && evalWindowEnd
    && (experimentId || fromExperimentId) && (runId || fromRunId);

  const effectiveExperimentId = experimentId || fromExperimentId;
  const effectiveRunId = runId || fromRunId;

  const navigateToRun = (rId = effectiveRunId) => {
    if (!rId) return undefined;
    if (effectiveExperimentId) return `/experiments/${effectiveExperimentId}/runs/${rId}`;
    return `/runs/${rId}`;
  };

  const evaluationBackTarget = navigateToRun()
    ? `${navigateToRun()}/evaluation`
    : undefined;

  const backTarget = isEvaluationWaveform
    ? evaluationBackTarget
    : fromParam === "evaluation"
      ? navigateToRun()
      : `/datasets/${datasetId}`;

  const backLabel = isEvaluationWaveform
    ? "Back to Evaluation"
    : fromParam === "evaluation"
      ? "Back to Run Evaluation"
      : "Back to Dataset";

  const [record, setRecord] = useState<WaveformRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [startTime, setStartTime] = useState(0);
  const [windowDuration, setWindowDuration] = useState(10);
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null);

  const sr = record?.sampling_rate_hz;

  const loadRecord = (recordId: string, startSec: number, durationSec: number) => {
    const startSample = Math.round(startSec * (sr ?? 360));
    const numSamples = Math.round(durationSec * (sr ?? 360));
    setLoading(true);
    setError(null);
    setActiveRecordId(recordId);
    fetchWaveformRecord(Number(datasetId), waveformName!, recordId, startSample, numSamples)
      .then((data) => {
        setRecord(data);
        setLoading(false);
      })
      .catch((e) => {
        setError((e as Error).message);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!datasetId && !isEvaluationWaveform) return;

    // Evaluation-waveform mode: use the run-level endpoint
    if (isEvaluationWaveform) {
      const rId = Number(effectiveRunId);
      const rName = evalRecordName!;
      const wStart = Number(evalWindowStart);
      const wEnd = Number(evalWindowEnd);
      setLoading(true);
      setError(null);
      setActiveRecordId(rName);
      fetchEvaluationWaveform(rId, rName, wStart, wEnd)
        .then((data) => {
          setRecord(data);
          setLoading(false);
        })
        .catch((e) => {
          setError((e as Error).message);
          setLoading(false);
        });
      return;
    }

    // Normal dataset-waveform mode
    if (recordIdParam) {
      setActiveRecordId(recordIdParam);
      loadRecord(recordIdParam, startTime, windowDuration);
    } else {
      setLoading(true);
      setError(null);
      fetchWaveformPreview(Number(datasetId), waveformName!)
        .then((data) => {
          setRecord(data);
          setActiveRecordId(null);
          setLoading(false);
        })
        .catch((e) => {
          setError((e as Error).message);
          setLoading(false);
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasetId, waveformName, recordIdParam, isEvaluationWaveform]);

  const totalSec = record?.total_samples != null && sr ? record.total_samples / sr : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {backTarget && (
          <Link to={backTarget} className="text-sm text-(--color-text-secondary) hover:text-(--color-text-primary)">
            <ArrowLeft className="h-4 w-4 inline mr-1" /> {backLabel}
          </Link>
        )}
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-(--color-text-primary)">
          {isEvaluationWaveform ? `${evalRecordName} (Evaluation Window)` : waveformName}
        </h1>
        <p className="mt-1 text-sm text-(--color-text-secondary)">
          {isEvaluationWaveform
            ? `Record ${evalRecordName} · samples ${evalWindowStart}–${evalWindowEnd}`
            : recordIdParam
              ? `Record ${recordIdParam}`
              : "Waveform preview — first record from dataset"}
        </p>
      </div>

      {activeRecordId && !isEvaluationWaveform && (
        <section className="rounded-lg border border-(--color-border) p-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-xs font-medium text-(--color-muted)">Window</span>
            <div className="flex items-center gap-1">
              <span className="text-xs text-(--color-muted)">Start:</span>
              <input
                type="number"
                min={0}
                step={0.5}
                value={startTime}
                onChange={(e) => setStartTime(Number(e.target.value))}
                className="w-20 rounded-md border border-(--color-border) px-2 py-1 text-sm"
              />
              <span className="text-xs text-(--color-muted)">s</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-(--color-muted)">Duration:</span>
              <input
                type="number"
                min={1}
                step={1}
                value={windowDuration}
                onChange={(e) => setWindowDuration(Number(e.target.value))}
                className="w-20 rounded-md border border-(--color-border) px-2 py-1 text-sm"
              />
              <span className="text-xs text-(--color-muted)">s</span>
            </div>
            {totalSec != null && (
              <span className="text-xs text-(--color-muted)">
                (max {totalSec.toFixed(0)} s)
              </span>
            )}
            <button
              type="button"
              onClick={() => loadRecord(activeRecordId, startTime, windowDuration)}
              className="rounded-md bg-(--color-primary) px-3 py-1.5 text-xs font-medium text-white hover:bg-(--color-hover-button)"
            >
              Load
            </button>
          </div>
        </section>
      )}

      {loading && (
        <div className="p-8 text-center text-sm" style={{ color: "var(--color-muted)" }}>
          Loading waveform…
        </div>
      )}

      {error && (
        <div className="p-8 text-center text-sm text-red-600">{error}</div>
      )}

      {!loading && !error && record && (
        <WaveformViewer record={record} />
      )}

      {!loading && !error && !record && (
        <div className="p-8 text-center text-sm" style={{ color: "var(--color-muted)" }}>
          Waveform not found.
        </div>
      )}
    </div>
  );
}
