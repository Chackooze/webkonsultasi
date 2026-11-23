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
