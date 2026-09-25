import { useState } from "react";
import { DAY_KEYS, WEEKDAY_KEYS, WEEKEND_KEYS, todayISO } from "../utils/dateUtils";
import { generateStudyPlan } from "../utils/gemini";
import "./PlanMaker.css";

const DAY_MODES = [
  { key: "weekdays", label: "Weekdays (Sen–Jum)", days: WEEKDAY_KEYS },
  { key: "weekend", label: "Weekend (Sab–Min)", days: WEEKEND_KEYS },
  { key: "custom", label: "Custom", days: null },
];

const TIME_OPTIONS = ["Pagi", "Siang", "Malam"];

const sameDaySet = (a, b) => a.length === b.length && a.every((d) => b.includes(d));

function initialState() {
  return {
    title: "",
    description: "",
    deadline: "",
    hoursPerWeek: 5,
    preferredTime: "Pagi",
    dayMode: "weekdays",
    selectedDays: [...WEEKDAY_KEYS],
  };
}

export default function PlanMaker({ isOpen, onClose, onPlanGenerated }) {
  const [form, setForm] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function selectDayMode(modeKey) {
    const mode = DAY_MODES.find((m) => m.key === modeKey);
    setForm((f) => ({
      ...f,
      dayMode: modeKey,
      selectedDays: mode.days ? [...mode.days] : f.selectedDays,
    }));
  }

  function toggleDay(day) {
    setForm((f) => {
      const has = f.selectedDays.includes(day);
      const nextDays = has ? f.selectedDays.filter((d) => d !== day) : [...f.selectedDays, day];

      // If the resulting selection matches a preset exactly, reflect that in
      // the mode pills; otherwise it's a custom mix.
      let nextMode = "custom";
      if (sameDaySet(nextDays, WEEKDAY_KEYS)) nextMode = "weekdays";
      else if (sameDaySet(nextDays, WEEKEND_KEYS)) nextMode = "weekend";

      return { ...f, selectedDays: nextDays, dayMode: nextMode };
    });
  }

  function handleClose() {
    if (loading) return;
    setForm(initialState());
    setError("");
    onClose();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.title.trim()) {
      setError("Judul tujuan wajib diisi.");
      return;
    }
    if (!form.deadline) {
      setError("Deadline wajib diisi.");
      return;
    }
    if (form.deadline < todayISO()) {
      setError("Deadline tidak boleh sebelum hari ini.");
      return;
    }
    if (form.selectedDays.length === 0) {
      setError("Pilih minimal satu hari belajar.");
      return;
    }
    if (!form.hoursPerWeek || form.hoursPerWeek <= 0) {
      setError("Jam belajar per minggu harus lebih dari 0.");
      return;
    }

    setLoading(true);
    try {
      const rawTasks = await generateStudyPlan(form);
      const planId = `plan-${Date.now()}`;
      const tasks = rawTasks.map((t, idx) => ({
        id: `${planId}-${idx}`,
        planId,
        planTitle: form.title.trim(),
        date: t.date,
        time: t.time,
        durationMinutes: t.duration_minutes,
        title: t.title,
        description: t.description,
        completed: false,
      }));
      onPlanGenerated(tasks);
      setForm(initialState());
      onClose();
    } catch (err) {
      setError(err.message || "Terjadi kesalahan yang tidak terduga.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pm-overlay" onMouseDown={handleClose}>
      <div className="pm-modal" onMouseDown={(e) => e.stopPropagation()}>
        <header className="pm-header">
          <div className="pm-header-icon" aria-hidden="true">🎯</div>
          <div className="pm-header-text">
            <h2>Buat Rencana Belajar</h2>
            <p>Isi form untuk mendapatkan rekomendasi AI</p>
          </div>
          <button type="button" className="pm-close" onClick={handleClose} aria-label="Tutup">
            ✕
          </button>
        </header>

        <form className="pm-form" onSubmit={handleSubmit}>
          <div className="pm-field">
            <label htmlFor="pm-title">
              Judul Tujuan <span className="pm-required">*</span>
            </label>
            <input
              id="pm-title"
              type="text"
              placeholder="cth. Menguasai Kalkulus Dasar"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="pm-field">
            <label htmlFor="pm-description">Deskripsi</label>
            <textarea
              id="pm-description"
              placeholder="Jelaskan tujuan belajarmu..."
              rows={3}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="pm-field">
            <label htmlFor="pm-deadline">Deadline</label>
            <input
              id="pm-deadline"
              type="date"
              min={todayISO()}
              value={form.deadline}
              onChange={(e) => update("deadline", e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="pm-row">
            <div className="pm-field">
              <label htmlFor="pm-hours">Jam Belajar / Minggu</label>
              <input
                id="pm-hours"
                type="number"
                min={1}
                max={80}
                value={form.hoursPerWeek}
                onChange={(e) => update("hoursPerWeek", Number(e.target.value))}
                disabled={loading}
              />
            </div>
            <div className="pm-field">
              <label htmlFor="pm-time">Waktu Preferensi</label>
              <select
                id="pm-time"
                value={form.preferredTime}
                onChange={(e) => update("preferredTime", e.target.value)}
                disabled={loading}
              >
                {TIME_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pm-field">
            <label>Hari Belajar</label>
            <div className="pm-mode-pills">
              {DAY_MODES.map((mode) => (
                <button
                  key={mode.key}
                  type="button"
                  className={`pm-pill pm-pill-mode${form.dayMode === mode.key ? " active" : ""}`}
                  onClick={() => selectDayMode(mode.key)}
                  disabled={loading}
                >
                  {mode.label}
                </button>
              ))}
            </div>
            <div className="pm-day-pills">
              {DAY_KEYS.filter((d) => d !== "Min").concat("Min").map((day) => (
                <button
                  key={day}
                  type="button"
                  className={`pm-pill pm-pill-day${form.selectedDays.includes(day) ? " active" : ""}`}
                  onClick={() => toggleDay(day)}
                  disabled={loading}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="pm-error">{error}</div>}

          <button type="submit" className="pm-btn pm-btn-primary pm-btn-submit" disabled={loading}>
            {loading ? "Membuat Rencana..." : "Buat Rencana"}
          </button>
        </form>
      </div>
    </div>
  );
}
