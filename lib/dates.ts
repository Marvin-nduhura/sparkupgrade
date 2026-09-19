import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO } from "date-fns";

export function getPeriodDates(period: string, startDate?: string, endDate?: string) {
  const now = new Date();
  if (period === "day") {
    const d = startDate ? parseISO(startDate) : now;
    return { start: startOfDay(d), end: endOfDay(d) };
  }
  if (period === "week") return { start: startOfWeek(now), end: endOfWeek(now) };
  if (period === "month") return { start: startOfMonth(now), end: endOfMonth(now) };
  if (period === "year") return { start: startOfYear(now), end: endOfYear(now) };
  if (period === "custom") {
    return {
      start: startDate ? startOfDay(parseISO(startDate)) : startOfMonth(now),
      end: endDate ? endOfDay(parseISO(endDate)) : endOfMonth(now),
    };
  }
  return { start: startOfMonth(now), end: endOfMonth(now) };
}
