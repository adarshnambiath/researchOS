import { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { WaveformViewer } from "../components/waveform/WaveformViewer";
import { fetchWaveformPreview, fetchWaveformRecord } from "../api/waveforms";
import type { WaveformRecord } from "../api/waveforms";

export function WaveformViewerPage() {
  const { datasetId, waveformName } = useParams<{
    datasetId: string;
    waveformName: string;
  }>();
  const [searchParams] = useSearchParams();
  const recordIdParam = searchParams.get("recordId");
  const fromParam = searchParams.get("from");
  const fromRunId = searchParams.get("runId");
  const fromExperimentId = searchParams.get("experimentId");

  const navigateToRun = (runId = fromRunId) => {
    if (!runId) return undefined;
    if (fromExperimentId) return `/experiments/${fromExperimentId}/runs/${runId}`;
    return `/runs/${runId}`;
  };

  const backTarget = fromParam === "evaluation" ? navigateToRun() : `/datasets/${datasetId}`;
  const backLabel = fromParam === "evaluation" ? "Back to Run Evaluation" : "Back to Dataset";

  const [record, setRecord] = useState<WaveformRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!datasetId || !waveformName) return;

    setLoading(true);
    setError(null);

    if (recordIdParam) {
      fetchWaveformRecord(Number(datasetId), waveformName, recordIdParam)
        .then((data) => {
          setRecord(data);
          setLoading(false);
        })
        .catch((e) => {
          setError((e as Error).message);
          setLoading(false);
        });
    } else {
      fetchWaveformPreview(Number(datasetId), waveformName)
        .then((data) => {
          setRecord(data);
          setLoading(false);
        })
        .catch((e) => {
          setError((e as Error).message);
          setLoading(false);
        });
    }
  }, [datasetId, waveformName, recordIdParam]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {backTarget && (
          <Link to={backTarget} className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
            <ArrowLeft className="h-4 w-4 inline mr-1" /> {backLabel}
          </Link>
        )}
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
          {waveformName}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          {recordIdParam ? `Record ${recordIdParam}` : "Waveform preview — first record from dataset"}
        </p>
      </div>

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
