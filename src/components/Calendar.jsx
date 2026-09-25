import { useMemo, useState } from "react";
import { getMonthMatrix, toISODate, isSameMonth, MONTH_NAMES_ID, DAY_NAMES_SHORT_ID, todayISO } from "../utils/dateUtils";
import "./Calendar.css";

const MAX_VISIBLE_TASKS = 3;

export default function Calendar({ tasks }) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const tasksByDate = useMemo(() => {
    const map = {};
    for (const task of tasks) {
      if (!map[task.date]) map[task.date] = [];
      map[task.date].push(task);
    }
    return map;
  }, [tasks]);

  const weeks = useMemo(() => getMonthMatrix(viewYear, viewMonth), [viewYear, viewMonth]);
  const viewDate = new Date(viewYear, viewMonth, 1);
  const today = todayISO();

  function goPrev() {
    const d = new Date(viewYear, viewMonth - 1, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  function goNext() {
    const d = new Date(viewYear, viewMonth + 1, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  function goToday() {
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
  }

  return (
    <div className="cal">
      <div className="cal-header">
        <h3>{MONTH_NAMES_ID[viewMonth]} {viewYear}</h3>
        <div className="cal-nav">
          <button type="button" onClick={goToday} className="cal-today-btn">Hari ini</button>
          <button type="button" onClick={goPrev} aria-label="Bulan sebelumnya">‹</button>
          <button type="button" onClick={goNext} aria-label="Bulan berikutnya">›</button>
        </div>
      </div>

      <div className="cal-weekday-row">
        {DAY_NAMES_SHORT_ID.map((d) => (
          <div key={d} className="cal-weekday">{d}</div>
        ))}
      </div>

      <div className="cal-grid">
        {weeks.flat().map((date) => {
          const iso = toISODate(date);
          const dayTasks = tasksByDate[iso] || [];
          const inMonth = isSameMonth(date, viewDate);
          const isToday = iso === today;

          return (
            <div key={iso} className={`cal-cell${inMonth ? "" : " cal-cell-out"}${isToday ? " cal-cell-today" : ""}`}>
              <span className="cal-cell-date">{date.getDate()}</span>
              <div className="cal-cell-tasks">
                {dayTasks.slice(0, MAX_VISIBLE_TASKS).map((t) => (
                  <div key={t.id} className={`cal-chip${t.completed ? " cal-chip-done" : ""}`} title={t.title}>
                    {t.title}
                  </div>
                ))}
                {dayTasks.length > MAX_VISIBLE_TASKS && (
                  <div className="cal-chip-more">+{dayTasks.length - MAX_VISIBLE_TASKS} lagi</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
