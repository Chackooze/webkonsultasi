
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method not allowed" })
    };
  }

  const webhookUrl = process.env.N8N_WEBHOOK_URL;

  if (!webhookUrl) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "N8N_WEBHOOK_URL belum dikonfigurasi di Netlify"
      })
    };
  }

  try {
    const data = JSON.parse(event.body || "{}");

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const detail = await response.text();
      return {
        statusCode: 502,
        body: JSON.stringify({
          message: "n8n gagal menerima data",
          detail
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Jadwal berhasil dikirim ke n8n"
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: error.message
      })
    };
  }
};
