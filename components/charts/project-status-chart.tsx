"use client";

import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Loader2 } from "lucide-react";

const MOCK_DATA = [
  { name: "Active", value: 5, color: "#22c55e" },
  { name: "Planning", value: 2, color: "#3b82f6" },
  { name: "On Hold", value: 1, color: "#f59e0b" },
  { name: "Completed", value: 3, color: "#6366f1" },
];

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-lg text-xs">
      <p className="font-semibold">{payload[0].name}</p>
      <p className="text-muted-foreground">{payload[0].value} projects</p>
    </div>
  );
};

export function ProjectStatusChart() {
  const { data, isLoading } = useQuery({
    queryKey: ["project-status-chart"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/projects");
      if (!res.ok) return { statusData: MOCK_DATA };
      return res.json();
    },
  });

  const chartData = data?.statusData || MOCK_DATA;

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
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="45%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
          >
            {chartData.map((entry: any, index: number) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: "11px" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
