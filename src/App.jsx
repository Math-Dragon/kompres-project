import { useEffect, useState } from "react";
import PlanMaker from "./components/PlanMaker";
import Calendar from "./components/Calendar";
import Schedule from "./components/Schedule";
import { loadTasks, saveTasks } from "./utils/storage";
import "./App.css";

export default function App() {
  const [tasks, setTasks] = useState(() => loadTasks());
  const [isPlanMakerOpen, setPlanMakerOpen] = useState(false);

  // Persist to localStorage any time the task list changes.
  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  function handlePlanGenerated(newTasks) {
    setTasks((prev) => [...prev, ...newTasks]);
  }

  function handleToggleComplete(id) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  }

  function handleDeleteTask(id) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Rencana Belajar</h1>
          <p>Buat, lihat, dan kelola jadwal belajarmu dengan bantuan AI.</p>
        </div>
        <button type="button" className="app-cta" onClick={() => setPlanMakerOpen(true)}>
          + Buat Rencana Belajar
        </button>
      </header>

      <main className="app-main">
        <Calendar tasks={tasks} />

        <section className="app-schedule-section">
          <h2 className="app-section-title">Jadwal Saat Ini</h2>
          <Schedule
            tasks={tasks}
            onToggleComplete={handleToggleComplete}
            onDeleteTask={handleDeleteTask}
          />
        </section>
      </main>

      <PlanMaker
        isOpen={isPlanMakerOpen}
        onClose={() => setPlanMakerOpen(false)}
        onPlanGenerated={handlePlanGenerated}
      />
    </div>
  );
}
