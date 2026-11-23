# Peer Polimedia — Website Konsultasi Dosen

Website statis HTML, CSS, JavaScript yang dapat di-deploy ke Netlify. Pengajuan formulir dikirim oleh Netlify Function ke Discord melalui Discord Incoming Webhook.

## Struktur
- `index.html` — halaman/form konsultasi
- `style.css` — tampilan responsif
- `script.js` — validasi dan pengiriman form
- `netlify/functions/submit-consultation.js` — validasi server-side dan pengiriman ke Discord
- `netlify.toml` — konfigurasi deploy Netlify

## Deploy ke Netlify
1. Buat repository GitHub baru.
2. Upload seluruh isi folder ini ke root repository (pastikan `index.html` berada di root).
3. Di Netlify pilih **Add new site → Import an existing project**, lalu hubungkan repository.
4. Build command dikosongkan; publish directory gunakan `.`. File `netlify.toml` sudah menyetel konfigurasi ini.
5. Deploy site.

## Buat Discord webhook
1. Buka Discord server dosen dan pilih channel tujuan, misalnya `#pengajuan-konsultasi`.
2. Edit Channel → Integrations → Webhooks → New Webhook.
3. Salin webhook URL. Jangan bagikan URL ini dan jangan commit ke GitHub.

## Tambahkan environment variable di Netlify
Site configuration → Environment variables → Add a variable:
- Key: `DISCORD_WEBHOOK_URL`
- Value: URL Discord webhook yang disalin tadi.

Simpan lalu lakukan **Redeploy** agar function menerima environment variable.

## Uji
Buka URL Netlify, isi formulir, lalu kirim. Pesan embed akan muncul di channel Discord.
Endpoint function: `/.netlify/functions/submit-consultation`.

## Batasan versi sederhana
- Belum ada akun/login mahasiswa atau dosen.
- Belum menyimpan riwayat pengajuan di database; ID pengajuan hanya dibuat saat pengiriman.
- Status yang tampil adalah `menunggu konfirmasi dosen`; dosen perlu membalas melalui Discord/kontak lain.
- Discord Incoming Webhook hanya mengirim pesan satu arah. Tombol Terima/Tolak yang mengubah status website memerlukan Discord Bot + endpoint interaksi dan penyimpanan data (misalnya Netlify Blobs/Supabase).
- Ini bukan sistem autentikasi; siapa pun yang mengetahui URL website dapat mengirim formulir. Untuk penggunaan kampus, tambahkan CAPTCHA/rate limit dan validasi identitas sebelum dipakai publik.

## Catatan
Website ini memakai JavaScript (bukan Java). Tidak ada kredensial Discord di sisi browser; webhook hanya dibaca oleh Netlify Function dari environment variable.
