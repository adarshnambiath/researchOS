import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { WaveformChart } from "../components/waveform/WaveformChart";
import { WaveformToolbar } from "../components/waveform/WaveformToolbar";
import { fetchWaveformPreview } from "../api/waveforms";
import type { WaveformRecord } from "../api/waveforms";

export function WaveformViewer() {
  const { datasetId, waveformName } = useParams<{
    datasetId: string;
    waveformName: string;
  }>();

  const [record, setRecord] = useState<WaveformRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!datasetId || !waveformName) return;

    setLoading(true);
    setError(null);
    fetchWaveformPreview(Number(datasetId), waveformName)
      .then((data) => {
        setRecord(data);
        setLoading(false);
      })
      .catch((e) => {
        setError((e as Error).message);
        setLoading(false);
      });
  }, [datasetId, waveformName]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to={`/datasets/${datasetId}`}
          className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        >
          <ArrowLeft className="h-4 w-4 inline mr-1" /> Back to Dataset
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
          {waveformName}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Waveform preview — first record from dataset
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
        <>
          <section className="rounded-lg border border-[var(--color-border)] p-4">
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-xs" style={{ color: "var(--color-muted)" }}>
                  Record ID
                </span>
                <p className="mt-0.5 font-medium" style={{ color: "var(--color-text-primary)" }}>
                  {record.record_id || "—"}
                </p>
              </div>
              <div>
                <span className="text-xs" style={{ color: "var(--color-muted)" }}>
                  Label
                </span>
                <p className="mt-0.5 font-medium" style={{ color: "var(--color-text-primary)" }}>
                  {record.label || "—"}
                </p>
              </div>
              <div>
                <span className="text-xs" style={{ color: "var(--color-muted)" }}>
                  Sampling Rate
                </span>
                <p className="mt-0.5 font-medium" style={{ color: "var(--color-text-primary)" }}>
                  {record.sampling_rate_hz ? `${record.sampling_rate_hz} Hz` : "—"}
                </p>
              </div>
              <div>
                <span className="text-xs" style={{ color: "var(--color-muted)" }}>
                  Units
                </span>
                <p className="mt-0.5 font-medium" style={{ color: "var(--color-text-primary)" }}>
                  {record.units || "—"}
                </p>
              </div>
            </div>
          </section>

          <WaveformToolbar recordId={record.record_id} label={record.label} />

          <WaveformChart
            samples={record.samples}
            samplingRateHz={record.sampling_rate_hz ?? undefined}
            units={record.units}
          />
        </>
      )}

      {!loading && !error && !record && (
        <div className="p-8 text-center text-sm" style={{ color: "var(--color-muted)" }}>
          Waveform not found.
        </div>
      )}
    </div>
  );
}
