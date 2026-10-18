# Desain Integrasi Email & Notifikasi — DRAFT / NO DEPLOY
Owner Rio. Operator dan satu-satunya pengirim email: Mas Supriyanto.
Keputusan: Human-in-the-Loop, bukan full auto.

## Batas (default OFF)
- Inbox resmi: marketing@gayuhmandala.co.id via IMAP TLS, host mail.gayuhmandala.co.id, port 993.
- POP3 995 tidak dipakai karena sinkronisasi/flag/thread lebih terbatas.
- SMTP 465 diketahui tersedia di hosting, **tidak diintegrasikan** ke AI atau worker; jangan membuka API send.
- Draft harus benar-benar tersimpan di folder Drafts mailbox via IMAP APPEND **hanya ketika user berwenang meminta**. Draft aplikasi berbeda dari Drafts mailbox.
- WhatsApp resmi perusahaan via Fonnte -> **hanya notifikasi Mas Supriyanto**, bukan promosi dan bukan pengiriman RFQ customer/supplier.
- Belum ada token/nomor WA/credential, fitur OFF sampai Rio memasukkan konfigurasi secara aman dan menyetujui pengujian.

## Alur inbound yang diusulkan
1. Worker IMAP SSL/TLS connect hanya bila `EMAIL_MONITOR_ENABLED=true` dan secret tersedia; polling misalnya tiap 5 menit. IMAP IDLE hanya jika resource dan koneksi hosting memungkinkan.
2. Sinkronisasi pesan dengan kunci mailbox + UIDVALIDITY + UID untuk cursor, dan Message-ID hanya sebagai korelasi tambahan. Perhatikan perubahan UIDVALIDITY dan recovery.
3. Simpan metadata minimal: mailbox ID, message ID, sender, subject yang disanitasi, tanggal, lampiran metadata/hash, klasifikasi dan confidence; jangan simpan body penuh tanpa kebijakan retensi/izin.
4. Classifier deterministik dahulu, AI opsional. Kategori INQUIRY_CUSTOMER / RFQ_CUSTOMER / QUOTATION_SUPPLIER / OTHER / NEEDS_REVIEW. Jangan otomatis menetapkan transaksi final.
5. Buat event yang terhubung ke referensi project/RFQ existing jika verifikasi cocok, selain itu antre untuk verifikasi manusia.
6. In-app notification untuk user ber-role yang telah diberi izin, bukan publik. Link hanya route dalam Procurement yang mensyaratkan login.
7. Push event ke outbox WhatsApp (unique event type + entity key + recipient + version). Kirim ke Fonnte HANYA jika outbound admin-enabled dan pengirim/penerima terkonfigurasi.
8. Simpan dokumen resmi ke Workspace **hanya** di folder Gayuh Mandala Storage Share dengan ancestry/ACL terverifikasi, idempotency/hash, link ke ID transaksi yang stabil. Jangan jadikan Drive sebagai pengganti database transaksi.

## Fonnte boundary
- Gunakan device token spesifik GMT, disimpan hanya di server-side secrets store/encrypted storage; jangan token di browser, URL, log, repo, atau email. Prefer rotate; jangan memakai account token device management.
- Endpoint API POST Fonnte memakai Authorization header; tidak ada API call dari frontend.
- Test Connection memakai endpoint device/profile dan tindakan admin; **bukan** Send Test. Tombol Send Test perlu izin eksplisit Rio dan target nomor yang disetujui, default disabled.
- Jangan mengirim lampiran atau teks harga/identitas pribadi lewat WhatsApp. Pesan hanya event type, reference ID, deadline jika diizinkan, dan tautan aplikasi.
- Status request accepted/queued tidak sama dengan delivered. Callback status perlu signature/secret verification + replay guard + mapping outbox; jangan menganggap sent sampai bukti.
- Retry dengan exponential backoff dan capped attempts. Timeout ambigu tidak boleh membuat double-send; mark UNKNOWN dan manual reconciliation sebelum retry. In-app harus tetap bekerja ketika Fonnte down.
- Rate limit, dedupe, quiet hours dan per-receiver preferences diperlukan sebelum aktivasi.

## UI Pengaturan (admin-only)
- Settings > Integrations > Email (IMAP) dan WhatsApp Fonnte.
- Field: incoming host/port/TLS, mailbox username, secret reference; tombol Check Connection (read-only), status/sync last-run, folder mapping Drafts, enable switches OFF by default.
- Fonnte: nomor pengirim, token input sekali pakai (write-only), penerima Mas Supriyanto, sender status, Test Connection (no-send), enable notifikasi OFF.
- Audit setiap perubahan konfig tanpa log nilai token, akses RBAC server-side (tidak cukup UI hide).

## Matriks kewenangan
| Operasi | AI/worker | Mas Supriyanto | Rio |
|---|---|---|---|
| Membaca email scoped inquiry/RFQ | setelah grant scoped | boleh sesuai role | mengizinkan |
| Menyiapkan draft mailbox | setelah grant write Drafts | memeriksa/mengedit | mengizinkan policy |
| Mengirim email | DILARANG | HANYA SUFRI (via Webmail) | policy owner |
| Membuat/menyetujui supplier, harga | memberi rekomendasi | review/operasional | final approval scope |
| Mengubah produksi/activate gateway | DILARANG tanpa persetujuan | tidak otomatis | hanya Rio |

## Acceptance criteria (wajib sebelum deploy)
1. Unit tests classifier: email baru/revisi/duplikat/malformed sender/unknown.
2. Sync tests: replay IMAP UID; UIDVALIDITY berubah; reconnect; no duplicate notification.
3. Security tests: tanpa secret startup aman dan OFF, denied non-admin settings, tidak ada SMTP client, token tidak keluar di response/log/error.
4. Draft tests: APPEND folder Drafts yang tepat (mock), bukan Send; jika gagal tetap tidak mengirim.
5. Fonnte mocked: disabled => zero HTTP; connection check no-send; timeout=> UNKNOWN tanpa automatic duplicate; scoped recipient.
6. DB migration jika diperlukan: schema metadata verified, backup, additive-only, rollback dan approval Rio.
7. Integration testing dilakukan dengan stub/mock; real IMAP dan WhatsApp hanya diuji manual setelah izin dan hanya di lingkungan yang disetujui.
8. Dokumentasi: exact source SHA, test results, checksum ZIP, fail-safe, runbook dan rollback.

## Referensi teknis
- Fonnte token keamanan: https://docs.fonnte.com/token-api-key/
- Device profile (cek koneksi tanpa send): https://docs.fonnte.com/api-device-profile/
- Fonnte send API: https://docs.fonnte.com/api-migration/
