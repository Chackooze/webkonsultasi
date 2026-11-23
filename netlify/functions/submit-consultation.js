// Netlify Function: Discord webhook disimpan sebagai environment variable,
// bukan di frontend. Set DISCORD_WEBHOOK_URL pada Netlify Site configuration.
exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Discord webhook belum dikonfigurasi di Netlify." }) };
  }

  let data;
  try { data = JSON.parse(event.body || "{}"); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: "Format data tidak valid." }) }; }

  const required = ["studentName", "studentEmail", "lecturerName", "topic", "date", "startTime", "endTime"];
  const missing = required.filter((key) => !String(data[key] || "").trim());
  if (missing.length) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Lengkapi semua kolom wajib." }) };
  }

  const email = String(data.studentEmail).trim();
  const date = String(data.date).trim();
  const startTime = String(data.startTime).trim();
  const endTime = String(data.endTime).trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Format email tidak valid." }) };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime) ||
      endTime <= startTime) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Tanggal atau waktu konsultasi tidak valid." }) };
  }

  const clean = (value, max = 900) => String(value || "—")
    .replace(/@everyone|@here/g, "@\u200b$&")
    .slice(0, max);

  const requestId = `PP-${Date.now().toString(36).toUpperCase()}`;
  const embed = {
    title: "📚 Pengajuan Konsultasi — Peer Polimedia",
    color: 0x16803d,
    fields: [
      { name: "ID Pengajuan", value: requestId, inline: true },
      { name: "Status", value: "🟡 Menunggu konfirmasi dosen", inline: true },
      { name: "Nama Mahasiswa", value: clean(data.studentName, 100), inline: true },
      { name: "Email Mahasiswa", value: clean(email, 150), inline: true },
      { name: "Dosen Tujuan", value: clean(data.lecturerName, 120), inline: true },
      { name: "Tanggal", value: date, inline: true },
      { name: "Waktu (WIB)", value: `${startTime}–${endTime}`, inline: true },
      { name: "Topik Konsultasi", value: clean(data.topic, 180), inline: false },
      { name: "Catatan", value: clean(data.notes, 900), inline: false }
    ],
    footer: { text: "Peer Polimedia • Portal Konsultasi Mahasiswa" },
    timestamp: new Date().toISOString()
  };

  try {
    const discordResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "Peer Polimedia", embeds: [embed], allowed_mentions: { parse: [] } })
    });

    if (!discordResponse.ok) {
      return { statusCode: 502, headers, body: JSON.stringify({ error: "Discord gagal menerima pengajuan. Periksa konfigurasi webhook." }) };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        requestId,
        status: "menunggu_konfirmasi_dosen",
        message: "Pengajuan diteruskan ke Discord dosen."
      })
    };
  } catch (error) {
    return { statusCode: 502, headers, body: JSON.stringify({ error: "Tidak dapat terhubung ke Discord." }) };
  }
};
