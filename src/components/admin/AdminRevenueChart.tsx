"use client";

/**
 * AdminRevenueChart
 * ─────────────────
 * A premium recharts area/bar chart showing daily net revenue.
 * Design principles:
 *  - Teal gradient fill (brand-consistent, not default blue)
 *  - Blurred, rounded custom tooltip (glassmorphism)
 *  - Y-axis formatted as ¥ with comma separators
 *  - No chart borders or default recharts artifacts
 *  - Subtle reference line at Y=0 (negative refund days visible)
 *  - CSS animation via `animationDuration` on the bars
 */

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

export interface RevenueDay {
  date: string;   // "MM/DD" or "DD" label
  net: number;    // net JPY (can be negative if refunds exceed payments)
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const value = payload[0].value;
  const isNeg = value < 0;
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(13,148,136,0.15)",
        borderRadius: "0.875rem",
        padding: "0.75rem 1.125rem",
        boxShadow: "0 8px 32px -8px rgba(13,148,136,0.18), 0 2px 8px rgba(0,0,0,0.06)",
        minWidth: "120px",
      }}
    >
      <p style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#78716c", marginBottom: "0.25rem" }}>
        {label}
      </p>
      <p style={{ fontSize: "1.125rem", fontWeight: 800, color: isNeg ? "#ef4444" : "#0d9488", lineHeight: 1.2 }}>
        {isNeg ? "−" : ""}¥{Math.abs(value).toLocaleString("ja-JP")}
      </p>
    </div>
  );
}

function formatYAxis(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `¥${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000)    return `¥${(value / 1_000).toFixed(0)}k`;
  return `¥${value}`;
}

interface Props {
  data: RevenueDay[];
  height?: number;
}

export default function AdminRevenueChart({ data, height = 240 }: Props) {
  if (!data.length) {
    return (
      <div
        style={{ height, display: "flex", alignItems: "center", justifyContent: "center" }}
        className="text-stone-400 text-sm"
      >
        No revenue data for this period.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
        {/* ── Gradient fill definition ─────────────────────────── */}
        <defs>
          <linearGradient id="tealGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#0d9488" stopOpacity={0.22} />
            <stop offset="60%"  stopColor="#0d9488" stopOpacity={0.06} />
            <stop offset="100%" stopColor="#0d9488" stopOpacity={0.00} />
          </linearGradient>
        </defs>

        {/* ── Grid — only horizontal light lines ───────────────── */}
        <CartesianGrid
          strokeDasharray="4 4"
          stroke="rgba(13,148,136,0.06)"
          vertical={false}
        />

        {/* ── Axes ─────────────────────────────────────────────── */}
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "#a8a29e", fontWeight: 600 }}
          tickLine={false}
          axisLine={false}
          dy={6}
          interval="preserveStartEnd"
        />
        <YAxis
          tickFormatter={formatYAxis}
          tick={{ fontSize: 11, fill: "#a8a29e", fontWeight: 600 }}
          tickLine={false}
          axisLine={false}
          dx={-4}
          width={56}
        />

        {/* ── Zero reference line for days with net negative ────── */}
        <ReferenceLine
          y={0}
          stroke="rgba(239,68,68,0.25)"
          strokeDasharray="3 3"
        />

        {/* ── Custom tooltip ───────────────────────────────────── */}
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ stroke: "rgba(13,148,136,0.15)", strokeWidth: 1.5, strokeDasharray: "4 4" }}
        />

        {/* ── Area series ─────────────────────────────────────── */}
        <Area
          type="monotone"
          dataKey="net"
          stroke="#0d9488"
          strokeWidth={2.5}
          fill="url(#tealGradient)"
          dot={false}
          activeDot={{
            r: 5,
            fill: "#0d9488",
            strokeWidth: 2.5,
            stroke: "#ffffff",
          }}
          animationDuration={900}
          animationEasing="ease-out"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
