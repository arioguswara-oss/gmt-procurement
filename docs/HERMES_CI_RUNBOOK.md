# Hermes CI — GMT Procurement (DRAFT / belum terpasang)

Owner: Rio. Tujuan: **CI manual, on-demand, berhenti setelah pekerjaan selesai**. Tidak menggunakan GitHub Actions runner, daemon, cron, atau webhook listener. Saat idle tidak ada proses CI aktif, tetapi checkout/laporan tetap memakai ruang disk.

## Bukti dari screenshot Hermes
- Ubuntu 26.04.1 LTS, Git 2.53, Node 22.22.1, Python 3.14.4.
- Bubblewrap 0.11.1, tes dasar `BWRAP_OK` dan `CI_ISOLATION_OK` berhasil.
- Docker terinstal tetapi akun `sanro` tidak boleh mengakses socket Docker.
- Tes sebelumnya hanya membuktikan namespace dasar. BUKAN audit sandbox menyeluruh.

## Scope fase 1
- Runner: `ci/hermes/run-checks.sh`.
- Menjalankan unit tests untuk `scripts/source_guard.py` serta pemeriksaan file tracked Git.
- Tidak menjalankan `npm install`, paket pihak ketiga, build frontend/backend, migration, atau test yang mengakses jaringan.
- Tidak mengakses mailbox cPanel, Fonnte, Google Drive, ataupun SANRO.
- Tidak menulis/mengirim ke GitHub, tidak mengubah branch, tidak deploy hosting.
- Tidak boleh menganggap PASS fase 1 sama dengan CI keseluruhan PASS / READY TO DEPLOY.

## Persiapan yang kelak dilakukan Rio di SSH (belum diinstruksikan untuk dijalankan)
1. Buat akun Linux khusus `gmtci` **tanpa sudo dan tanpa grup docker/sanro**, setelah mengecek nama belum terpakai. Home khusus `/home/gmtci`.
2. Buat SSH deploy key khusus repository `arioguswara-oss/gmt-procurement` dengan akses **read-only**, hanya public key dimasukkan lewat GitHub Settings → Deploy keys. Jangan kirim private key/password/token ke ChatGPT.
3. Verifikasi fingerprint `github.com` melalui sumber resmi tepercaya sebelum menyetujui SSH host key. Jangan `StrictHostKeyChecking=no` atau menaruh token di URL.
4. Clone repository terbatas ke `/home/gmtci/gmt-procurement`. Pastikan `origin` memakai `git@github.com:arioguswara-oss/gmt-procurement.git`. Checkout commit/branch yang Rio setujui.
5. Jalankan manual sebagai `gmtci`: `bash ci/hermes/run-checks.sh`.
6. Catat commit SHA dan hasil, lalu selesai; tidak ada proses latar belakang yang terus hidup.

## Boundary isolasi runner
- Menolak dieksekusi oleh selain `gmtci`; menolak origin yang tidak sesuai, dirty checkout, atau detached HEAD.
- `bwrap`: tidak membagikan host `/home`, `/etc`, `/var`, Docker socket; source read-only; `/tmp` sementara; network namespace terpisah; environment dibersihkan.
- Timeout 180 detik, CPU time per shell 120 detik. **Bukan batas RAM/cgroup lengkap.**
- Keamanan sandbox dan pembatasan resources menyeluruh harus diuji terpisah sebelum memakai `npm` atau kode dependency tak tepercaya. Jangan mengendurkan AppArmor.
- Proses dihentikan setelah PASS/FAIL; tidak ada layanan resident CI di server.

## Kriteria pengujian saat disetujui
1. `bash -n ci/hermes/run-checks.sh` lulus.
2. Sebagai `sanro`, runner harus menolak (tanpa perubahan filesystem).
3. Sebagai `gmtci`, repo GitHub belum tersiapkan → fail closed.
4. Sandbox terisolasi tidak menampilkan file `/home/sanro`, `/var/run/docker.sock`, maupun akses jaringan.
5. Source guard dan unit tests berjalan dari checkout source yang tepat, identitas SHA tercetak.
6. Proses runner sudah berhenti dan tidak tersisa di background.
7. Jika gagal: laporkan log yang sudah disanitasi, jangan akses/ubah SANRO dan jangan memaksa `sudo`/Docker.

## Gate yang belum lulus
- Akun `gmtci` belum dibuat.
- Read-only GitHub deploy key belum dibuat.
- Runner belum dipasang atau dijalankan pada Hermes.
- Belum ada cgroup/limits yang diverifikasi; isolasi hanya uji dasar.
- Source baseline aplikasi belum diimpor/di-build secara lengkap.
- GitHub Actions PR #1 sebelumnya FAILED; tidak dijadikan PASS hanya karena adanya rancangan CI Hermes.
- Tidak ada migration, package rilis Drive, hosting verification, atau lock.

Tahap berikutnya: Rio menjalankan pemeriksaan *read-only* terhadap keberadaan akun `gmtci` dan permission lingkungan SSH, kemudian dibuat akun khusus jika disetujui. Lakukan semua langkah satu per satu dan verifikasi output sebelum lanjut.
