import { useMemo } from "react";
import { todayISO, formatDateShort } from "../utils/dateUtils";
import "./Schedule.css";

function groupTasks(tasks) {
  const today = todayISO();
  const groups = { overdue: [], today: [], upcoming: [] };

  for (const t of tasks) {
    if (t.date < today && !t.completed) groups.overdue.push(t);
    else if (t.date === today) groups.today.push(t);
    else if (t.date > today) groups.upcoming.push(t);
    // completed + in the past but not "today"/"upcoming" is intentionally
    // dropped from the active view — it's done, no need to keep surfacing it.
  }

  const byDateTime = (a, b) => (a.date + a.time).localeCompare(b.date + b.time);
  groups.overdue.sort(byDateTime);
  groups.today.sort(byDateTime);
  groups.upcoming.sort(byDateTime);
  return groups;
}

function TaskRow({ task, onToggleComplete, onDeleteTask }) {
  return (
    <li className={`sch-row${task.completed ? " sch-row-done" : ""}`}>
      <button
        type="button"
        className="sch-checkbox"
        aria-label={task.completed ? "Tandai belum selesai" : "Tandai selesai"}
        aria-pressed={task.completed}
        onClick={() => onToggleComplete(task.id)}
      >
        {task.completed ? "✓" : ""}
      </button>

      <div className="sch-row-body">
        <div className="sch-row-top">
          <span className="sch-row-title">{task.title}</span>
          <span className="sch-row-meta">{formatDateShort(task.date)} · {task.time}</span>
        </div>
        {task.description && <p className="sch-row-desc">{task.description}</p>}
        {task.planTitle && <span className="sch-row-plan">{task.planTitle}</span>}
      </div>

      <button
        type="button"
        className="sch-delete"
        aria-label="Hapus tugas"
        onClick={() => onDeleteTask(task.id)}
      >
        🗑
      </button>
    </li>
  );
}

export default function Schedule({ tasks, onToggleComplete, onDeleteTask }) {
  const groups = useMemo(() => groupTasks(tasks), [tasks]);
  const isEmpty = groups.overdue.length === 0 && groups.today.length === 0 && groups.upcoming.length === 0;

  if (isEmpty) {
    return (
      <div className="sch">
        <div className="sch-empty">
          <p>Belum ada jadwal. Buat rencana belajar untuk memulai.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sch">
      {groups.overdue.length > 0 && (
        <section className="sch-section">
          <h4 className="sch-section-title sch-section-overdue">Terlambat</h4>
          <ul className="sch-list">
            {groups.overdue.map((t) => (
              <TaskRow key={t.id} task={t} onToggleComplete={onToggleComplete} onDeleteTask={onDeleteTask} />
            ))}
          </ul>
        </section>
      )}

      {groups.today.length > 0 && (
        <section className="sch-section">
          <h4 className="sch-section-title">Hari ini</h4>
          <ul className="sch-list">
            {groups.today.map((t) => (
              <TaskRow key={t.id} task={t} onToggleComplete={onToggleComplete} onDeleteTask={onDeleteTask} />
            ))}
          </ul>
        </section>
      )}

      {groups.upcoming.length > 0 && (
        <section className="sch-section">
          <h4 className="sch-section-title">Mendatang</h4>
          <ul className="sch-list">
            {groups.upcoming.map((t) => (
              <TaskRow key={t.id} task={t} onToggleComplete={onToggleComplete} onDeleteTask={onDeleteTask} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
