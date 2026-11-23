exports.handler = async (event) => {
  // Hanya izinkan metode POST
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
      body: JSON.stringify({ error: "GEMINI_API_KEY belum diatur di Environment Variables Netlify." }),
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

    // Batasi maksimal 16 pesan terakhir agar token tetap hemat untuk chat sementara
    const recentHistory = history.slice(-16);

    const MODEL = "gemini-3.8-flash"; // Alternatif: "gemini-3-flash-preview"
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
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
          maxOutputTokens: 600,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Gagal mendapatkan balasan dari Gemini API.");
    }

    const reply =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Maaf, saya tidak dapat memproses jawaban saat ini.";

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message || "Terjadi kesalahan pada server chatbot." }),
    };
  }
};