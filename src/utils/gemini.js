import { todayISO, DAY_NAMES_FULL_ID } from "./dateUtils";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-3.6-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const PREFERRED_TIME_WINDOWS = {
  Pagi: "06:00–10:00",
  Siang: "11:00–15:00",
  Malam: "18:00–21:00",
};

// The schema Gemini must conform to. Using responseSchema (rather than just
// asking nicely in the prompt) guarantees valid, parseable JSON back.
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    tasks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description: "Study session date in YYYY-MM-DD format.",
          },
          time: {
            type: "string",
            description: "24-hour start time in HH:MM format.",
          },
          duration_minutes: {
            type: "integer",
            description: "Session length in minutes, typically 30-120.",
          },
          title: {
            type: "string",
            description: "Short, specific task title (what to study/do).",
          },
          description: {
            type: "string",
            description: "One or two sentences of detail or sub-topics.",
          },
        },
        required: ["date", "time", "duration_minutes", "title", "description"],
      },
    },
  },
  required: ["tasks"],
};

function buildPrompt({ title, description, deadline, hoursPerWeek, preferredTime, selectedDayNames }) {
  const timeWindow = PREFERRED_TIME_WINDOWS[preferredTime] || "06:00–21:00";

  return `Kamu adalah asisten perencana studi. Buatkan jadwal belajar yang realistis dan terperinci berdasarkan permintaan berikut, dalam Bahasa Indonesia.

Tujuan belajar: "${title}"
Deskripsi tambahan: "${description || "(tidak ada)"}"
Mulai dari tanggal: ${todayISO()} (hari ini)
Deadline: ${deadline}
Total jam belajar per minggu: ${hoursPerWeek} jam
Hari yang tersedia untuk belajar: ${selectedDayNames.join(", ")}
Waktu preferensi: ${preferredTime} (sekitar jam ${timeWindow})

Instruksi:
1. Hanya buat sesi belajar pada hari-hari yang tersedia di atas, di antara hari ini dan deadline (inklusif).
2. Jumlah total durasi sesi per minggu harus mendekati ${hoursPerWeek} jam, dibagi menjadi sesi-sesi yang masuk akal (biasanya 30-120 menit per sesi, jangan terlalu panjang).
3. Pilih waktu mulai (time) yang berada di sekitar jendela waktu preferensi (${timeWindow}).
4. Pecah tujuan besar menjadi sub-topik/tugas konkret dan berurutan secara logis (progresif, dari dasar ke lanjutan, dengan sesi review/latihan mendekati deadline).
5. Judul tiap tugas harus singkat dan spesifik (contoh: "Belajar dasar-dasar aljabar", bukan hanya "Belajar").
6. Jangan membuat sesi pada tanggal sebelum hari ini atau setelah deadline.
7. Kembalikan HANYA data sesuai skema JSON yang diberikan.`;
}

export class GeminiConfigError extends Error {}

/**
 * Calls the Gemini API to turn a study-plan form into a list of concrete
 * scheduled tasks. Returns an array of { date, time, duration_minutes,
 * title, description } objects — ready to be tagged with ids and saved.
 */
export async function generateStudyPlan(formData) {
  if (!GEMINI_API_KEY) {
    throw new GeminiConfigError(
      "Gemini API key belum diatur. Tambahkan VITE_GEMINI_API_KEY di file .env, lalu restart server dev."
    );
  }

  const selectedDayNames = formData.selectedDays.map((key) => {
    const idx = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].indexOf(key);
    return DAY_NAMES_FULL_ID[idx] ?? key;
  });

  const prompt = buildPrompt({ ...formData, selectedDayNames });

  let response;
  try {
    response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.6,
        },
      }),
    });
  } catch (err) {
    throw new Error("Tidak dapat menghubungi Gemini API. Periksa koneksi internet kamu.");
  }

  if (!response.ok) {
    let detail = "";
    try {
      const errJson = await response.json();
      detail = errJson?.error?.message || "";
    } catch {
      // ignore parse failure, fall back to generic message
    }
    throw new Error(
      `Gemini API mengembalikan error (${response.status}). ${detail || "Coba lagi beberapa saat lagi."}`
    );
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") ?? "";

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    throw new Error("Gagal membaca respons dari AI. Coba buat rencana lagi.");
  }

  const tasks = Array.isArray(parsed?.tasks) ? parsed.tasks : [];
  if (tasks.length === 0) {
    throw new Error("AI tidak menghasilkan jadwal apa pun. Coba ubah detail rencana kamu.");
  }

  return tasks;
}
