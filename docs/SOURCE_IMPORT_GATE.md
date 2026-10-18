# P0 — Source import gate (READ-ONLY, belum impor kode)

Owner: ChatGPT. Approver: Rio. Source of truth saat ini: `gmt-procurement.zip` yang Rio konfirmasi merupakan source aplikasi aktif. Bukti historis ukuran file 200.209.381 byte, hash SHA-256 `25ce1448015b34144dc16a67609a61f9ad5dd7ef70fd647b401c3d22caf06813`.

## Tujuan

Menyiapkan pemeriksaan deterministik sebelum source Procurement masuk GitHub Private. **Tidak mengeksekusi code ZIP, tidak mengekstrak otomatis, tidak mengunggah source, tidak menulis ke Drive, tidak memanggil production.**

File baru: `scripts/audit_source_zip.py` dan `scripts/test_audit_source_zip.py`.

## Prinsip kerja

1. Mendeteksi satu root ZIP dengan `package.json`, `apps/api/package.json`, dan `apps/web/package.json`; root ambigu ditolak.
2. Menolak path traversal, jalur absolut, backslash Windows ambigu, NUL, kandidat symlink, duplikasi kandidat case-insensitive, kandidat terlalu besar/binary, dan indikator credential pada file kandidat.
3. Menghitung SHA256 seluruh arsip, jumlah entri, serta banyaknya file yang cocok allowlist (tidak pernah mencetak isi file/password/token).
4. Allowlist: source `apps/api/src`, `apps/web/src`, test source, dan file konfigurasi/build terpilih; patch ZIP, uploads, log, `.env*`, `node_modules`, `dist`, storage, seed, dan migration SQL tidak otomatis disertakan.
5. Output PASS teknis adalah **`REVIEW_REQUIRED`**, bukan izin mengimpor atau deploy. Administrator/developer tetap harus meninjau file, dependency, schema, migration historis, RBAC, dan sanitasi data.
6. Semua operasi default read-only. Source baru diimpor setelah isi tersedia dan pemeriksaan manual selesai, pada branch terpisah, tanpa mengganti `main`.

## Pemakaian nanti di lingkungan yang mempunyai salinan ZIP sah

```bash
python3 -m unittest discover -s scripts -p 'test*.py' -v
python3 scripts/audit_source_zip.py /path/to/gmt-procurement.zip
```

Perintah kedua hanya memeriksa metadata dan isi kandidat dalam memori. Jangan memakainya untuk mengaudit path di luar data yang Rio berikan. **Tidak perlu menyalin ZIP ke Hermes** dan Hermes tidak perlu akses Google Drive.

## Kriteria impor aplikasi setelah lolos audit

- ZIP hash sama dengan sumber yang diketahui, atau perubahan sumber dijelaskan dan disetujui Rio.
- Daftar file yang diimpor lengkap untuk build (termasuk asset yang telah ditinjau, lockfile dan migration jika dibutuhkan); bukan hanya file pada allowlist minimal ini.
- Pemeriksaan secret scan tambahan dan manual review tidak menemukan secret, data personal, upload klien, atau konfigurasi production.
- Import source-only pada branch baru; no force-push `main`, no merge otomatis.
- Jalankan test/syntax/build untuk source sesungguhnya di sandbox aman dengan dependency supply-chain preflight.
- Laporan memisahkan CODE/TEST, HOSTING, DEPLOY READINESS, LOCK. Tidak ada klaim production-ready sebelum Rio dan gate resmi.

## Status saat file ini dibuat

- Skrip audit ZIP: **DONE_SOURCE**, belum diuji terhadap ZIP yang sebenarnya pada environment turn ini.
- Source ZIP: tersedia historis pada folder Gayuh Mandala Storage Share; akses Drive tetap hanya folder ID `1Zdui1O0CEA0YvQhSQu2P7Q6Tr2hqP_0A`.
- Pemrosesan lokal file sesi saat ini tidak tersedia, jadi sumber belum diimpor; bukan kegagalan ZIP atau perubahan production.
- Hermes CI smoke test sebelumnya PASS dan idle PASS (3 unit test lama), tetapi belum melaksanakan test skrip audit baru atau build Procurement.
- NEXT: verifikasi unit test di Hermes dalam lingkungan on-demand yang sudah disetujui, kemudian pemeriksaan ZIP sumber di runtime yang dapat mengakses file itu. Jangan mengunggah kode tanpa verifikasi.
