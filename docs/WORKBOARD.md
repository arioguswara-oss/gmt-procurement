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


## P0-IMPORT checkpoint — candidate verification 2026-10-19
- Latest checkpoint details: `docs/SOURCE_CANDIDATE_VERIFICATION_20261019.md`. New code: `scripts/verify_source_candidate.py`, `scripts/test_verify_source_candidate.py` (same branch; PR #4 DRAFT).
- **FAKTA TERVERIFIKASI** original ZIP SHA-256 unchanged (`25ce1448015b34144dc16a67609a61f9ad5dd7ef70fd647b401c3d22caf06813`); 37,761 entries; CRC PASS. Source candidate ZIP SHA-256 `de2673a06b9975b722078c825a72c8c9d68e4e1edb5fffa3133d599bea38bbe5`, 128 source files / 322,562 bytes.
- **128/128 staged source files byte-identical** to original ZIP; manifest SHA/size per file MATCH; local content gate result `REVIEW_REQUIRED` with 0 findings. Only heuristics; manual secret/privacy review still needed.
- Added six synthetic candidate verifier unit tests: **6/6 PASS locally** and compared GitHub blobs SHA to same locally tested bytes; source executable code from archive itself NOT run.
- **NOT DONE**: 128 files app source are **not yet uploaded into GitHub**; dependency lock missing, full Nest/Vite build, regression, RBAC negative tests and hosting comparison all PENDING. Connector transfer of local source package requires another secure authorized path; no credential must be exposed.
- P0-IMPORT lane remains **IN_PROGRESS**; no change to PR #5 docs-only Workspace lane, Telegram lane, Hermes server, SANRO or production.
- Next: manual privacy/secret & import completeness review; secure private repo source import on dedicated branch; isolated build after dependency gating.
- Reporting: Overall Source/Foundation candidate verification DONE_SOURCE, import PENDING; Module Progress no new feature; Source/Test candidate gate 6/6 PASS local, build/regression PENDING; Hosting NOT VERIFIED; Deploy NOT READY; LOCK NO.

## P0-IMPORT static AST spot-check — 2026-10-19
- Independent local read-only check with globally installed TypeScript parser: `113` TS/TSX files, `0` syntax diagnostics, `334` relative imports/re-exports/dynamic imports assessed, `0` unresolved. Counts differ from older 333 test because traversal criteria include dynamic import/re-export; no claim full module resolution against npm dependencies.
- New verification script and test blobs identical to tested local copies; **six** synthetic candidate gate unit tests local PASS. Verified candidate ZIP checksum and per-file hashes; status `REVIEW_REQUIRED` rather than deploy approval.
- PR #4 HEAD before this checkpoint `109fff3a6abcc5f5f0ceec8b355024e5910fe4c0`; combined status returned **zero CI checks**. Do NOT label GitHub CI PASS.
- No source app import, no npm install/build, no DB usage, no Hermes actions, no Drive write or production deploy.
- Next gated task: private repo source import via secure tool that can transfer local artifact without credentials; manual secret/privacy review remains required. 


## P0-IMPORT dependency provenance & import-review bundle — 2026-10-19
- Owner ChatGPT, lane `P0-IMPORT` remains **IN_PROGRESS**, source app still not in GitHub. Workboard and new docs updated on PR #4 DRAFT.
- **FAKTA TERVERIFIKASI**: ZIP asli sha256 `25ce1448015b34144dc16a67609a61f9ad5dd7ef70fd647b401c3d22caf06813`. Internal archived `node_modules/.package-lock.json` sha256 `511861fd1a69773bf35948d076910bc8cf8a867faa8c0ae40661fe1db22696f5`: npm v3, 523 package records; all 523 `sha512` entries with `registry.npmjs.org` host; 5 `hasInstallScript` flags. Root manifest 33 direct dependencies found and basic semver-compatible. This internal lock **NOT a root package-lock** and cannot be used directly for npm ci.
- New artifact **locally only** `GMT_Procurement_SOURCE_IMPORT_REVIEW_20261019.zip` SHA256 `2af9eca7398bc3ca40cc4dddfef27eec06dc9738b9a7600156c897ba6865abab`, 127.997 bytes, 126 source files (321.837 bytes) + 2 review metadata files. Excludes historic root README and .gitignore due to existing GitHub path conflicts, confirmed against actual PR #4 tree at `c6c86d3f...`.
- Manifest/per-file SHA and ZIP CRC checked locally. Artifact **REVIEW ONLY, NOT DEPLOYABLE**; no email/credentials printed. Source LoginPage has prefilled email identifier; value not logged/copied to docs, requires UX/privacy review.
- Docs created: `docs/DEPENDENCY_PROVENANCE_FROM_ORIGINAL_ZIP_20261019.md`, `docs/SOURCE_ONLY_IMPORT_HANDOFF_20261019.md`. The private code import handoff has exact ownership/scope/forbidden actions/acceptance/minimum tests.
- **BLOCKERS:** secure transport of 126 source file bytes into GitHub Private (connector text-only; don't use public links or user secrets), manual secret/PII review, root lockfile reconciliation, isolated compile/regression, project-level auth tests, hosting verification.
- NEXT: scoped source import when secure private transfer becomes available; no forced production changes. Hermes CI 8/8 prebuild synthetic PASS and idle PASS earlier, not evidence of full build.
- Status: Overall Source/Foundation verified local import bundle, source GitHub import PENDING. Module Progress no new features. Source/Test static/provenance inspection, full build PENDING. Hosting NOT VERIFIED. Deploy NOT READY. LOCK NO.


## P0-IMPORT source push checkpoint — 2026-10-19 (actual GitHub source commit)
- Rio requested execution without repeating docs-only cycles. Branch `chatgpt/procurement-source-import-20261019` created from reviewed PR #4 source gate at `a0ef363f41def89c105867092d8dfafd9252490f`.
- **ACTUAL IMPORT:** 60 of 126 source files from locally verified `GMT_Procurement_SOURCE_IMPORT_REVIEW_20261019.zip` staged to GitHub private on this new branch. Commits `8e199e24bba57a452eacc41d6b6ec8571da9eefb`, `9d18d9e74c77e0f702bb9438b5514052c7bf6f75`, `cb2cf11fc7d01a8632a1340272bfd1eedeb06cf2`; PR #7 DRAFT: https://github.com/arioguswara-oss/gmt-procurement/pull/7.
- **VERIFICATION:** Tree API reports exactly **60 added app/deploy/root source files**, matching expected ZIP file Git blob hashes via aggregate XOR `5ec872d24d9a43e9702a394feea4ec5166c51164`; tree response untruncated. Total imported payload `30.519` bytes, source identity check **PASS for this subset only**.
- No existing GitHub `README.md`, `.gitignore`, workflows or other agents' files overwritten. No `.env`, node_modules, storage, uploads, migration SQL or production data.
- **Still pending:** 66 larger source files (291.318 bytes), notably Prisma schema and main services/frontend features. Do NOT attempt install/build/deploy on incomplete tree; no app regression/CI attempted. Root lockfile missing in original baseline.
- Source/Foundation: 60/126 **actual imported**, remaining 66 PENDING; Module: existing unchanged, no new business features; Source/Test: 60-file blob identity check PASS, full build/regression PENDING; Hosting NOT VERIFIED; Deploy NOT READY; LOCK NO.
- NEXT: finish exact remaining 66 source imports from original locally verified package with secure file transfer, verify 126/126 Git tree hashes; only after full import, reconcile dependency lockfile and design isolated build.


## P0-IMPORT completion and local build — 2026-10-19
- Owner Codex; import DONE_SOURCE under Rio continuation mandate. SHA f0ad54ef5484f64d9be1609515c7cac841650a90; 126/126 exact source blobs, remaining 0; other lanes unchanged.
- Root lock generated; npm ci ignore-scripts, API/web typecheck/build, 17 Python gate and 10 DB-free regression tests PASS.
- Evidence: docs/SOURCE_IMPORT_BUILD_EVIDENCE_20261019.md and source manifest. Old review bundle unavailable; reconstructed directly from verified original ZIP.
- Blockers: dependency audit 11 high + 1 moderate; remote CI failed without logs; Hermes gmtci CPU/RAM limits unlimited, no heavy VPS build.
- Overall Source/Foundation: import DONE_SOURCE; Module: unchanged baseline; Source/Test: local PASS, remote/security open; Hosting NOT VERIFIED; Deploy NOT READY; LOCK NO.
- Next: dependency remediation review, dedicated gmtci resource limits and isolated Linux build. No SANRO environment, merge/deploy/migration/seed/db push.


## P0-IMPORT update — Hermes isolated build and no-auto-Action policy (2026-10-19)
- Latest PR #7 head before this checkpoint: `3d8a31434e772e0010c32dc49904c4539132288e`; previous app-test commit `e61ba58b5e9c9eba3318195dc72581b98cb7e513`. The only change between those commits is `.github/workflows/source-guard.yml`, now `workflow_dispatch` only. No automatic PR/push workflow runs; no workflow run exists for the latest commit. Do not manually dispatch the hosted `ubuntu-latest` job for this project.
- GitHub Actions run `39260887866` was rerun once, but GitHub reported it was not started because of account payments/spending limit. The job had no runner steps/logs; this was not an app test failure. Do not retry it.
- **Hermes app validation completed on-demand as `gmtci`**, in Bubblewrap, against app commit `e61ba58b5e9c9eba3318195dc72581b98cb7e513`. Rio-provided resource preflight: CPU `100000 100000` (1 CPU), memory high `1610612736`, memory max `2147483648`, swap max `0`, PIDs max `128`; preflight passed. No SANRO service, project, database, or credentials used.
- Node `22.22.1`, npm `9.2.0`, Python `3.14.4`, Bubblewrap `0.11.1`. `npm ci --ignore-scripts` (530 packages) and explicit Prisma Client generate (6.19.3, dummy unreachable DB URL) passed. API/Nest and web/Vite build, 10 DB-free Node regressions, 17 Python gate tests, tracked source guard, and 126/126 source-manifest verification passed. No database connection, migration, seed, db push, or deployment. Build peak memory reported 540.5 MiB; cleanup left the branch clean after removing only generated `scripts/__pycache__/`.
- **Still open:** dependency audit remains 11 high + 1 moderate. Lock resolves Prisma/adapter 6.19.3, nested MariaDB 3.4.5, Puppeteer Core 24.43.1 and affected transitive packages. Audit remediation points to major-version upgrades; do not use `npm audit fix --force` or treat build pass as security clearance. Full DB/E2E and Chromium PDF tests remain unrun. PR stays DRAFT; no merge/deploy/production database operation.
- Next: review a scoped, testable dependency-remediation path; keep app checks on Hermes `gmtci` and avoid GitHub-hosted Actions.

## P1-BILLING-TAX-PRINT — scoped source change (2026-10-19)

- **Lane/owner/status:** P1-BILLING-TAX-PRINT / ChatGPT / DONE_SOURCE, TEST_PENDING. Base PR #7 source HEAD `a839f4d816152e20fefbc7e87170c9a5208a8022`; isolated branch `chatgpt/billing-tax-print-gate-20261019`. No edits to any other active agent lane.
- **Rio-approved requirement:** an active uploaded Faktur Pajak Coretax linked to the invoice is mandatory before *any* Invoice or Kwitansi print/preview/PDF/archive. Factur Pajak is an external uploaded document; do not generate Coretax tax invoices. Print only after FINAL; not for draft/cancelled documents. Other supporting supplier/customer documents remain uploads. This enforces the existing DO received → Invoice → Kwitansi flow, without migration or new app modules.
- **Implementation:** shared fail-closed backend print guard requires FINAL and a currently UPLOADED TaxDocument with linked TAX_INVOICE document (REPLACED/CANCELLED/non-tax ignored). Applied within both HTML renderers, thereby covering preview, PDF download, PDF archive and billing-package generation; billing package filters only the active tax record. Receipt lookup now includes invoice tax links. UI disables print controls and explains why. Existing configurable finalization setting cannot bypass print gate.
- **Tests:** `scripts/test_tax_print_gate.cjs` adds nine DB-free test cases (positive/negative Coretax state + both renderer guards). Run **after** build: `node --test scripts/test_db_free.cjs scripts/test_tax_print_gate.cjs`. Source static seven-path/assertion check passed, but **API/Web TypeScript syntax/typecheck/build, new Node tests, complete DB/E2E and hosting verification NOT RUN in this session** because local execution environment returned ClientError and Hermes cannot be invoked directly from this chat. Do not claim CI PASS for this branch; GitHub-hosted Actions disabled/manual due billing.
- **Remaining Rio/Supri priorities:** quotation/RFQ DRAFT edit versus SENT lock, item-by-item Delivery/Certificate/Note, correct valid-until vs quotation deadline, header/logo/contact/sender/signature/stamp; document templates from authorized Drive examples. Audit exact route + UI per change to avoid duplication. Supplier sourcing, RFQ research, supplier comparison stay in authorized Google Drive workspace, NOT a new app module.
- **Source/Foundation:** imported baseline DONE_SOURCE; this batch seven implementation/test files changed/added. **Module:** Billing print gate DONE_SOURCE, other fixes pending. **Source/Test:** static structural checks PASS; runtime build/regression PENDING. **Hosting Verification:** NOT VERIFIED. **Deploy Readiness:** NOT READY. **LOCK:** NO. No database connection, dump, migration/seed/db push, merge, deployment, SANRO or production changes.
- **Next safe action:** run scoped build and new regression in isolated `gmtci` environment on the exact new branch SHA, then address any compile/runtime failures before Rio review; maintain DRAFT PR until test evidence and explicit approval.

## P1-QUOTATION-DRAFT-EDIT — isolated source batch (2026-10-20)

- **Lane/owner/status:** P1-QUOTATION-DRAFT-EDIT / ChatGPT / DONE_SOURCE; TEST_PENDING. Base PR #8 at `33fe60711bc6f7443a0367c49818654eff9b8de8`; branch `chatgpt/quotation-draft-editor-20261020`. Does not modify PR #8 or unrelated lanes.
- **Existing verified:** `PATCH /quotations/:id` route and `QuotationsService.update()` already edit DRAFT and reject SENT; `POST /quotations/:id/revise` already issues a new draft revision; quote item's `notes` and quote `validUntil` already exist. No supplier sourcing module.
- **Change:** reuse current form for DRAFT edits (preload existing draft fields/items and persist PATCH without IDs/read-only line totals), expose only DRAFT Edit button; lock sent editing; preserve and edit item-specific notes and render safely escaped within that item's A4 row; clarify that Valid Until means quotation expiry, not customer RFQ deadline; show existing discount in editor totals and allow resetting VAT rate. Existing global Delivery/Certificate fields remain global pending further approved analysis—this batch does not falsely claim per-item Delivery/Certificate fixed.
- **Tests/evidence:** static source contract checked across 6 paths PASS; newly added `scripts/test_quotation_draft.cjs` has 3 DB-free tests for SENT edit rejection, draft PATCH line-note mapping/totals and escaped per-item PDF display. **Runtime TS checks/build/tests have NOT run** (container session unavailable); no Actions run, no DB or hosting accesses. After isolated build: `node --test scripts/test_db_free.cjs scripts/test_tax_print_gate.cjs scripts/test_quotation_draft.cjs`; run build:web and build:api with dummy DB config only, no setup/migrate/seed/db push.
- **Remaining:** item-specific Delivery and Certificate requirements need design against existing fields/schema, company header/logo/contact, signature/stamp, Sender Name, and workflow/hosting verification. Supplier sourcing remains in authorized Google Drive workspace.
- **Progress:** Overall Source/Foundation baseline DONE_SOURCE; Module: Quotation draft editor and per-item notes DONE_SOURCE; Source/Test static PASS/runtime PENDING; Hosting Verification NOT VERIFIED; Deploy Readiness NOT READY; LOCK NO. No merge, deployment, migration, production operation, or SANRO change.

## P1-QUOTATION-SENDER-HEADER — narrow source batch (2026-10-20)

- **Owner/lane/status:** ChatGPT / P1-QUOTATION-SENDER-HEADER / DONE_SOURCE, TEST_PENDING. Child of PR #9 head `4c35400a0ffe3b1adc6940a3dee3a5a10cd7c986`, branch `chatgpt/quotation-sender-header-20261020`.
- **Scoped changes:** Current A4 quotation renderer now displays customer inquiry `ProjectOrigin.senderName` below company name, separate Customer PIC and GMT "Prepared by", safely HTML-escaped; phone/email and existing signatory remain. Reserved signature/company stamp *space* (not fabricated signature). Uses existing `ProjectOrigin`, quotation `createdBy`, `customerContact`, `CompanyProfile` fields; no schema change, migrations, or data writes to database.
- **Evidence/test:** `scripts/test_quotation_header.cjs` adds 3 DB-free cases, syntactically parsed in isolated JS checker (PARSE_OK) plus seven structural predicates PASS. API/Web build, actual Node regression and hosting verification **NOT RUN** because local runtime container unavailable. Prior PR #8/9 test execution also pending; do not infer run/test pass from source assertions. After approved isolated build: `node --test scripts/test_db_free.cjs scripts/test_tax_print_gate.cjs scripts/test_quotation_draft.cjs scripts/test_quotation_header.cjs`.
- **Remaining user requests:** logoPath exists but a verified secure public/logo file pipeline is not yet confirmed; no raw filesystem/web URL loading or fake signature/stamp. Per-item Delivery Time and Certificate are currently quotation-level fields, requiring explicit data-model decision and Rio approval before any new database migration. Other templates (DO, Invoice, Kwitansi) remain independent scoped tasks. Supplier sourcing and analysis stay in authorized Google Drive workspace.
- **Progress gates:** Overall Source/Foundation baseline DONE_SOURCE; Module quotation header DONE_SOURCE, print gate PR #8 and draft editor PR #9 remain DRAFT pending runtime checks; Source/Test STATIC PASS / RUNTIME PENDING; Hosting NOT VERIFIED; Deploy Readiness NOT READY; LOCK NO. No merge, migration, SANRO, production or hosting changes.

## P1-DELIVERY-ORDER-TEMPLATE — scoped DO batch (2026-10-20)

- **Lane/owner/status:** P1-DELIVERY-ORDER-TEMPLATE / ChatGPT / DONE_SOURCE; RUNTIME_TEST_PENDING. Branch `chatgpt/delivery-order-template-20261020`, base PR #10 at `56dbcc3b2ee168bbab93c610c331cbfc9688e4f1`. No other active source lane overwritten.
- **Existing features reused:** PurchaseOrder / DeliveryOrder / DeliveryOrderItem / CompanyProfile and current HTML A4 print. Original Customer PO is still required before issue. Signed DO/Receiving Document upload is still required before marking RECEIVED. Multi-DO partial-delivery matrix and approval logic were **not changed**. No schema/migration.
- **Implemented:** explicit `deliveryAddress` now overrides the registered receiving-party address in A4 print (otherwise use receiver snapshot); header prints existing GMT company phone/email; recipient PIC `deliveryContact`, delivery notes and item-specific `DeliveryOrderItem.notes` shown with HTML escaping; signed confirmation instruction uses configured company email; no fake signature/stamp, only signatory spaces; DRAFT and CANCELLED are watermarked. UI exposes existing DO destination, PIC and line notes at creation. Matrix still shows all PO items and the quantities shipped on this DO.
- **Evidence:** source assertions PASS across 5 touched/test paths; new `scripts/test_delivery_order_print.cjs` CommonJS syntax PARSE_OK, 5 mock-only tests declared for address override/fallback, company details, XSS escaping, draft watermark and partial item-note matrix. **API/Web TypeScript compile, Node regression runtime, Chromium PDF browser render, DB integration, cPanel hosting and deployment NOT RUN** due unavailable local container/runtime. Existing upstream PR #8-10 runtime tests also pending. No hosted GitHub Actions run requested.
- **Next verification:** in approved isolated no-production environment using exact PR head, run `npm run build:api && npm run build:web` followed by `node --test scripts/test_db_free.cjs scripts/test_tax_print_gate.cjs scripts/test_quotation_draft.cjs scripts/test_quotation_header.cjs scripts/test_delivery_order_print.cjs`. No migration, seed, `setup:staging`, `prisma:push:staging`, production DB connection, merge or deploy.
- **Other user priorities:** official GMT logo source/path and company-approved signature/stamp assets need verified safe handling; DO and invoice actual PDF visual parity to samples still requires screenshot/browser comparison. Per-item certificate/delivery time needs separately authorized schema/data-design decision. Supplier sourcing remains a Drive workspace task.
- **Gates:** Overall Source/Foundation baseline DONE_SOURCE; Module DO document template DONE_SOURCE; Source/Test STATIC PASS / RUNTIME PENDING; Hosting Verification NOT VERIFIED; Deploy Readiness NOT READY; LOCK NO. No SANRO or cPanel changes.

## P1-QUOTATION-DRAFT-CONCURRENCY — scoped race guard and in-process logic checks (2026-10-20)

- **Lane / owner / status:** P1-QUOTATION-DRAFT-CONCURRENCY / ChatGPT / DONE_SOURCE. Base PR #11 `a25af179e67935fc06c0621e2b0211d85f05309a`; branch `chatgpt/quotation-draft-race-guard-20261020`.
- **Confirmed defect:** quotation draft update formerly checked `DRAFT` only before starting its transaction, then deleted quotation item rows regardless of a concurrent transition to SENT. A raced update could replace items on a sent quotation.
- **Implemented:** transactional `quotation.updateMany({where:{id,status:DRAFT},data:{updatedById:userId}})` as an atomic conditional row claim **before** item deletion/recreation; `count !== 1` aborts the transaction with BadRequestException. Prior `DRAFT` fast rejection remains. This serializes draft edits with concurrent updates and requires no new schema, migration, hosting or production data.
- **Test update:** existing `scripts/test_quotation_draft.cjs` successful DRAFT mock now supports the row-claim query; added negative regression simulating status change to SENT between initial read and transactional claim, asserting no child deletion/update/audit side effects.
- **Executable limited evidence:** used a stand-alone isolated V8 harness to execute the **actual extracted update method body** (only TS parameter types removed) against in-memory mocks: already SENT rejects, raced SENT rejects with no item deletion, DRAFT succeeds with one delete/update/audit; **3/3 PASS**. Isolated V8 harness likewise exercised actual extracted Coretax print gate body: six cases (FINAL active tax allow; missing, DRAFT, CANCELLED, REPLACED, non-tax deny) **6/6 PASS**. Five existing committed `.cjs` regression scripts parsed as JavaScript: 31 declared cases total, **syntax PARSE_OK**.
- **Important limitation:** these are isolated logic checks, NOT a NestJS/React/Prisma build or Node test execution. Container/Python tools reported ClientError; GitHub-hosted Actions cannot be used under the existing billing policy. Full `npm ci --ignore-scripts`, Prisma generate with unreachable dummy DB, API/web compile, Node suite (`test_db_free`, `test_tax_print_gate`, `test_quotation_draft`, `test_quotation_header`, `test_delivery_order_print`), PDF/browser and DB integration remain **NOT RUN**.
- **Progress:** Overall Source/Foundation baseline import DONE_SOURCE; Module quote edit concurrency fix DONE_SOURCE, other billing/DO changes pending build; Source/Test isolated V8 9/9 PASS + script parse 5/5 PASS, full CI/build PENDING; Hosting Verification NOT VERIFIED; Deploy Readiness NOT READY; LOCK NO.
- **No:** migration, DB access, `setup:staging`, `prisma:push:staging`, GitHub-hosted Actions, merge/deploy, SANRO, production, or any Google Drive outside permitted folder.
- **Next:** obtain safe isolated local `gmtci` source/build and execute full suite at exact PR head before recommending merges; do not start other changes until the runtime gate is available unless independently safe and prioritized.

## P1-ARCHIVED-BILLING-DOWNLOAD-GATE — scoped billing closure (2026-10-20)

- **Lane / owner / status:** P1-ARCHIVED-BILLING-DOWNLOAD-GATE / ChatGPT / DONE_SOURCE; FULL_TEST_PENDING. Base PR #12 SHA `c5180c0ded2665d6a5ad7a422852094b7468f9e3`; isolated branch `chatgpt/archived-billing-download-gate-20261020`.
- **Confirmed bypass:** existing `GET /documents/:id/download` previously streamed any `INVOICE_PDF`, `RECEIPT_PDF` or `BILLING_PACKAGE_PDF` without rechecking Coretax. Prior live PDF/preview gate did not cover this archival path.
- **Implementation:** `DocumentsService.download` for these three document types now fails closed for a missing linked invoice, cross-project mismatch, non-FINAL invoice or missing active `UPLOADED`/type `TAX_INVOICE` Coretax proof, via shared `assertInvoicePrintable`. Kwitansi additionally must have linked `receiptId`, same `invoiceId`, and FINAL receipt status. Supporting files (e.g. ORIGINAL_PO) remain downloadable without Coretax validation; storage files remain unchanged. Existing models only; no schema migration, new module, or database operation.
- **Evidence:** seven declared mock-only Node tests in `scripts/test_billing_archive_gate.cjs`, script syntax PARSE_OK. Isolated V8 executed the **actual source `download` and Coretax guard method bodies** (parameter type annotation removed, surrounding imported dependencies mocked): 10/10 scenarios PASS, including missing/replaced tax, orphan document, project mismatch, draft/wrong receipt, permitted generated invoice/receipt/package and supporting PO. **Not a NestJS build or Node runner/Prisma runtime check.**
- **Blocked runtime verification:** local Python/container backends ClientError; GitHub-hosted Actions previously billing blocked, no workflow dispatched. Full API/web compile, `node --test` suite, storage integration, hosting smoke and user-facing PDF visual comparison PENDING. Run after safe isolated build: `node --test scripts/test_db_free.cjs scripts/test_tax_print_gate.cjs scripts/test_quotation_draft.cjs scripts/test_quotation_header.cjs scripts/test_delivery_order_print.cjs scripts/test_billing_archive_gate.cjs`.
- **Progress gates:** Overall Source/Foundation baseline DONE_SOURCE; Module archival billing gate DONE_SOURCE; Source/Test isolated mock PASS, full runtime PENDING; Hosting Verification NOT VERIFIED; Deploy Readiness NOT READY; LOCK NO. No merge, cPanel access, migration/seed/db push, production data, SANRO or external Drive access.
