// Vercel serverless function — runs only on the server.
//
// This is the "backend" for the app: it holds the Gemini API key
// (process.env.GEMINI_API_KEY, no VITE_ prefix) so the key never reaches
// the browser bundle. The frontend (src/utils/gemini.js) POSTs the plan
// form here and gets back { tasks: [...] }.
//
// Set GEMINI_API_KEY:
//   - Locally: in a .env file at the project root (see .env.example),
//     and run the app with `vercel dev` (not plain `vite dev`) so this
//     function actually runs.
//   - In production: Vercel dashboard -> Project -> Settings ->
//     Environment Variables.

const GEMINI_MODEL = "gemini-2.5-flash";

const DAY_FULL_NAMES = {
  Min: "Minggu",
  Sen: "Senin",
  Sel: "Selasa",
  Rab: "Rabu",
  Kam: "Kamis",
  Jum: "Jumat",
  Sab: "Sabtu",
};

const PREFERRED_TIME_WINDOWS = {
  Pagi: "06:00–10:00",
  Siang: "11:00–15:00",
  Malam: "18:00–21:00",
};

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    tasks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: { type: "string", description: "Study session date in YYYY-MM-DD format." },
          time: { type: "string", description: "24-hour start time in HH:MM format." },
          duration_minutes: { type: "integer", description: "Session length in minutes, typically 30-120." },
          title: { type: "string", description: "Short, specific task title (what to study/do)." },
          description: { type: "string", description: "One or two sentences of detail or sub-topics." },
        },
        required: ["date", "time", "duration_minutes", "title", "description"],
      },
    },
  },
  required: ["tasks"],
};

function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function buildPrompt({ title, description, deadline, hoursPerWeek, preferredTime, selectedDays }) {
  const dayNames = selectedDays.map((d) => DAY_FULL_NAMES[d] || d);
  const timeWindow = PREFERRED_TIME_WINDOWS[preferredTime] || "06:00–21:00";

  return `Kamu adalah asisten perencana studi. Buatkan jadwal belajar yang realistis dan terperinci berdasarkan permintaan berikut, dalam Bahasa Indonesia.

Tujuan belajar: "${title}"
Deskripsi tambahan: "${description || "(tidak ada)"}"
Mulai dari tanggal: ${todayISO()} (hari ini)
Deadline: ${deadline}
Total jam belajar per minggu: ${hoursPerWeek} jam
Hari yang tersedia untuk belajar: ${dayNames.join(", ")}
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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error: "Server belum dikonfigurasi: variabel lingkungan GEMINI_API_KEY tidak ditemukan.",
    });
    return;
  }

  const body = req.body || {};
  const { title, description, deadline, hoursPerWeek, preferredTime, selectedDays } = body;

  if (
    !title ||
    typeof title !== "string" ||
    !deadline ||
    !Array.isArray(selectedDays) ||
    selectedDays.length === 0 ||
    !hoursPerWeek ||
    Number(hoursPerWeek) <= 0
  ) {
    res.status(400).json({ error: "Data form tidak lengkap atau tidak valid." });
    return;
  }

  const prompt = buildPrompt({
    title,
    description,
    deadline,
    hoursPerWeek,
    preferredTime: preferredTime || "Pagi",
    selectedDays,
  });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  let geminiResponse;
  try {
    geminiResponse = await fetch(url, {
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
    res.status(502).json({ error: "Gagal menghubungi Gemini API. Periksa koneksi server." });
    return;
  }

  if (!geminiResponse.ok) {
    let detail = "";
    try {
      const errJson = await geminiResponse.json();
      detail = errJson?.error?.message || "";
    } catch {
      // ignore parse failure, fall back to generic message
    }
    res.status(502).json({
      error: `Gemini API mengembalikan error (${geminiResponse.status}). ${detail || "Coba lagi beberapa saat lagi."}`,
    });
    return;
  }

  const data = await geminiResponse.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") ?? "";

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    res.status(502).json({ error: "Gagal membaca respons dari AI. Coba buat rencana lagi." });
    return;
  }

  const tasks = Array.isArray(parsed?.tasks) ? parsed.tasks : [];
  if (tasks.length === 0) {
    res.status(502).json({ error: "AI tidak menghasilkan jadwal apa pun. Coba ubah detail rencana kamu." });
    return;
  }

  res.status(200).json({ tasks });
}
