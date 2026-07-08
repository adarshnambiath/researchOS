import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { WaveformRecord } from "../../api/waveforms";

interface WaveformChartProps {
  /** Standardized backend response object — the only dependency. */
  waveform: WaveformRecord;
  height?: number;
  channelIndex?: number;
}

/**
 * Reusable line chart for waveform data.
 *
 * Knows nothing about datasets, ECG, or any specific signal modality.
 * Consumes a single WaveformRecord object.  Future additions
 * (annotations, timestamps, channels, lead names) are added to the
 * WaveformRecord model without changing this component's prop signature.
 *
 * When waveform.all_channels is provided, the chart uses
 * all_channels[channelIndex] as the sample data, allowing the
 * parent to switch between channels.
 */
export function WaveformChart({
  waveform,
  height = 300,
  channelIndex = 0,
}: WaveformChartProps) {
  const { all_channels, sampling_rate_hz: samplingRateHz, channel_units } = waveform;

  // Determine which samples to display
  let samples: number[];
  let unitLabel: string | null = null;

  if (all_channels && all_channels.length > 0) {
    samples = all_channels[channelIndex] ?? all_channels[0];
  } else {
    samples = waveform.samples;
  }

  if (channel_units && channelIndex < channel_units.length) {
    unitLabel = channel_units[channelIndex] ?? waveform.units ?? null;
  } else {
    unitLabel = waveform.units ?? null;
  }

  // Build data points — one per sample
  const data = samples.map((value, index) => ({
    index,
    time: samplingRateHz ? index / samplingRateHz : index,
    value,
  }));

  if (!samples.length) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-(--color-border)"
        style={{ height, color: "var(--color-muted)" }}
      >
        <span className="text-sm">No waveform data available.</span>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border border-(--color-border) p-4"
      style={{ backgroundColor: "var(--color-card)" }}
    >
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey={samplingRateHz ? "time" : "index"}
            tick={{ fontSize: 11, fill: "var(--color-muted)" }}
            stroke="var(--color-border)"
            label={{
              value: samplingRateHz ? "Time (s)" : "Sample",
              position: "insideBottomRight",
              offset: -4,
              style: { fontSize: 11, fill: "var(--color-muted)" },
            }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--color-muted)" }}
            stroke="var(--color-border)"
            label={{
              value: unitLabel || "Amplitude",
              angle: -90,
              position: "insideLeft",
              style: { fontSize: 11, fill: "var(--color-muted)" },
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "6px",
              fontSize: 12,
              color: "var(--color-text-primary)",
            }}
            formatter={(value: any) => [typeof value === 'number' ? value.toFixed(4) : String(value), unitLabel || "Value"]}
            labelFormatter={(label) =>
              samplingRateHz ? `t = ${label.toFixed(3)} s` : `#${label}`
            }
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--color-primary)"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
