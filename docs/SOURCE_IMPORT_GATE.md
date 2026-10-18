# P0 — Source import gate (READ-ONLY, belum impor kode)

Owner: ChatGPT. Approver: Rio. Source of truth saat ini: `gmt-procurement.zip` yang Rio konfirmasi merupakan source aplikasi aktif. Bukti historis ukuran file 200.209.381 byte, hash SHA-256 `25ce1448015b34144dc16a67609a61f9ad5dd7ef70fd647b401c3d22caf06813`.

## Tujuan

Menyiapkan pemeriksaan deterministik sebelum source Procurement masuk GitHub Private. Pemeriksa ZIP bersifat read-only; skrip staging baru hanya membuat salinan **source terpilih ke direktori lokal baru yang ditentukan operator** setelah gate lulus. Tidak mengeksekusi kode ZIP, tidak mengunggah source, tidak menulis ke Drive, dan tidak memanggil production.

File: `scripts/audit_source_zip.py`, `scripts/test_audit_source_zip.py`, `scripts/stage_source_zip.py`, `scripts/test_stage_source_zip.py`.

## Prinsip kerja

1. Mendeteksi satu root ZIP dengan `package.json`, `apps/api/package.json`, dan `apps/web/package.json`; root ambigu ditolak.
2. Menolak path traversal, jalur absolut, backslash Windows ambigu, NUL, kandidat symlink, duplikasi kandidat case-insensitive, kandidat terlalu besar/binary, dan indikator credential pada file kandidat.
3. Menghitung SHA256 seluruh arsip, jumlah entri, serta banyaknya file yang cocok allowlist (tidak pernah mencetak isi file/password/token).
4. Allowlist: source `apps/api/src`, `apps/web/src`, test source, dan file konfigurasi/build terpilih; patch ZIP, uploads, log, `.env*`, `node_modules`, `dist`, storage, seed, dan migration SQL tidak otomatis disertakan.
5. Output PASS teknis adalah **`REVIEW_REQUIRED`**, bukan izin mengimpor atau deploy. Administrator/developer tetap harus meninjau file, dependency, schema, migration historis, RBAC, dan sanitasi data.
6. Audit ZIP read-only. Tahap staging hanya membuat salinan file source di folder lokal baru, permission privat dan manifest hash per file. Jika pemeriksaan ditolak tidak ada salinan parsial. Output tetap REVIEW_REQUIRED.
7. Source baru diimpor ke GitHub hanya setelah human review + kebutuhan build lengkap terpenuhi, pada branch terpisah, tanpa mengganti `main`.

## Pemakaian nanti di lingkungan yang mempunyai salinan ZIP sah

```bash
python3 -m unittest discover -s scripts -p 'test*.py' -v
python3 scripts/audit_source_zip.py /path/to/gmt-procurement.zip \
  --expected-sha256 25ce1448015b34144dc16a67609a61f9ad5dd7ef70fd647b401c3d22caf06813
# Setelah preflight REVIEW_REQUIRED dan di lingkungan lokal terisolasi:
python3 scripts/stage_source_zip.py /path/to/gmt-procurement.zip \
  /path/to/new-empty-review-directory \
  --expected-sha256 25ce1448015b34144dc16a67609a61f9ad5dd7ef70fd647b401c3d22caf06813
```

Perintah audit memeriksa metadata dan isi kandidat dalam memori. Perintah staging terpisah menulis **source terpilih** ke folder lokal baru (tidak pernah mengekstrak seluruh arsip). Jangan memakainya untuk file di luar cakupan yang Rio berikan. **Tidak perlu menyalin ZIP ke Hermes** dan Hermes tidak perlu akses Google Drive. Kode staging belum diverifikasi di Hermes: jangan menjalankan terhadap ZIP asli sampai tes dan tinjauan keamanan selesai.

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

## Checkpoint lanjutan — selective staging
- Source ZIP lengkap tidak perlu diekstrak seluruhnya: jalankan gate SHA-256 + allowlist dahulu; jika lolos, `stage_source_zip.py` dapat menyalin hanya source yang dipilih ke folder lokal baru yang privat.
- Manifest mencatat path/bytes/hash per file **di folder lokal**, bukan dikirim ke chat maupun GitHub.
- Unit test tambahan: `test_stage_source_zip.py` (4 kasus sintetik). **Belum dijalankan dalam sesi ini** akibat `ClientError` lingkungan pemrosesan file ChatGPT; skrip staging tidak boleh dianggap telah lolos.
- Kandidat source review historis ±148 KB bukan bukti package cukup untuk build: periksa static assets, configs, migrations, lockfiles, schema, tests yang mungkin tersisih.
- Selama source asli belum bisa dibaca, import code aplikasi dan build tetap BLOCKED; script ini adalah persiapan aman, bukan hasil ekstraksi.
