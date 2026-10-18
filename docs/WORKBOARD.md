# GMT PROCUREMENT WORKBOARD — 2026-10-19
Owner/final approver: Rio. Operator Procurement: Mas Supriyanto.
Repo: arioguswara-oss/gmt-procurement (PRIVATE).
Production: procurement.gayuhmandala.co.id (tidak disentuh).
Reference: gmt-procurement.zip diserahkan Rio, **dianggap source aktif atas konfirmasi Rio**, runtime/database tetap belum diverifikasi.

## Checkpoint dan lane
| Lane | Owner | Status | Ownership dan fokus | Blocker | Next action |
|---|---|---|---|---|---|
| P0-REPO | ChatGPT | DONE_SOURCE | README, .gitignore, docs/* | Tidak ada | Review Rio |
| P0-IMPORT | ChatGPT/Rio | IN_PROGRESS | Sanitasi source ZIP v0.15.0 (146 kandidat file; tanpa node_modules/dist/log/patch) | Belum diimpor ke GitHub, verifikasi sanitasi & kelengkapan | Import source-only setelah review |
| P1-EMAIL | Codex | READY | apps/api/src/integrations/email/* (rencana) | Menunggu import baseline | Implement IMAP readonly/off; draft APPEND dibatasi dan approval; tidak ada SMTP |
| P1-NOTIFY | Codex | READY | apps/api/src/notifications/*, UI Notification Center (rencana) | Menunggu import baseline | Outbox idempotent + admin settings + in-app notifications |
| P1-FONNTE | Codex | READY | apps/api/src/integrations/fonnte/* (rencana) | Menunggu import baseline | Gateway server-side; token terenkripsi/rahasia; default OFF, mock tests |
| P2-WORKSPACE | ChatGPT/Codex | BLOCKED_APPROVAL | Integrasi dokumen ke Google Drive yang diizinkan | Belum ada integrasi/API desain disetujui | Verifikasi ancestry, ACL, relasi transaction ID; read-only default |
| P2-SUPPLIER | Codex | READY | Supplier sourcing/RFQ per audit existing | Membutuhkan audit detail dan pemisahan role | Identifikasi EXISTING/GAP sebelum edit |

Status: READY / IN_PROGRESS / DONE_SOURCE / BLOCKED_HOSTING / BLOCKED_APPROVAL / PAUSED_RESET. Jangan mengambil atau mengubah lane lain yang IN_PROGRESS.

## Evidence audit
- ZIP: 200,209,381 bytes; 37,761 entri; integritas CRC lengkap diperiksa.
- SHA-256 arsip: `25ce1448015b34144dc16a67609a61f9ad5dd7ef70fd647b401c3d22caf06813`.
- Package root 0.15.0, Node >=22; NestJS API, React/Vite frontend, Prisma/MariaDB; source module Project, Partner, Quotation, Document, Activity.
- Prisma schema terdeteksi: 25 model. Belum ada database production yang diperiksa.
- Tidak ditemukan implementasi lengkap konektor IMAP, Fonnte, Notification Center pada source awal; tidak berarti tidak ada layanan di hosting.
- ZIP memiliki banyak node_modules/dist dan patch historis; jangan unggah apa adanya.
- Pemindaian pola credential sederhana pada kandidat file source tidak menemukan kecocokan; **bukan** jaminan bebas rahasia.
- Endpoint quotation `POST /quotations/:id/send` di source teridentifikasi sebagai alur status quotation, **bukan** integrasi SMTP. Jangan menyamakannya dengan email terkirim.

## Aturan wajib
1. SOURCE OF TRUTH kode: repo ini; baseline production ZIP tidak otomatis sama dengan runtime hosting.
2. Google Drive: hanya folder Gayuh Mandala Storage Share, ID `1Zdui1O0CEA0YvQhSQu2P7Q6Tr2hqP_0A`, anak yang parent/ancestry-nya terbukti. Tidak ada pencarian lintas Drive.
3. User email resmi: marketing@gayuhmandala.co.id, IMAP 993 SSL/TLS; credential **tidak** dikirim di chat atau GitHub.
4. Human-in-the-loop: AI baca/analisis/draft; hanya Mas Supriyanto kirim email; Rio approval final produksi.
5. Fonnte hanya pengingat WA untuk Supriyanto, bukan komunikasi customer/supplier; default OFF dan no-send selama development.
6. No access ke SANRO code/data; website WordPress gayuhmanda LOCKED tidak disentuh.
7. Tidak ada deploy/merge/migration/perubahan business rule/aktivasi eksternal otomatis; perlu Rio.

## Gate menuju rilis
WORK → TESTING → READY TO DEPLOY → HOSTING VERIFIED → LOCKED.
Progres source tidak disamakan dengan hosting. READY TO DEPLOY hanya jika syntax + scoped regression + secret scan + manifest SHA + migration plan (jika diperlukan) + preflight/rollback dinyatakan PASS, kemudian Rio memberi keputusan. Deployment dilakukan Rio sendiri dan paket ZIP hanya disimpan di folder Drive yang diizinkan.

## Laporan status
- Overall Source/Foundation: baseline repository disiapkan, kode produksi belum diimpor.
- Module Progress: integrasi baru 0% implementasi.
- Source/Test: ZIP integrity PASS; syntax/regression CI belum dijalankan.
- Hosting Verification: NOT VERIFIED.
- Deploy Readiness: NOT READY.
- LOCK: NO.
