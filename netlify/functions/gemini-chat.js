const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function generateWithFallback(apiKey, payload) {
  let lastError = null;

  for (let i = 0; i < MODELS.length; i++) {
    const model = MODELS[i];
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (reply) return reply;
      }

      lastError = new Error(data.error?.message || `HTTP ${response.status}`);

      // Jika model utama sedang sibuk/padat (503/429), otomatis pindah ke model cadangan
      if ([404, 429, 500, 503].includes(response.status) && i < MODELS.length - 1) {
        await sleep(600);
        continue;
      }
    } catch (err) {
      lastError = err;
      if (i < MODELS.length - 1) {
        await sleep(600);
        continue;
      }
    }
  }

  throw lastError || new Error("Gagal mendapatkan balasan dari server AI.");
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "GEMINI_API_KEY belum diatur di Netlify." }),
    };
  }

  try {
    const { history } = JSON.parse(event.body || "{}");

    if (!Array.isArray(history) || history.length === 0) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Riwayat pesan tidak valid." }),
      };
    }

    const recentHistory = history.slice(-16);

    const payload = {
      systemInstruction: {
        parts: [
          {
            text:
              "Kamu adalah Asisten Virtual Peer Polimedia (Politeknik Negeri Media Kreatif). " +
              "Tugasmu membantu mahasiswa menyiapkan pengajuan konsultasi dosen: membantu merumuskan topik konsultasi yang jelas, menyusun poin pertanyaan bimbingan/tugas akhir, memberi tips etika menghubungi dosen, dan menjelaskan cara mengisi formulir di halaman ini. " +
              "Gunakan bahasa Indonesia yang ramah, ringkas, sopan, dan terstruktur. Jangan mengarang jadwal dosen karena konfirmasi jadwal dilakukan langsung oleh dosen via Discord setelah formulir dikirim.",
          },
        ],
      },
      contents: recentHistory,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    };

    const reply = await generateWithFallback(apiKey, payload);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply }),
    };
  } catch (error) {
    const rawMsg = error.message || "";
    const isOverloaded =
      rawMsg.toLowerCase().includes("high demand") ||
      rawMsg.includes("503") ||
      rawMsg.includes("429");

    return {
      statusCode: 503,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: isOverloaded
          ? "Server AI sedang padat karena banyak permintaan. Silakan tunggu beberapa detik lalu kirim ulang pesanmu."
          : rawMsg || "Terjadi kesalahan pada server chatbot.",
      }),
    };
  }
};