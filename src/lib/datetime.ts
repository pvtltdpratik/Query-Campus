// Dates are stored as UTC instants; everything shown to people is rendered in the college timezone.
export const COLLEGE_TZ = process.env.COLLEGE_TIMEZONE ?? "Asia/Kolkata";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const weekdayName = (dayOfWeek: number) => WEEKDAYS[dayOfWeek - 1] ?? "";

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-IN", { timeZone: COLLEGE_TZ, ...opts });

export const formatDate = (d: Date) => fmt({ weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
export const formatShortDate = (d: Date) => fmt({ day: "numeric", month: "short", year: "numeric" }).format(d);
export const formatTime = (d: Date) => fmt({ hour: "numeric", minute: "2-digit", hour12: true }).format(d).toUpperCase();
export const formatDateTime = (d: Date) => `${formatShortDate(d)}, ${formatTime(d)}`;

/** ISO weekday (1 = Monday ... 7 = Sunday) of an instant, in the college timezone. */
export function isoWeekday(d: Date): number {
  const short = fmt({ weekday: "short" }).format(d); // Mon, Tue, ...
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(short) + 1;
}

export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 24 * 60 * 60 * 1000);

/** "13:30" -> "1:30 PM" */
export function formatClock(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export const humanDuration = (mins: number) =>
  mins % 60 === 0 ? `${mins / 60} hour${mins === 60 ? "" : "s"}` : `${mins} minutes`;

// ---- Timezone conversion for admin forms (datetime-local inputs carry no zone) ----

function wallParts(ts: number): Record<string, number> {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: COLLEGE_TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).formatToParts(new Date(ts));
  return Object.fromEntries(parts.filter((p) => p.type !== "literal").map((p) => [p.type, Number(p.value)]));
}

/** Date -> "YYYY-MM-DDTHH:mm" wall-clock string in the college timezone (for datetime-local inputs). */
export function toLocalInput(d: Date): string {
  const p = wallParts(d.getTime());
  const z = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${z(p.month)}-${z(p.day)}T${z(p.hour)}:${z(p.minute)}`;
}

/** "YYYY-MM-DDTHH:mm" wall-clock in the college timezone -> UTC instant. */
export function fromLocalInput(local: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const w = wallParts(guess);
  const offset = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute) - guess;
  const result = new Date(guess - offset);
  return Number.isNaN(result.getTime()) ? null : result;
}
