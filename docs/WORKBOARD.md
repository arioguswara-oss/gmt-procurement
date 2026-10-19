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
- Prisma schema terdeteksi: 24 model (dihitung ulang dari deklarasi model). Belum ada database production yang diperiksa.
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

## Checkpoint berikutnya — 2026-10-19
- PR #1 DRAFT: https://github.com/arioguswara-oss/gmt-procurement/pull/1
- Last verified source SHA before checkpoint: `f1f0c6112cc7bca60282a12e25453187589fd5ad`; main baseline `e081ffcb6a92fe56b6ee6d35a454440dcb53807d`.
- Source-review artifact dibuat lokal: `gmt-procurement-source-REVIEW-20261019.zip`, 147 file (144 original terpilih + 3 metadata/safety).
- Review artifact SHA256: `a4ee69ab99e898068409d79c508cd7eb0b07400db9da302dd0e2b1c4b31f749d`; ZIP CRC PASS. **Bukan deploy-ready**.
- Syntax-only parser TypeScript/TSX: 113 file PASS (0 diagnostics); belum build/full test karena dependencies dan DB test belum dipersiapkan.
- scripts/source_guard.py dan 3 unittest: local PASS setelah fixture disesuaikan. GitHub Actions pada PR #1 berstatus FAILURE tanpa langkah job runner pada API. **CI BLOCKED — penyebab belum terverifikasi**; jangan klaim CI pass atau merge.
- Tidak ada IMAP login, tidak ada panggilan Fonnte, tidak ada Drive write, perubahan database, ataupun hosting/deployment.
- NEXT SAFE ACTION: verifikasi penyebab workflow gagal dari halaman GitHub Actions, lanjut audit source/seed terpisah, kemudian import source-only ke development branch setelah sanitasi dan review. Jangan merge main sampai seluruh gate sesuai.

## Checkpoint P0-IMPORT — 2026-10-19 (source import preflight)
- Lane P0-IMPORT owner ChatGPT: masih **IN_PROGRESS**, source lengkap belum masuk repository.
- New PR #4 DRAFT: https://github.com/arioguswara-oss/gmt-procurement/pull/4
- Source gate baru: `scripts/audit_source_zip.py` (read-only, fail-closed, tidak extract/upload/execute), `scripts/test_audit_source_zip.py` (empat unit test sintetik), `docs/SOURCE_IMPORT_GATE.md`.
- Perbaikan keamanan: pemeriksaan path traversal, root ZIP ambigu, symlink, duplicate path, batas ukuran, binary, indikasi credential; hasil tidak mengungkap isi file.
- **Status source baru: DONE_SOURCE; test belum dieksekusi**, karena tool pemrosesan lokal file sedang tidak tersedia. Jangan klaim tes PASS.
- Source ZIP historis (konfirmasi Rio): `gmt-procurement.zip`, 200.209.381 bytes; verifikasi isi ulang belum terlaksana pada sesi ini; tidak perlu upload ulang sampai terbukti perlu.
- Hermes: uji runner awal PR #3 PASS 3 tests dan IDLE PASS, bukan bukti PR #4 maupun full app CI.
- Blockers: perlu akses byte ZIP untuk pemeriksaan ulang; test script gate harus dijalankan di sandbox Hermes sebelum import source; full build/test belum ada.
- NEXT: verifikasi `python3 -m unittest discover -s scripts -p 'test*.py' -v` dan preflight ZIP pada lingkungan yang memperoleh source secara sah, lalu scoped source import; tidak ada merge/deploy/migration.
- Hosting Verification: NOT VERIFIED. Deploy Readiness: NOT READY. LOCK: NO.

## Checkpoint P0-IMPORT — Hermes ZIP Gate unit tests (2026-10-19, 04:09 WIB)
- Screenshot Rio menunjukkan perintah pengujian `sudo -H -u gmtci bash` mengambil dua file langsung dari **commit terverifikasi** `668be644cf60cfdc3e3aab0f7a3b291466874bfd` menggunakan `git archive` ke direktori sementara.
- Test dijalankan dengan `bwrap --unshare-user --unshare-pid --unshare-net` dan source test dimount read-only.
- Keempat tes lulus: valid archive requires review, unsafe path fail closed, sensitive content blocked, runtime files never candidates.
- Log akhir `Ran 4 tests ... OK` dan `ZIP_GATE_TEST_PASS`; prompt terminal kembali. Folder sementara diatur untuk dibersihkan via trap.
- **FAKTA:** Gate unit tests **4/4 PASS** di Hermes. BUKAN bukti ZIP `gmt-procurement.zip` sendiri telah diaudit, diimpor, atau siap deploy.
- **NEXT:** pemeriksaan sumber ZIP aktual dengan read-only preflight di lingkungan tepercaya yang memiliki ZIP tersebut. Tinjau hasil, lakukan manual secret review sebelum import source-only; jangan transfer ZIP berisi potensi credential ke VPS hanya demi tes.
- Code/Test: ZIP gate tests PASS; build/regression aplikasi PENDING. Hosting: NOT VERIFIED. Deploy readiness: NOT READY. LOCK: NO.

## Checkpoint P0-IMPORT — selective extraction preparation (2026-10-19)
- `ClientError` pada alat pemrosesan Python/container ChatGPT masih terulang bahkan untuk operasi sederhana; bukan bukti ZIP asli rusak atau hosting Procurement bermasalah.
- File baru scoped pada branch P0-IMPORT: `scripts/stage_source_zip.py` (local-only extraction of allowlisted source, requires archive SHA-256 match and `audit_source_zip.inspect` review-required), `scripts/test_stage_source_zip.py` (empat uji sintetik), serta `docs/SOURCE_IMPORT_GATE.md` diperbarui.
- Skrip hanya dapat menulis ke **direktori lokal baru** yang dipilih operator (bukan Drive/hosting), tidak menjalankan kode ZIP, tidak mengunggah source, dan berhenti fail-closed jika audit ditolak.
- **FAKTA:** code baru tersimpan di GitHub PR #4 DRAFT; **tes untuk `stage_source_zip.py` BELUM PASS/berjalan**, dan belum pernah dijalankan terhadap `gmt-procurement.zip` yang asli.
- Previous evidence: audit gate test 4/4 PASS di Hermes, idle CI 0 proses saat dicek, tetapi tidak mencakup perubahan baru ini.
- NEXT: jalankan 8 unit tests untuk gate+stager pada sandbox Hermes *on-demand* tanpa ZIP produksi; lalu lakukan source ZIP read-only scan dan selective staging hanya ketika file dapat diakses di lingkungan kerja lokal yang aman.
- Source completeness: historical review package bukan artifact build; manifest/asset/lockfile/migration perlu review sebelum full import.
- Source/Test: 4/4 gate tests PASS historis, stager tests PENDING, build PENDING. Hosting: NOT VERIFIED. Deploy Readiness: NOT READY. LOCK: NO.

## P0-IMPORT checkpoint — 2026-10-19 (local source ZIP available again)
- Source ZIP berhasil dibaca secara lokal dan CRC test PASS; 200.209.381 bytes; 37.761 entries; SHA256 cocok: `25ce1448015b34144dc16a67609a61f9ad5dd7ef70fd647b401c3d22caf06813`.
- **IN_PROGRESS**: source-only candidate berhasil distage lokal (128 file / 322.562 bytes; compressed 128.217 bytes), candidate ZIP SHA256 `de2673a06b9975b722078c825a72c8c9d68e4e1edb5fffa3133d599bea38bbe5`, CRC PASS, manifest includes hashes.
- Safety screening: no blocker with local allowlist and pattern scan, but secret/PII clearance manual PENDING. No `.env*`, storage, logs, uploads, third-party node_modules, historic patches, or seed scripts.
- Syntax-only TypeScript parser **113/113 files, 0 diagnostics**; relative import resolution **333 references, 0 missing**. **NOT** complete build/CI/regression.
- Dependency issue: no root lockfile in original ZIP; reproducibility/baseline dependency graph PENDING. Schema 24 Prisma models, 20 module files and 16 controller files inventoried.
- **NOT DONE**: source import to GitHub, dependency build, environment/hosting verification, migrations, deployment, lock.
- PR #4 remains DRAFT. GitHub docs/SOURCE_IMPORT_GATE.md now captures this checkpoint; source candidate remains private/local and is **NOT a deploy ZIP**.
- NEXT: scoped manual security/completeness audit and lock strategy, then import to dedicated branch; no production/Drive writes, no SANRO changes.
- Progress summary: Overall Source/Foundation = selective staging DONE_SOURCE but import IN_PROGRESS; Module Progress = audit only; Source/Test = syntax PASS / build PENDING; Hosting = NOT VERIFIED; Deploy = NOT READY; LOCK = NO.

## Static module audit checkpoint — 2026-10-19
- Ref: `docs/PROCUREMENT_FEATURE_BASELINE_AUDIT_20261019.md` added on P0-IMPORT branch. Source only, not runtime/hosting evidence.
- **EXISTING in source:** project/inquiry, BusinessPartner/contacts, customer quotation revisions/status, PO, delivery/receiving, invoices/receipts/payments, documents/activity, auth/role guards.
- **GAP CANDIDATES pending validation:** supplier-specific sourcing/onboarding, supplier RFQ lifecycle, supplier quotations/comparison, approval/bidding, Supplier Portal parked. `Quotation.rfqNo` existing must not be confused with supplier RFQ lifecycle.
- No module implementation in this audit, no imports to GitHub, no business-rule/schema changes.
- Module Progress: existing modules inventoried; supplier flow functional validation and requirements acceptance remain PENDING.
- Source/Test: 113 TS/TSX parse PASS; 333 relative imports resolution PASS; full build/integration PENDING.
- Hosting Verification: NOT VERIFIED. Deploy Readiness: NOT READY. LOCK: NO. Next: manual security/lockfile/build planning, then source import and scoped tests.

## Architecture decision from Rio — 2026-10-19: AI Workspace for Mas Supri
- **Koreksi scope penting:** diskusi kebutuhan Mas Supri **bukan** perintah mengimplementasikan semua poin sebagai fitur aplikasi. Procurement existing tetap source of truth transaksi; Google Drive Workspace untuk riset/analisis/katalog/spesifikasi/RFQ template/draft/komparasi pendukung, AI membantu Mas Supri.
- Rujukan klasifikasi prioritas: `docs/PROCUREMENT_FEATURE_BASELINE_AUDIT_20261019.md` (bagian `Keputusan arsitektur Rio`). Supplier Portal masih ROADMAP. Fitur supplier RFQ/approval baru **tidak boleh langsung dibangun** hanya berdasarkan adanya gap di audit source.
- AI tidak mengirim email/WA dan tidak mengganti status transaksi otomatis. Draft email hanya dengan kontrol dan review; Mas Supri yang mengirim.
- Google Drive tetap **READ-ONLY by default** dan hanya `Gayuh Mandala Storage Share`, ID `1Zdui1O0CEA0YvQhSQu2P7Q6Tr2hqP_0A`; ancestry per file wajib diverifikasi, dilarang akses lintas Drive. Aktivasi write/integrasi butuh instruksi eksplisit Rio.
- Jika perlu menghubungkan dokumen ke App, desain ID stabil, ACL, fail-closed dan audit trail terlebih dahulu; folder dapat dibaca bukan bukti integrasi tersedia.
- **Penyesuaian prioritas:** P2-WORKSPACE = perumusan workflow/dokumen dan permission (BLOCKED_APPROVAL untuk setiap Drive write); P2-SUPPLIER = audit existing + klasifikasi workspace/app dahulu, bukan coding otomatis. P0-IMPORT tetap IN_PROGRESS tanpa benturan lane.
- Status: Overall Source/Foundation staged lokal, import PENDING; Module Progress belum ada implementasi baru; Source/Test syntax PASS, full build/regression PENDING; Hosting NOT VERIFIED; Deploy NOT READY; LOCK NO.


## P0-IMPORT dependency preflight — 2026-10-19
- File baru `docs/BUILD_DEPENDENCY_SAFETY_20261019.md` mendokumentasikan entry `package.json` source ZIP v0.15.0, tidak menjalankan package scripts.
- **DILARANG dieksekusi tanpa scoped approval/isolated DB:** `prisma:push:staging` (`prisma db push`), `prisma:seed`, `setup:staging` (termasuk seed), serta `apps/api` `prisma:migrate` (`migrate dev`).
- Tidak ditemukan root dependency lockfile; jangan menjalankan `npm install` tak terkontrol, mengasumsikan build reproduksibel, atau memakai production DB. Tes build/regression masih PENDING.
- GitHub source import tetap PENDING manual security/completeness; PR #4 tetap DRAFT, tidak ada deployment.
- Status: Overall Source/Foundation source-only staged / import PENDING; Module Progress static audit; Source/Test syntax PASS, build PENDING; Hosting NOT VERIFIED; Deploy NOT READY; LOCK NO.
