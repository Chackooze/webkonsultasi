const form = document.getElementById("consultation-form");
const statusBox = document.getElementById("form-status");
const dateInput = document.getElementById("date");

document.getElementById("year").textContent = new Date().getFullYear();

// Batasi tanggal agar mahasiswa tidak memilih tanggal yang sudah lewat (zona lokal browser).
const now = new Date();
const localToday = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
dateInput.min = localToday;

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  statusBox.className = "form-status";
  statusBox.textContent = "";

  const data = Object.fromEntries(new FormData(form).entries());
  if (data.endTime <= data.startTime) {
    statusBox.className = "form-status error";
    statusBox.textContent = "Jam selesai harus setelah jam mulai.";
    return;
  }
  if (data.date < localToday) {
    statusBox.className = "form-status error";
    statusBox.textContent = "Tanggal konsultasi tidak boleh sudah lewat.";
    return;
  }

  const button = form.querySelector("button[type='submit']");
  button.disabled = true;
  button.querySelector("span").textContent = "Mengirim pengajuan...";
  statusBox.textContent = "Sedang mengirim pengajuan ke dosen...";

  try {
    const response = await fetch("/.netlify/functions/submit-consultation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Pengajuan gagal dikirim. Silakan coba lagi.");

    statusBox.className = "form-status success";
    statusBox.textContent = `Pengajuan berhasil dikirim. ID: ${result.requestId}. Status: menunggu konfirmasi dosen.`;
    form.reset();
    dateInput.min = localToday;
  } catch (error) {
    statusBox.className = "form-status error";
    statusBox.textContent = error.message || "Terjadi kesalahan koneksi.";
  } finally {
    button.disabled = false;
    button.querySelector("span").textContent = "Kirim pengajuan";
  }
});

// === Logika Chatbot Sementara (Memori Sesi Browser) ===
const chatToggle = document.getElementById("chat-toggle");
const chatWindow = document.getElementById("chat-window");
const chatClose = document.getElementById("chat-close");
const chatReset = document.getElementById("chat-reset");
const chatMessages = document.getElementById("chat-messages");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatSend = document.getElementById("chat-send");
const chatSuggestions = document.getElementById("chat-suggestions");

// Disimpan hanya di RAM browser (hilang otomatis saat refresh/tutup tab)
let chatHistory = [];

function escapeHtml(text) {
  return text
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, "\"");
}

function formatBotText(text) {
  return escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");
}

function appendBubble(text, type = "bot") {
  const div = document.createElement("div");
  div.className = `chat-msg ${type}`;
  if (type === "bot") {
    div.innerHTML = formatBotText(text);
  } else {
    div.textContent = text;
  }
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return div;
}

function initTemporaryChat() {
  chatHistory = [];
  chatMessages.innerHTML = "";
  appendBubble(
    "Halo! Saya asisten sementara Peer Polimedia. Ada yang bisa dibantu untuk menyiapkan topik atau catatan konsultasi dosen?",
    "bot"
  );
}

function toggleChat(forceOpen) {
  const isOpen = typeof forceOpen === "boolean" ? forceOpen : !chatWindow.classList.contains("open");
  chatWindow.classList.toggle("open", isOpen);
  chatWindow.setAttribute("aria-hidden", String(!isOpen));
  chatToggle.setAttribute("aria-expanded", String(isOpen));
  if (isOpen) chatInput.focus();
}

async function sendChatMessage(userText) {
  const trimmed = userText.trim();
  if (!trimmed) return;

  appendBubble(trimmed, "user");
  chatHistory.push({ role: "user", parts: [{ text: trimmed }] });

  chatInput.value = "";
  chatInput.disabled = true;
  chatSend.disabled = true;

  const typingBubble = appendBubble("Mengetik...", "bot typing");

  try {
    const response = await fetch("/.netlify/functions/gemini-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ history: chatHistory })
    });

    const result = await response.json().catch(() => ({}));
    typingBubble.remove();

    if (!response.ok) {
      throw new Error(result.error || "Gagal menghubungi asisten AI.");
    }

    appendBubble(result.reply, "bot");
    chatHistory.push({ role: "model", parts: [{ text: result.reply }] });
  } catch (error) {
    typingBubble.remove();
    // Hapus pesan user terakhir dari konteks jika request gagal
    chatHistory.pop();
    appendBubble(error.message || "Koneksi bermasalah. Silakan coba lagi.", "error");
  } finally {
    chatInput.disabled = false;
    chatSend.disabled = false;
    chatInput.focus();
  }
}

chatToggle.addEventListener("click", () => toggleChat());
chatClose.addEventListener("click", () => toggleChat(false));
chatReset.addEventListener("click", () => initTemporaryChat());

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  sendChatMessage(chatInput.value);
});

chatSuggestions.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-prompt]");
  if (btn && !chatSend.disabled) {
    sendChatMessage(btn.dataset.prompt);
  }
});

initTemporaryChat();