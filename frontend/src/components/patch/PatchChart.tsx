import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { PatchSignalRecord } from "../../api/patch";

interface PatchChartProps {
  record: PatchSignalRecord;
  height?: number;
}

/** Renders a packet-aware patch signal chart.
 *
 * - X-axis shows elapsed time in seconds (derived from TsECG).
 * - Packet boundaries are shown as subtle vertical reference lines.
 * - Sentinel values (null samples) produce gaps via connectNulls=false.
 */
export function PatchChart({ record, height = 300 }: PatchChartProps) {
  const { signal_info, samples, sampling_rate_hz, packet_boundaries, start_ts_ecg } = record;

  const { data, boundaries } = useMemo(() => {
    if (!samples.length) return { data: [], boundaries: [] };

    const startUs = start_ts_ecg ?? packet_boundaries[0]?.ts_ecg ?? 0;

    // Build data points with elapsed-time x-axis
    // If we have a sampling rate, derive time; otherwise use sample index
    if (sampling_rate_hz && sampling_rate_hz > 0) {
      // Derive time from sample index + rate
      const points = samples.map((v, i) => ({
        t: i / sampling_rate_hz,
        value: v,
      }));
      // Packet boundaries in seconds relative to window start
      const bps = packet_boundaries.map((pb) => ({
        seq: pb.seq,
        t: (pb.ts_ecg - startUs) / 1_000_000,
        count: pb.sample_count,
      }));
      return { data: points, boundaries: bps };
    }

    // Fallback: use TsECG-based timing from boundary metadata
    if (packet_boundaries.length > 0 && startUs !== 0) {
      const perSampleUs = packet_boundaries.length > 1
        ? (packet_boundaries[packet_boundaries.length - 1].ts_ecg - packet_boundaries[0].ts_ecg) /
          packet_boundaries.reduce((s, b) => s + b.sample_count, 0)
        : 0;

      if (perSampleUs > 0) {
        const points = samples.map((v, i) => ({
          t: i * perSampleUs / 1_000_000,
          value: v,
        }));
        const bps = packet_boundaries.map((pb) => ({
          seq: pb.seq,
          t: (pb.ts_ecg - startUs) / 1_000_000,
          count: pb.sample_count,
        }));
        return { data: points, boundaries: bps };
      }
    }

    // Last resort: index-based
    const points = samples.map((v, i) => ({ t: i, value: v }));
    const bps: { seq: number; t: number; count: number }[] = [];
    return { data: points, boundaries: bps };
  }, [samples, sampling_rate_hz, packet_boundaries, start_ts_ecg]);

  if (!samples.length) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-(--color-border)"
        style={{ height, color: "var(--color-muted)" }}
      >
        <span className="text-sm">No signal data available.</span>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border border-(--color-border) p-4"
      style={{ backgroundColor: "var(--color-card)" }}
    >
      <div className="mb-2 text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
        {signal_info.signal_name}
        {signal_info.units ? ` (${signal_info.units})` : ""}
        {sampling_rate_hz ? ` · ${sampling_rate_hz} Hz` : ""}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="t"
            tick={{ fontSize: 11, fill: "var(--color-muted)" }}
            stroke="var(--color-border)"
            label={{
              value: sampling_rate_hz ? "Time (s)" : "Sample",
              position: "insideBottomRight",
              offset: -4,
              style: { fontSize: 11, fill: "var(--color-muted)" },
            }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--color-muted)" }}
            stroke="var(--color-border)"
            label={{
              value: signal_info.units || "Amplitude",
              angle: -90,
              position: "insideLeft",
              style: { fontSize: 11, fill: "var(--color-muted)" },
            }}
          />
          {/* Packet boundary reference lines */}
          {boundaries.slice(1).map((b) => (
            <ReferenceLine
              key={b.seq}
              x={b.t}
              stroke="var(--color-border)"
              strokeOpacity={0.45}
              strokeDasharray="2 2"
            />
          ))}
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "6px",
              fontSize: 12,
              color: "var(--color-text-primary)",
            }}
            formatter={(value: any) => [
              value != null ? Number(value).toFixed(4) : "—",
              signal_info.units || "Value",
            ]}
            labelFormatter={(label) =>
              typeof label === "number"
                ? `t = ${label.toFixed(3)} s`
                : String(label)
            }
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--color-primary)"
            strokeWidth={1.5}
            dot={false}
            connectNulls={false}
            activeDot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
