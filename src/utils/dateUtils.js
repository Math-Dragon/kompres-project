// Small, dependency-free date helpers used across the app.
// All "ISO date" strings in this app are plain "YYYY-MM-DD" (no time/timezone),
// so we never lose a day to timezone conversion.

export const MONTH_NAMES_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export const DAY_NAMES_SHORT_ID = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
export const DAY_NAMES_FULL_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

// Study-day keys used by the Plan Maker's day toggles. Index matches JS's
// Date#getDay() (0 = Sunday) so we can convert between the two easily.
export const DAY_KEYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
export const WEEKDAY_KEYS = ["Sen", "Sel", "Rab", "Kam", "Jum"];
export const WEEKEND_KEYS = ["Sab", "Min"];

function pad(n) {
  return String(n).padStart(2, "0");
}

// Date -> "YYYY-MM-DD", using local date parts (not UTC) so it matches what
// the user sees on screen.
export function toISODate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// "YYYY-MM-DD" -> Date at local midnight.
export function fromISODate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO() {
  return toISODate(new Date());
}

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function isSameDay(a, b) {
  return toISODate(a) === toISODate(b);
}

export function isSameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

// Builds a 6x7 grid of Dates covering the full weeks needed to display the
// given month (including the trailing/leading days from neighboring months).
export function getMonthMatrix(year, month) {
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay(); // 0 = Sunday
  const gridStart = addDays(firstOfMonth, -startOffset);

  const weeks = [];
  let cursor = gridStart;
  for (let w = 0; w < 6; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      week.push(cursor);
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export function formatDateLong(iso) {
  const d = fromISODate(iso);
  return `${DAY_NAMES_FULL_ID[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES_ID[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateShort(iso) {
  const d = fromISODate(iso);
  return `${DAY_NAMES_SHORT_ID[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES_ID[d.getMonth()].slice(0, 3)}`;
}
