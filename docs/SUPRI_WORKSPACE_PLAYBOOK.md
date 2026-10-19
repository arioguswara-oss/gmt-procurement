# SOP Mas Supri — AI Workspace untuk Procurement (DRAFT / WORKSPACE ONLY)

Dokumen ini adalah **template operasional**, bukan record transaksi App, bukan instruksi pengiriman otomatis, dan belum diunggah ke Google Drive. Penggunaan/edit/upload Drive memerlukan perintah Rio sesuai izin folder `Gayuh Mandala Storage Share`.

## 0. Pra-syarat setiap pekerjaan

- Cari project existing di GMT Procurement; pakai **GMT Reference** yang sudah ada, jangan membuat ulang entitas atau menebak ID.
- Pilih target transaksi resmi di App, dan tentukan apakah pekerjaan saat ini hanya research/dokumen di Workspace.
- AI hanya menyiapkan bahan; Mas Supri memeriksa. Tidak ada email/WhatsApp keluar otomatis, tidak ada approval transaksi secara implisit.
- Jaga quotation supplier, kontak, harga, serta dokumen client sesuai kebutuhan dan akses paling sempit.

## 1. Template Brief Kebutuhan Barang (Workspace)

```text
GMT Reference (dari App):
Nama proyek (jika boleh di-share):
Referensi inquiry client:
Tanggal diterima:
Deadline bidding:
Penanggung jawab: Mas Supri
Versi brief:
Kategori barang:
Jumlah & satuan:
Spesifikasi wajib (material / kapasitas / model / dimensi):
Spesifikasi alternatif yang boleh dipertimbangkan:
Standar/sertifikasi/COC/datasheet:
Lokasi & persyaratan pengiriman:
Syarat pembayaran / mata uang:
Target harga (jika boleh digunakan):
Kriteria lulus teknis:
Pertanyaan yang belum terjawab:
Bukti/sumber spesifikasi:
Status: DRAFT / NEEDS_REVIEW / REVIEWED
```

**AI:** rapikan spesifikasi dan daftar pertanyaan; tandai spesifikasi kontradiktif/tidak lengkap. **Mas Supri:** validasi sebelum RFQ.

## 2. Template Sourcing Supplier (Workspace)

Gunakan satu baris per kandidat supplier; jangan otomatis memasukkannya ke master App.

| Supplier | Existing di App? (terverifikasi) | Sumber informasi | Produk cocok? | Kontak terverifikasi? | Sertifikasi/bukti | Risiko/kekurangan | Status review |
|---|---|---|---|---|---|---|---|
| [Nama] | Ya / Tidak / Belum cek | [URL/dokumen] | Ya / Parsial / Tidak | Ya / Tidak | [Bukti] | [Catatan] | NEEDS_REVIEW |

**AI:** cari dan ringkas bukti supplier, bedakan klaim marketing vs dokumen resmi, hindari kontak palsu. **Mas Supri:** putuskan shortlist. Tambah/ubah BusinessPartner di App hanya melalui alur resmi dan user berwenang, setelah pemeriksaan duplikat.

## 3. Template RFQ Draft (Workspace; **JANGAN AUTO-SEND**)

```text
Subject: Request for Quotation — [GMT Reference] — [Item / Quantity]
To: [Supplier address setelah diverifikasi]
Reference:
Dear [Supplier],
Please provide your quotation for:
1. [Description, quantity, unit]
Technical requirements: [per attached specification]
Please confirm:
- Brand/model and technical compliance
- Unit price, currency, price validity and applicable taxes
- Stock/lead time and country of origin
- Warranty, supporting certificates and datasheet
- Incoterm/shipping cost, delivery destination and payment terms
Submission deadline: [Date/time/timezone]
Attachments: [list ONLY verified authorized files]
Regards,
[Name / company details validated by Mas Supri]
```

**Checklist sebelum Mas Supri menekan Send:** supplier dan email benar; spesifikasi dan kuantitas benar; tidak ada internal customer confidential data yang tak perlu; deadline dan timezone jelas; lampiran disetujui; subject dan reference sinkron dengan App. **AI tidak mengirim.** Draft mailbox via IMAP belum boleh diklaim aktif.

## 4. Template Komparasi Penawaran (WORKING SHEET, bukan approval resmi)

| Supplier | Item/model | Compliance | Qty | Harga/unit & mata uang | PPN | Freight/Incoterm | Lead time | Validity | Total estimasi | Bukti | Catatan |
|---|---|---|---:|---|---|---|---|---|---|---|---|
| [Nama] | [Item] | Ya/Parsial/Tidak | [qty] | [x IDR/USD] | In/Ex/Unknown | [nilai] | [hari] | [tgl] | [formula transparan] | [quotation] | [risiko] |

**Aturan wajib:** jangan membandingkan nilai IDR/USD tanpa kurs bersumber dan tanggal; jangan menganggap PPN/ongkos/insurance sudah termasuk tanpa bukti; jangan mengubah angka supplier; diskon/volume/MOQ/certificates dan tanggal quotation wajib tercatat. Nilai **UNKNOWN** tidak boleh diperlakukan nol. Ranking AI hanyalah rekomendasi kerja.

## 5. Lembar Review dan Handoff ke Procurement App

```text
GMT Reference App:
Project ID internal (jika verified):
Jenis dokumen kerja:
Revisi dokumen:
Bukti supplier dan sumber:
Ringkasan temuan AI:
Kepatuhan teknis:
Perbedaan risiko komersial:
Kandidat pilihan Mas Supri:
Alasan pemilihan:
Diperiksa oleh Mas Supri (nama / waktu / cara): [kosong sampai benar]
Tindakan resmi yang diperlukan dalam App:
  [ ] Update existing partner (jika disetujui)
  [ ] Siapkan/ubah customer quotation via App
  [ ] Lampirkan dokumen pendukung via fitur App yang berwenang
  [ ] Tidak ada perubahan data transaksi
Disetujui final sesuai otoritas perusahaan?:
Referensi quotation resmi di App (jika sudah dibuat):
Status handoff: PENDING_REVIEW / READY_FOR_OPERATOR / ENTERED_IN_APP
Catatan audit / hal belum pasti:
```

**Penting:** status `READY_FOR_OPERATOR` dan `ENTERED_IN_APP` pada lembar ini hanyalah penanda administrasi Workspace, **bukan** status resmi aplikasi.

## 6. Kapan berhenti dan minta arahan

- Tidak ada GMT Reference terverifikasi atau project yang relevan.
- Dokumen diarahkan ke file/subfolder Google Drive yang ancestry-nya tidak bisa dibuktikan berada di dalam folder yang diizinkan.
- Pengiriman RFQ diminta otomatis, kontak supplier belum terverifikasi, atau materi mengandung credential/data customer yang tidak perlu.
- Ada konflik quotation/PPN/kurs/spesifikasi; jangan memutuskan secara otomatis.
- Perlu mengubah skema App, status transaksi, konfigurasi IMAP/WA, memberi Drive write permission, atau melakukan deploy.

## 7. Acceptance untuk pilot manual (tanpa integrasi)

1. Mas Supri bisa menyusun 1 brief, 1 tabel sourcing, 1 draft RFQ dan 1 komparasi memakai data **contoh/fiktif** dulu.
2. Tidak ada transaksi App yang digandakan ke Workspace; semua dokumen mengacu `gmtReference` resmi.
3. Setiap angka punya sumber, kurs/tanggal/syarat jika berlaku; setiap keputusan memiliki nama reviewer.
4. Tidak ada email/WA yang dikirim AI, tidak ada perubahan Drive tanpa perintah Rio, dan tidak ada tindakan pada production.
5. Baru setelah pilot disetujui, Rio memutuskan apakah template ditempatkan di folder Drive yang diizinkan dan apakah integrasi diperlukan.

**Status:** DESIGN ONLY; tidak ada email, Drive write, App write, deployment atau migration.
