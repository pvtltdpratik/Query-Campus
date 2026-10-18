"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type BarDatum = { name: string; value: number };

/** Horizontal-friendly bar chart. `threshold` colors bars below it with the destructive token. */
export function SimpleBarChart({
  data,
  unit = "",
  max,
  threshold,
  height = 260,
}: {
  data: BarDatum[];
  unit?: string;
  max?: number;
  threshold?: number;
  height?: number;
}) {
  return (
    <div style={{ height }} className="w-full" role="img" aria-label="Bar chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} interval={0} />
          <YAxis tickLine={false} axisLine={false} fontSize={12} domain={max ? [0, max] : undefined} allowDecimals={false} />
          <Tooltip
            formatter={(v) => `${v}${unit}`}
            contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", fontSize: 12 }}
          />
          <Bar dataKey="value" radius={0} maxBarSize={48}>
            {data.map((d) => (
              <Cell key={d.name} fill={threshold !== undefined && d.value < threshold ? "var(--destructive)" : "var(--primary)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
