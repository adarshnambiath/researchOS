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

  const [startIndex, setStartIndex] = useState(0);
  const [windowSize, setWindowSize] = useState(500);

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

  // Pre-select signal from query param when the list arrives
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
    setActive(signals[0]);
  }, [signals, signalParam, active]);

  // Load preview whenever the active signal or dataset changes
  useEffect(() => {
    if (!active) return;
    setLoading(true);
    setError(null);
    const controller = new AbortController();

    fetchPatchSignalPreview(datasetId, active.source_field)
      .then((data) => {
        setRecord(data);
        setStartIndex(0);
        setWindowSize(500);
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
    fetchPatchSignalWindow(datasetId, active.source_field, startIndex, windowSize)
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
    const step = record?.samples.length || windowSize;
    setStartIndex((prev) => Math.max(0, prev - step));
  };

  const handleNext = () => {
    const step = record?.samples.length || windowSize;
    setStartIndex((prev) => prev + step);
  };

  const handleJump = (idx: number) => {
    setStartIndex(Math.max(0, idx));
  };

  // Re-load the window whenever navigation parameters change
  useEffect(() => {
    if (!active || !record) return;
    const timer = setTimeout(loadWindow, 80);
    return () => clearTimeout(timer);
  }, [startIndex, windowSize]);

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
        startIndex={startIndex}
        windowSize={windowSize}
        onStartIndexChange={setStartIndex}
        onWindowSizeChange={setWindowSize}
        onPrev={handlePrev}
        onNext={handleNext}
      />
    </div>
  );
}
