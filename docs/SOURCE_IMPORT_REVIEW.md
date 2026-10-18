# Source baseline import — review required, no deployment
Tanggal: 2026-10-19
Sumber: arsip `gmt-procurement.zip` diserahkan Rio, diperiksa secara read-only.

## Bukti
- Ukuran ZIP asli: 200,209,381 bytes; total 37,761 entri; `testzip()`: PASS.
- SHA256: `25ce1448015b34144dc16a67609a61f9ad5dd7ef70fd647b401c3d22caf06813`.
- Source yang dapat dipertimbangkan untuk baseline: 144 file original di allowlist setelah membuang artefak/runtime/sensitif serta 3 dokumen pengaman lokal.
- Parse syntax TypeScript/TSX: 113 file, 0 parser diagnostic. **Ini bukan build atau test integrasi.**

## Isi kandidat source-only
- `apps/api/src/**`, `apps/web/src/**`, schema Prisma `apps/api/prisma/schema.prisma`, project package/config, dokumentasi teknis dan deployment template yang sudah dipilih.
- Paket review lokal: `gmt-procurement-source-REVIEW-20261019.zip` (bukan paket deployment).
- Dikecualikan: `node_modules/`, `dist/`, patch ZIP, logs, `tmp/`, `storage/`, dump DB, `.env*`, docs/examples, dan `prisma/seed.ts` sampai review manual.
- Pengecualian `seed.ts` dapat menyebabkan perintah `setup:staging` gagal; jangan menjalankan seed/migrate/db push pada production.

## Cara import yang benar
1. Pastikan repository `arioguswara-oss/gmt-procurement` masih PRIVATE.
2. Gunakan branch kerja `codex/procurement-baseline-audit-20261019`; JANGAN overwrite `main`.
3. Review file kandidat termasuk default akun/seed, domain/email hardcoded, URL internal, upload policy, RBAC, dan secret scanner. Jangan unggah sekaligus jika masih ada temuan.
4. Import **file source** (bukan ZIP binary) ke branch kerja. Pertahankan README dan docs proyek yang sudah ada, resolve konflik secara scoped.
5. Jalankan install/build/test dalam environment aman, tanpa kredensial production atau koneksi database live. Gunakan lockfile yang sesuai jika ditambahkan.
6. Buka PR Draft, catat SHA, hasil lint/test/security scan; Rio review. Merge hanya atas persetujuan Rio.
7. Paket untuk Google Drive baru dibuat setelah release gate lengkap, ZIP terverifikasi, checksum/manifest tersedia.

## Risiko yang belum terjawab
- ZIP dianggap sesuai source aktif atas konfirmasi Rio, namun runtime, env, dan data produksi belum diverifikasi.
- Tidak tersedia bukti CI build/DB migration/test akhir saat laporan ini dibuat.
- File seed awal menggunakan konfigurasi env dan default identitas; harus di-review sebelum dimasukkan ke source control.
- Versi aplikasi memiliki histori patch ZIP. Jangan menerapkan ulang patch lama secara otomatis.
- Rencana tambahan IMAP/Fonnte/notification memerlukan audit skema, role, dan kompatibilitas hosting.

## Default konservatif
Tidak menjalankan source dari arsip, tidak memanggil SMTP/Fonnte/IMAP, tidak membuat/mengubah tabel/database, tidak deploy. Semua konektor/outbound flag OFF sampai verifikasi dan approval Rio.
