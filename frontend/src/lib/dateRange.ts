/**
 * Date-range presets for analytics and report filtering. Produces ISO
 * dates (YYYY-MM-DD) that the backend accepts via ?from=&to=.
 */

export type DateRangePreset = "today" | "week" | "month" | "custom";

export interface DateRange {
  from: string | null;
  to: string | null;
}

function toIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Returns the from/to ISO range for a preset (null = all time). */
export function dateRangeForPreset(
  preset: DateRangePreset,
  customFrom?: string,
  customTo?: string,
): DateRange {
  const now = new Date();

  switch (preset) {
    case "today": {
      const today = toIso(now);
      return { from: today, to: today };
    }
    case "week": {
      // Monday-start week.
      const day = now.getDay() || 7; // 1 (Mon) .. 7 (Sun)
      const monday = new Date(now);
      monday.setDate(now.getDate() - (day - 1));
      return { from: toIso(monday), to: toIso(now) };
    }
    case "month": {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: toIso(first), to: toIso(now) };
    }
    case "custom":
      return { from: customFrom || null, to: customTo || null };
    default:
      return { from: null, to: null };
  }
}

export const DATE_RANGE_PRESET_LABELS: Record<DateRangePreset, string> = {
  today: "Today",
  week: "This Week",
  month: "This Month",
  custom: "Custom",
};
