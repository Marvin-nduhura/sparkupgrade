"use client";

import { cn } from "@/lib/utils";
import { getYear, getMonth } from "date-fns";

const currentYear = new Date().getFullYear();
export const YEARS = Array.from({ length: 6 }, (_, i) => currentYear - i);
export const MONTHS = [
  { value: "01", label: "January" }, { value: "02", label: "February" },
  { value: "03", label: "March" },   { value: "04", label: "April" },
  { value: "05", label: "May" },     { value: "06", label: "June" },
  { value: "07", label: "July" },    { value: "08", label: "August" },
  { value: "09", label: "September" },{ value: "10", label: "October" },
  { value: "11", label: "November" },{ value: "12", label: "December" },
];

export interface PeriodState {
  period: string;
  startDate: string;
  endDate: string;
  year: string;
  month: string;
}

export function usePeriodDates(state: PeriodState): { startDate: string; endDate: string; period: string } {
  const { period, startDate, endDate, year, month } = state;
  if (period === "year-pick") {
    return { period: "custom", startDate: `${year}-01-01`, endDate: `${year}-12-31` };
  }
  if (period === "month-pick") {
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    return { period: "custom", startDate: `${year}-${month}-01`, endDate: `${year}-${month}-${String(lastDay).padStart(2, "0")}` };
  }
  return { period, startDate, endDate };
}

interface Props {
  state: PeriodState;
  onChange: (next: Partial<PeriodState>) => void;
  projects?: any[];
  selectedProject?: string;
  onProjectChange?: (id: string) => void;
  showProject?: boolean;
}

export function PeriodSelector({ state, onChange, projects = [], selectedProject = "", onProjectChange, showProject = true }: Props) {
  const PERIOD_TABS = [
    { value: "day",        label: "Today" },
    { value: "week",       label: "Week" },
    { value: "month",      label: "Month" },
    { value: "month-pick", label: "Pick Month" },
    { value: "year-pick",  label: "Pick Year" },
    { value: "custom",     label: "Custom" },
  ];

  return (
    <div className="flex flex-wrap gap-3 p-4 bg-card border border-border rounded-2xl">
      {/* Project filter */}
      {showProject && onProjectChange && (
        <select value={selectedProject} onChange={e => onProjectChange(e.target.value)}
          className="input-styled flex-1 min-w-36">
          <option value="">All Projects</option>
          {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )}

      {/* Period tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-xl flex-wrap">
        {PERIOD_TABS.map(t => (
          <button key={t.value} onClick={() => onChange({ period: t.value })}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
              state.period === t.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Month + Year picker */}
      {state.period === "month-pick" && (
        <div className="flex gap-2 items-center flex-wrap">
          <select value={state.month} onChange={e => onChange({ month: e.target.value })}
            className="input-styled text-sm w-40">
            {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <select value={state.year} onChange={e => onChange({ year: e.target.value })}
            className="input-styled text-sm w-24">
            {YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
          </select>
        </div>
      )}

      {/* Year picker */}
      {state.period === "year-pick" && (
        <select value={state.year} onChange={e => onChange({ year: e.target.value })}
          className="input-styled text-sm w-28">
          {YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
        </select>
      )}

      {/* Custom date range */}
      {state.period === "custom" && (
        <div className="flex gap-2 flex-wrap">
          <input type="date" value={state.startDate} onChange={e => onChange({ startDate: e.target.value })}
            className="input-styled text-sm" />
          <input type="date" value={state.endDate} onChange={e => onChange({ endDate: e.target.value })}
            className="input-styled text-sm" />
        </div>
      )}
    </div>
  );
}
