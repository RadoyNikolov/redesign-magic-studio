import type { DateField, DateRange } from "./checklist-store";

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
export const DOW_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function parseIso(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d!);
}

export function formatDateRange(r?: DateRange) {
  if (!r) return "";
  if (r.start && r.end) {
    const a = parseIso(r.start);
    const b = parseIso(r.end);
    const am = MONTH_NAMES[a.getMonth()]!.slice(0, 3);
    const bm = MONTH_NAMES[b.getMonth()]!.slice(0, 3);
    if (r.start === r.end) return `${am} ${a.getDate()}, ${a.getFullYear()}`;
    if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear())
      return `${am} ${a.getDate()}–${b.getDate()}, ${a.getFullYear()}`;
    if (a.getFullYear() === b.getFullYear())
      return `${am} ${a.getDate()} – ${bm} ${b.getDate()}, ${a.getFullYear()}`;
    return `${am} ${a.getDate()}, ${a.getFullYear()} – ${bm} ${b.getDate()}, ${b.getFullYear()}`;
  }
  return r.legacyText || "";
}

export function fieldLabel(key: DateField) {
  return key === "prep" ? "Prep" : key === "dates" ? "Shoot" : "Return";
}

export function fieldToken(key: DateField) {
  return key === "prep" ? "prep" : key === "dates" ? "shoot" : "return";
}
