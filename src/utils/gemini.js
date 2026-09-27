// Client-side helper: calls our own backend (api/generate-plan.js), which
// holds the Gemini API key server-side. The browser never sees the key.

/**
 * Sends the study-plan form to the backend and returns the generated task
 * list: an array of { date, time, duration_minutes, title, description }.
 */
export async function generateStudyPlan(formData) {
  let response;
  try {
    response = await fetch("/api/generate-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
  } catch (err) {
    throw new Error("Tidak dapat menghubungi server. Periksa koneksi internet kamu.");
  }

  let data;
  try {
    data = await response.json();
  } catch (err) {
    throw new Error("Server mengembalikan respons yang tidak valid.");
  }

  if (!response.ok) {
    throw new Error(data?.error || `Server mengembalikan error (${response.status}).`);
  }

  const tasks = Array.isArray(data?.tasks) ? data.tasks : [];
  if (tasks.length === 0) {
    throw new Error("AI tidak menghasilkan jadwal apa pun. Coba ubah detail rencana kamu.");
  }

  return tasks;
}
