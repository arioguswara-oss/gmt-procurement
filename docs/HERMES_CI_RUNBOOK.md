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

## Checkpoint uji Hermes — 2026-10-19 (screenshot Rio 03:45 WIB)
- Akun `gmtci` telah dibuat (UID 993, GID 981; tanpa grup Docker); screenshot sebelumnya.
- SSH Deploy Key repo `arioguswara-oss/gmt-procurement` terautentikasi; Git clone branch Hermes sukses.
- Checkout diverifikasi: branch `chatgpt/hermes-ondemand-ci-20261019`, SHA `92eb03e0fccc3e5768cc09a73a3178c63ca5fa47`.
- `bash -n ci/hermes/run-checks.sh` => `CI_SCRIPT_OK` (PASS).
- `sudo -H -u gmtci bash /home/gmtci/gmt-procurement/ci/hermes/run-checks.sh` => tiga tes `unittest` OK dan `source_guard` PASS; akhir output `GMT-CI PASS sha=92eb03e0fccc3e5768cc09a73a3178c63ca5fa47`.
- Perintah telah kembali ke prompt SSH; pemeriksaan proses residual **telah lulus** (lihat checkpoint berikutnya). Resource limits/cgroup serta full application build/regression masih belum diverifikasi.
- Tes ini membuktikan smoke test runner offline dan pengamanan dasar, **bukan** CI penuh/production ready. Tidak ada deploy, migration, IMAP, Fonnte, atau Drive write.
- **NEXT (read-only)**: cek ulang isolasi resource dan persiapan import source aplikasi; jangan aktivasi daemon.
- Review/merge tetap membutuhkan keputusan Rio. PR #3 tetap DRAFT.

## Gate yang belum lulus
- Akun `gmtci` telah dibuat; masih perlu verifikasi kebijakan hardening dan resource limits.
- Deploy key GitHub repo sudah dibuat dan SSH terautentikasi; kewenangan read-only sesuai pengaturan Rio, perlu verifikasi setting GitHub bila diaudit.
- Runner sudah di-clone dan diuji manual via `gmtci` (PASS pada smoke test); pemeriksaan proses residual PASS pada 03:47 WIB.
- Belum ada cgroup/limits yang diverifikasi; isolasi hanya uji dasar.
- Source baseline aplikasi belum diimpor/di-build secara lengkap.
- GitHub Actions PR #1 sebelumnya FAILED; tidak dijadikan PASS hanya karena adanya rancangan CI Hermes.
- Tidak ada migration, package rilis Drive, hosting verification, atau lock.

Tahap berikutnya: rencanakan guardrails resource dan tes aplikasi secara terpisah setelah import source baseline yang aman; tidak perlu mengubah VPS untuk dokumentasi. Lakukan bertahap dengan persetujuan Rio.

## Checkpoint idle — 2026-10-19 (screenshot Rio 03:47 WIB)
- Rio menjalankan `ps -u gmtci -o pid,comm,%cpu,%mem` di SSH Hermes.
- Output hanya header `PID COMMAND %CPU %MEM`, **tanpa baris proses**: 0 proses berjalan untuk akun `gmtci` pada saat pemeriksaan.
- Tidak ditemukan daemon/worker tersisa berdasarkan output tersebut; penggunaan CPU/RAM oleh proses akun gmtci saat diperiksa: tidak ada.
- Konfigurasi/checkout tetap menggunakan disk. Pengujian ini tidak memastikan pembatasan memory/cgroup atau keamanan dependency tak tepercaya.
- Status lane HERMES-CI: **DONE_SOURCE** untuk smoke test manual dan idle test; CI build/regression aplikasi **BELUM** dilakukan. PR #3 tetap DRAFT, hosting NOT VERIFIED, deployment NOT READY, LOCK NO.
- Next: siapkan import source-only yang lolos sanitasi, lalu rancang full build/test terisolasi; tidak ada otomatisasi CI yang perlu dijalankan saat idle.
