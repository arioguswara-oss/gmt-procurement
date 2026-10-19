# GMT Procurement ↔ AI Workspace — Kontrak kerja V0 (DRAFT)

Tanggal: 2026-10-19. Owner keputusan: Rio. Operator: Mas Supriyanto. Status: **DESIGN ONLY**, tidak mengaktifkan integrasi atau menulis Google Drive.

## Prinsip sumber data

- **Procurement App adalah satu-satunya sumber kebenaran transaksi** untuk project/inquiry, customer/partner master, quotation resmi, approval/status, PO, fulfillment, invoice, pembayaran dan activity log sesuai fungsi yang *benar-benar* terimplementasi.
- **Google Drive Workspace adalah ruang kerja AI bersama Mas Supri** untuk analisis, pengumpulan referensi supplier, katalog, spesifikasi barang, RFQ template, draft surat/email, perbandingan penawaran kerja, proposal dan SOP. Worksheet perbandingan **bukan** approval/quotation resmi.
- AI membantu menyusun, menandai ketidakpastian, merangkum bukti, dan memberi opsi. AI **tidak** dapat mengirim email/WA, menyetujui supplier, mengubah nilai transaksi final, atau menciptakan status/progress resmi tanpa aksi user berwenang.
- Mas Supri memeriksa output, mengirim RFQ/email sendiri melalui Webmail, dan memutuskan bahan yang diserahkan ke proses resmi dalam App. Rio memberi keputusan akhir perubahan scope, integrasi, production, deployment.

## Fakta audit source baseline (bukan pemeriksaan hosting)

- `Project.id` adalah ID internal BigInt; `Project.gmtReference` unik (`apps/api/prisma/schema.prisma`).
- `GET /projects/:id` dan `GET /projects` sudah ada dan menggunakan `JwtAuthGuard` (`apps/api/src/projects/projects.controller.ts`).
- `GET /projects/:projectId/documents`, `POST /projects/:projectId/documents`, serta `GET /documents/:id/download` tersedia. Modul `DocumentsService` menyimpan file ke `STORAGE_ROOT` filesystem aplikasi, **bukan Drive**; model `Document` sudah bisa mengaitkan record ke `projectId` dan ID transaksi tertentu.
- `Quotation.rfqNo` hanyalah sebuah field dari *customer quotation*; jangan diartikan sebagai modul lifecycle supplier RFQ.
- API dokumen saat snapshot hanya menunjukkan `JwtAuthGuard` pada controller. **Belum terlihat pembatasan per-user/per-project di list/download/upload; perlu security review dan negative tests sebelum ada integrasi.** Jangan menganggap setiap user login berhak semua file.
- Evidence source hanya dari ZIP yang dikonfirmasi Rio. Code hosting dan DB aktual belum diverifikasi. Source *selective staged*, belum diimpor ke GitHub, belum build/regression.

## Alur manual tahap awal (tidak perlu fitur baru)

1. **APP:** Mas Supri mengidentifikasi project yang sudah ada; salin `gmtReference` dan, jika melalui UI/API berwenang, `Project.id`. Jangan memindahkan data customer sensitif ke AI tanpa kebutuhan dan izin.
2. **WORKSPACE:** AI membantu membuat dokumen kebutuhan barang dengan `gmtReference`, revisi dan tanggal; cari supplier existing dan kandidat baru dari sumber tepercaya; pisahkan fakta/verifikasi dari usulan.
3. **WORKSPACE:** siapkan draft RFQ dan lampiran spesifikasi, kumpulkan tanggapan supplier dan buat perbandingan teknis/komersial. Tandai asumsi kurs, PPN, delivery, validitas, lead time dan kelengkapan sertifikat; data belum terverifikasi harus ditandai.
4. **HUMAN:** Mas Supri memeriksa daftar supplier, penerima, spesifikasi, deadline dan angka. Pengiriman RFQ dilakukan **oleh Mas Supri**, bukan AI. Draft mail IMAP APPEND baru jika integrasi benar-benar dibangun, disetujui, dan diaktifkan.
5. **APP:** hanya nilai yang sudah disetujui dan relevan transaksi dicatat melalui alur aplikasi existing oleh user berwenang. Jangan menyamakan worksheet dengan official approval, jangan sinkronisasi otomatis.
6. **WORKSPACE:** simpan referensi dokumen/hasil review sesuai izin; jangan mengunggah ulang seluruh data aplikasi ke Drive, dan jangan menghapus artefak asli tanpa kebijakan retensi.

## Kontrak referensi dokumen (desain; belum menjadi integrasi)

Minimal metadata kerja per dokumen:
- `gmtReference`: string yang **persis** mengacu project existing; jangan membuat nomor baru atau menebak.
- `projectId`: ID internal dari App bila sudah **terverifikasi**, bukan nomor hasil asumsi.
- `documentKind`: `SPECIFICATION`, `SUPPLIER_RESEARCH`, `RFQ_DRAFT`, `SUPPLIER_QUOTE`, `COMPARISON_WORKING`, `APPROVED_SUPPORT`, `SOP`.
- `revision`, `preparedAt`, `preparedBy`, `reviewedBy` (kosong sampai benar-benar direview), `reviewStatus` (`DRAFT`, `NEEDS_REVIEW`, `REVIEWED`; tidak berarti status transaksi), dan `sourceEvidence`.
- `fileId` Drive serta `sha256` file opsional **baru setelah** akses dan checksum terverifikasi; file ID tidak boleh dikarang. Catatan dokumen tidak memuat credential/password/token.
- `appEntityType`/`appEntityId` opsional untuk referensi `Quotation` atau `PurchaseOrder` resmi **hanya jika valid**. Jangan memasukkan URL Google Drive ke `Document.storagePath` aplikasi tanpa desain migrasi/adaptor, sebab field itu dipakai filesystem lokal dan download API.

## Batas Google Drive yang TIDAK BOLEH dilanggar

- Hanya folder **Gayuh Mandala Storage Share**, ID `1Zdui1O0CEA0YvQhSQu2P7Q6Tr2hqP_0A`, dan subfolder/berkas dengan parent/ancestry yang terbukti berada di dalamnya.
- Tidak ada search global Drive, root/My Drive, recent lintas Drive, atau membaca metadata file yang belum diverifikasi ancestry-nya.
- Default **READ-ONLY**. Create/edit/upload/delete/share/permission/move memerlukan instruksi eksplisit Rio untuk target tertentu di dalam cakupan. Kehadiran file/folder bukan izin integrasi write.
- Tidak perlu memindahkan ZIP source asli 200 MB ke Hermes/production untuk operasional Workspace.
- Semua akses AI dan perubahan dokumen harus mengikuti hak akses dan audit log; akses connector teknis bukan perluasan izin.

## Quality gate, keharusan sebelum integrasi App↔Drive

1. Verify read-only source route, authentication, *per-project access*, partner/customer ACL, dan MIME/size/path checks. Negative tests untuk user yang tidak berhak.
2. Periksa `Project.id`, `gmtReference` unik, file ID asli, status/dokumen origin, checksum dan ancestry ke folder yang diizinkan; **fail-closed** bila tidak dapat diverifikasi.
3. Desain relasi baru/adapter **secara terpisah**; jangan menimpa `Document.storagePath` existing, jangan duplikasi data transaksi, jangan migrate schema production otomatis.
4. Scope layanan IMAP/WA (jika dibangun) tetap OFF, no SMTP AI, draft hanya jika diotorisasi; Mas Supri saja yang mengirim email.
5. Test idempotensi/revisi/audit trail, data sanitization, supplier confidentiality, dan batas masa simpan; backup/rollback bila ada migration yang disetujui.
6. Semua perubahan pada branch scoped + CI/test yang sesuai; Rio menyetujui gate sebelum hosting/deployment/LOCK.

## Batas fase

**Sekarang:** susun SOP/manual playbook + template reusable tanpa write Drive, audit source dan role. **Berikutnya (berdasarkan bukti kebutuhan):** adapter link dokumen↔transaksi scoped dengan approval. **Nanti:** Supplier Portal; tetap PARKED/ROADMAP.

## Acceptance untuk tugas DESIGN ONLY ini

- Alur input→draft/review→output→app jelas, tanpa klaim auto-send atau auto-approval.
- Ada data contract yang membedakan `gmtReference`, `projectId`, dan Drive file ID.
- Batas Drive, peran AI/Mas Supri/Rio, error handling fail-closed, dan pengujian otorisasi tercatat.
- Tidak ada akses tulis Drive, eksekusi source tak tepercaya, deploy, migration, secret, atau perubahan data production.

## Status

Overall Source/Foundation: source-only staged lokal, GitHub source import PENDING.
Module Progress: desain Workspace DONE_SOURCE, fitur integrasi baru **0% implementasi**.
Source/Test: pemetaan source statis; pengujian integrasi/per-project access PENDING.
Hosting Verification: NOT VERIFIED.
Deploy Readiness: NOT READY.
LOCK Status: NO.
