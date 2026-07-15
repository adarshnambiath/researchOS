import { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import type { PatchSignalInfo, PatchSignalRecord } from "../api/patch";
import {
  fetchPatchSignals,
  fetchPatchSignalPreview,
  fetchPatchSignalWindow,
} from "../api/patch";
import { PatchViewerLayout } from "../components/patch/PatchViewerLayout";

export function PatchViewer() {
  const { id } = useParams();
  const datasetId = Number(id);
  const [searchParams] = useSearchParams();
  const signalParam = searchParams.get("signal");

  const [signals, setSignals] = useState<PatchSignalInfo[]>([]);
  const [active, setActive] = useState<PatchSignalInfo | null>(null);
  const [record, setRecord] = useState<PatchSignalRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [startTimeUs, setStartTimeUs] = useState(0);
  const [durationUs, setDurationUs] = useState(1_000_000); // 1 second default

  useEffect(() => {
    setLoading(true);
    fetchPatchSignals(datasetId)
      .then((data) => {
        setSignals(data);
        setLoading(false);
      })
      .catch((e) => {
        setError((e as Error).message);
        setLoading(false);
      });
  }, [datasetId]);

  // Pre-select signal from query param
  useEffect(() => {
    if (!signals.length || active) return;
    if (signalParam) {
      const match = signals.find(
        (s) => s.source_field === signalParam || s.signal_name === signalParam,
      );
      if (match) {
        setActive(match);
        return;
      }
    }
    if (signals.length > 0) setActive(signals[0]);
  }, [signals, signalParam, active]);

  // Load preview whenever active signal changes
  useEffect(() => {
    if (!active) return;
    setLoading(true);
    setError(null);
    const controller = new AbortController();

    fetchPatchSignalPreview(datasetId, active.source_field)
      .then((data) => {
        setRecord(data);
        setStartTimeUs(0);
        setDurationUs(1_000_000);
        setLoading(false);
      })
      .catch((e) => {
        if ((e as any).name !== "AbortError") {
          setError((e as Error).message);
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [active?.source_field, datasetId]);

  const loadWindow = () => {
    if (!active) return;
    setLoading(true);
    setError(null);
    const url = `/api/datasets/${datasetId}/patch/signals/${encodeURIComponent(active.source_field)}?start_time_us=${startTimeUs}&duration_us=${durationUs}`;
    console.log(`[FRONTEND]\nstartTimeUs=${startTimeUs}\ndurationUs=${durationUs}\nGET ${url}`);
    fetchPatchSignalWindow(datasetId, active.source_field, startTimeUs, durationUs)
      .then((data) => {
        setRecord(data);
        setLoading(false);
      })
      .catch((e) => {
        setError((e as Error).message);
        setLoading(false);
      });
  };

  const handlePrev = () => {
    // Step backward by one window duration
    setStartTimeUs((prev) => Math.max(0, prev - durationUs));
  };

  const handleNext = () => {
    // Step forward by one window duration
    setStartTimeUs((prev) => prev + durationUs);
  };

  // Auto-reload when navigation params change
  useEffect(() => {
    if (!active || !record) return;
    const timer = setTimeout(loadWindow, 80);
    return () => clearTimeout(timer);
  }, [startTimeUs, durationUs]);

  if (!datasetId) return <div className="p-6 text-sm text-(--color-muted)">Dataset not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to={`/datasets/${datasetId}`}
          className="text-sm text-(--color-text-secondary) hover:text-(--color-text-primary)"
        >
          <ArrowLeft className="h-4 w-4 inline mr-1" /> Back to Dataset
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-semibold text-(--color-text-primary)">Patch Viewer</h1>
        <p className="mt-1 text-sm text-(--color-text-secondary)">Dataset {datasetId}</p>
      </div>

      <PatchViewerLayout
        signals={signals}
        active={active}
        onSignalChange={setActive}
        record={record}
        loading={loading}
        error={error}
        startTimeUs={startTimeUs}
        durationUs={durationUs}
        onStartTimeChange={setStartTimeUs}
        onDurationChange={setDurationUs}
        onPrev={handlePrev}
        onNext={handleNext}
      />
    </div>
  );
}
