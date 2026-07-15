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

  const [startSample, setStartSample] = useState(0);
  const [maxSamples, setMaxSamples] = useState(500);

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
        setStartSample(0);
        setMaxSamples(500);
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
    fetchPatchSignalWindow(datasetId, active.source_field, startSample, maxSamples)
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
    const step = record?.samples.length || maxSamples;
    setStartSample((prev) => Math.max(0, prev - step));
  };

  const handleNext = () => {
    const step = record?.samples.length || maxSamples;
    setStartSample((prev) => prev + step);
  };

  const handleJump = (sample: number) => {
    setStartSample(Math.max(0, sample));
  };

  // Auto-reload when navigation params change
  useEffect(() => {
    if (!active || !record) return;
    const timer = setTimeout(loadWindow, 80);
    return () => clearTimeout(timer);
  }, [startSample, maxSamples]);

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
        startSample={startSample}
        maxSamples={maxSamples}
        onStartSampleChange={setStartSample}
        onMaxSamplesChange={setMaxSamples}
        onPrev={handlePrev}
        onNext={handleNext}
      />
    </div>
  );
}
