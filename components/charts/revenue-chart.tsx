"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from "recharts";
import { useTheme } from "next-themes";
import { Loader2 } from "lucide-react";

const MOCK_DATA = [
  { month: "Apr", received: 8500000, spent: 6200000 },
  { month: "May", received: 12000000, spent: 9800000 },
  { month: "Jun", received: 9500000, spent: 7100000 },
  { month: "Jul", received: 15000000, spent: 11500000 },
  { month: "Aug", received: 11000000, spent: 8900000 },
  { month: "Sep", received: 13500000, spent: 10200000 },
];

function formatUGX(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toString();
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-lg text-xs">
      <p className="font-semibold mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">UGX {entry.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

export function RevenueChart() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const { data, isLoading } = useQuery({
    queryKey: ["revenue-chart"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/revenue");
      if (!res.ok) return MOCK_DATA;
      return res.json();
    },
  });

  const chartData = data?.data || MOCK_DATA;

  if (isLoading) {
    return (
      <div className="h-56 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <defs>
            <linearGradient id="received" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="spent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#334155" : "#f1f5f9"} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: isDark ? "#94a3b8" : "#64748b" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatUGX}
            tick={{ fontSize: 10, fill: isDark ? "#94a3b8" : "#64748b" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: "12px" }}
          />
          <Area
            type="monotone"
            dataKey="received"
            name="Received"
            stroke="#22c55e"
            strokeWidth={2.5}
            fill="url(#received)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
          <Area
            type="monotone"
            dataKey="spent"
            name="Spent"
            stroke="#f97316"
            strokeWidth={2.5}
            fill="url(#spent)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
