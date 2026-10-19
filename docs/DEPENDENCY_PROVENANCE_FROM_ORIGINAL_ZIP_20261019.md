# Dependency provenance dari ZIP asli — 2026-10-19

**OWNER:** Rio. **LANE:** P0-IMPORT / ChatGPT. **SOURCE:** arsip `gmt-procurement.zip` di folder Google Drive yang telah diotorisasi, dibaca melalui salinan lokal. **TUJUAN:** rekonsiliasi dependency secara READ-ONLY sebelum full source import dan build. **BUKAN** lockfile deploy.

## Fakta terverifikasi dari ZIP

- Original archive: 200.209.381 byte, SHA-256 `25ce1448015b34144dc16a67609a61f9ad5dd7ef70fd647b401c3d22caf06813`, 37.761 ZIP entries, pemeriksaan CRC sebelumnya PASS.
- Di dalam arsip ditemukan **`gmt-procurement/node_modules/.package-lock.json`** (bukan lockfile project root). SHA-256 file internal `511861fd1a69773bf35948d076910bc8cf8a867faa8c0ae40661fe1db22696f5`.
- Metadata npm lock versi **3**, **523 entri**. Keseluruhan 523 entri mencantumkan `sha512` integrity dan resolved hostname `registry.npmjs.org`; terdapat **5 paket bertanda `hasInstallScript`**, 8 paket `optional`, dan 1 paket bertanda deprecated.
- Root `package.json` mendeklarasikan **33 dependency** (tidak ada root devDependency terpisah); **33/33 ada** dalam metadata internal node_modules. Semua versi 33 paket cocok terhadap cek sederhana semver `^`/exact; **bukan bukti full npm resolver / supply chain lulus**.
- Root `package-lock.json`, `npm-shrinkwrap.json`, `pnpm-lock.yaml`, atau `yarn.lock` project masih **TIDAK ditemukan**. File lock pada subfolder package vendor tidak boleh dipakai sebagai root lock.
- UI source `apps/web/src/pages/LoginPage.tsx` memuat email default pada input login. Nilai sengaja **tidak disalin ke GitHub audit**. Password input pada source snapshot diinisialisasi kosong. Perlu review UX/privacy sebelum release.

## Keputusan keamanan

1. **Jangan salin/rename** `node_modules/.package-lock.json` menjadi `package-lock.json` root. Itu bukan hasil `npm install --package-lock-only` yang terverifikasi; tidak menjamin peer/optional graph atau reproducibility.
2. Jangan menjalankan `npm install`, `npm ci`, `setup:staging`, `prisma db push`, `prisma migrate dev`, atau `prisma:seed` pada Hermes/production untuk membuat atau menguji lockfile.
3. Metadata integritas adalah *klaim file lock*; tarball aktual **belum** dicek SHA512 dari registri. Pemeriksaan vulnerability, licensing, peer graph, Node/npm compatibility, native package/lifecycle hooks dan supply-chain masih PENDING.
4. Masukkan source aplikasi ke private development branch **setelah** manual secret/PII review; jangan overwrite README/.gitignore existing tanpa membandingkan diff.
5. Setelah source tersedia di branch dan dependency policy disetujui, buat root lockfile di **lingkungan pengembangan terisolasi yang dikendalikan** (bukan deployment/DB), validasi `npm ci` dengan `--ignore-scripts` sesuai kebutuhan dan review lifecycle sebelum build.
6. Jaga batas fungsi App sebagai transaksi; Google Drive AI Workspace Mas Supri untuk riset/dokumen. Akses Drive hanya folder `Gayuh Mandala Storage Share` beserta verified descendants, READ-ONLY default.

## Evidence dan blocker

- Audit offline membaca file ZIP dan JSON **tanpa mengeksekusi source, lifecycle scripts, npm atau akses database**.
- Tidak ada perubahan pada Hermes, SANRO, Drive, production, ataupun PR lain. Tidak ada merge.
- **P0-IMPORT:** masih IN_PROGRESS karena source app lengkap belum dipush ke GitHub. **HERMES-CI tahap 2:** 8/8 synthetic test PASS (bukti screenshot Rio), tetapi full app build BLOCKED oleh root lockfile + source import.
- Acceptance berikutnya: transfer source aman ke branch baru, dependency lockfile verified, resource sandbox limits, compile/full regression/negative RBAC tests, Rio approval sebelum deploy.

## Reporting

Overall Source/Foundation: candidate source 128 file terverifikasi lokal; source import GitHub PENDING.
Module Progress: belum ada implementasi modul bisnis baru.
Source/Test: rekonsiliasi 33/33 direct dependencies statis; full dependency/build/regression PENDING.
Hosting Verification: NOT VERIFIED.
Deploy Readiness: NOT READY.
LOCK Status: NO.
