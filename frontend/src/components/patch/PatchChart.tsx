import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { PatchSignalRecord } from "../../api/patch";

interface PatchChartProps {
  record: PatchSignalRecord;
  height?: number;
}

export function PatchChart({ record, height = 300 }: PatchChartProps) {
  const { signal_info, samples } = record;

  const data = samples.map((value, index) => ({
    index,
    time: index,
    value,
  }));

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
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 11, fill: "var(--color-muted)" }}
            stroke="var(--color-border)"
            label={{
              value: "Sample",
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
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "6px",
              fontSize: 12,
              color: "var(--color-text-primary)",
            }}
            formatter={(value: any) => [
              typeof value === "number" ? value.toFixed(4) : String(value),
              signal_info.units || "Value",
            ]}
            labelFormatter={(label) => `#${label}`}
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
