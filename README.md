# GMT Procurement — PT Gayuh Mandala Teknika

Repository **PRIVATE** khusus pengembangan aplikasi existing di `procurement.gayuhmandala.co.id` (bukan website WordPress `gayuhmandala.co.id`, dan bukan SANRO).

## Status awal
- Source aktif diserahkan Rio sebagai `gmt-procurement.zip` pada 19 Oktober 2026.
- Aplikasi existing: NestJS, React/Vite, Prisma/MariaDB.
- **Source aplikasi belum diimpor ke repository ini.** Import wajib melalui audit dan pembersihan credential/data runtime dahulu.
- Branch `main` adalah baseline terlindungi; perubahan aplikasi melalui branch pengembangan dan review.
- **Tidak ada izin otomatis** untuk menulis database production, menjalankan migration, mengirim email/WhatsApp, merge PR, atau deploy.

## Alur rilis
Audit source → branch scoped → pemeriksaan syntax/test → review Rio → paket rilis di folder **Gayuh Mandala Storage Share** (Google Drive) → **Rio** mengerjakan deployment manual dan verifikasi hosting.

## Integrasi yang direncanakan (default OFF)
1. IMAP cPanel `marketing@gayuhmandala.co.id`: membaca inquiry/RFQ dan quotation untuk diverifikasi.
2. Draft email disimpan ke folder Drafts mailbox; **hanya Mas Supriyanto** berwenang mengirim email.
3. Notification Center aplikasi serta Fonnte untuk pengingat inquiry/RFQ kepada Mas Supriyanto.
4. Workspace Google Drive: arsip dokumen hanya dalam folder ID `1Zdui1O0CEA0YvQhSQu2P7Q6Tr2hqP_0A`; transaksi resmi tetap di Procurement.

**Security:** Jangan commit `.env`, token, password, DB dump, storage uploads, log, `node_modules`, atau `dist`. Jangan mengakses isi Drive di luar folder yang diizinkan, meski koneksi teknis dapat menjangkaunya.

Owner / final approver: **Rio**. Operasional Procurement: **Mas Supriyanto**. Human-in-the-Loop wajib.
