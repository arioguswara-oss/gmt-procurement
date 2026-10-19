# GMT Procurement — Static baseline feature audit (2026-10-19)

**Read-only source evidence, not hosting verification.** Owner/final approver: Rio. The existing Procurement app remains the transactional system of record; document workspace and SANRO are separate.

## EXISTING (verified in source only)

- Project/inquiry: `apps/api/src/projects/*`, Prisma `Project`, web Projects UI.
- Business partner/contact master: `business-partners/*`, Prisma `BusinessPartner` and `BusinessPartnerContact`; whether supplier attributes are supported still needs explicit review.
- Customer quotation lifecycle: `quotations/*` create/revise/accept/reject/cancel and `Quotation/QuotationItem`. `POST /quotations/:id/send` is not proof of an outbound email integration.
- Customer PO, delivery, receiving, invoice, tax documents, receipts and payments: dedicated controllers/services and schema models.
- Project documents and activity logs: dedicated modules and source routes.
- Auth/roles: JWT and roles guards, Prisma `UserRole`; actual authorization behavior not tested.

## GAP CANDIDATES (not proof of absence on hosting)

- `Quotation.rfqNo` field exists but is insufficient to establish a supplier RFQ lifecycle.
- Source review did not identify a dedicated supplier sourcing/discovery route, supplier portal, inbound supplier quotation comparison module, bidding approvals or outbound RFQ integration.
- `BusinessPartner` appears generic, without a clearly distinguished supplier master in the static model snapshot. Validate actual business semantics before adding columns/tables.
- No automatic send is authorized: draft email on cPanel only with Mas Supriyanto pressing Send; default OFF for any WhatsApp/Fonnte notification.

## Keputusan arsitektur Rio: Procurement App vs Google Drive AI Workspace

Masukan diskusi Mas Supriyanto **bukan otomatis permintaan fitur baru aplikasi**. Gunakan metode **app-first for transactions, Drive-first for research and documents**. Ini koreksi prioritas dibanding kandidat gap awal.

- **Procurement App = sumber kebenaran transaksi.** Gunakan modul existing untuk inquiry/project, master partner/supplier apabila memang tersedia, quotation customer, PO, fulfillment, invoice/pembayaran, state/approval/audit yang sudah terverifikasi. Jangan membuat data transaksi paralel di spreadsheet atau mereplikasi editor dokumen.
- **Google Drive Workspace = meja kerja AI untuk Mas Supri**, termasuk pencarian dan evaluasi supplier existing/baru, riset produk dan spesifikasi, template RFQ, permintaan penawaran yang masih berupa draft, tabel perbandingan kerja, katalog/penawaran, lampiran, proposal, revisi, dan SOP. AI dapat membantu menyusun, memeriksa, merangkum, dan mengorganisasi dokumen sesuai izin; **tidak otomatis mengirim pesan, menyetujui penawaran, mengubah status transaksi, atau menulis dokumen** tanpa otorisasi relevan.
- **Batas Drive keras:** hanya folder `Gayuh Mandala Storage Share` (ID `1Zdui1O0CEA0YvQhSQu2P7Q6Tr2hqP_0A`) dan descendants terbukti. Default READ-ONLY. Jangan akses global/root/berkas luar scope, dan jangan membuat/mengubah dokumen tanpa perintah Rio yang jelas dan spesifik.
- **Handoff:** hasil research/dokumen yang telah ditinjau Mas Supri masuk transaksi aplikasi hanya melalui proses/fitur yang sudah ada dan memang diizinkan. Jika kelak perlu integrasi, gunakan ID Project/Partner/RFQ/Quotation yang stabil, ACL, audit trail dan fail-closed; akses folder **bukan** bukti integrasi sudah tersedia.
- **Peran:** Mas Supri memeriksa dokumen dan keputusan operasional; Rio approval untuk perubahan aplikasi/integrasi/deployment; AI tidak punya izin autonomous send.
- **Supplier Portal:** tetap fase berikutnya/roadmap; bukan syarat agar AI bisa membantu proses sourcing dan RFQ dengan dokumen Drive sekarang.

## Pembagian tugas yang benar (klasifikasi usulan, bukan bukti implementasi)

| Kebutuhan | Jalur awal | Kapan dipertimbangkan dalam aplikasi |
|---|---|---|
| Inquiry client dan referensi project | **APP EXISTING** | Audit/perbaiki hanya jika ditemukan gap teruji |
| Master partner/supplier dan kontak | **APP EXISTING / PERLU PERBAIKAN**, TBD | Jika data master saat ini tidak cukup, audit role/schema lebih dulu |
| Sourcing supplier baru, verifikasi katalog dan riset pasar | **WORKSPACE ONLY terlebih dahulu** | Hanya data supplier yang sudah disetujui masuk master App bila perlu |
| Spesifikasi barang, RFQ template, lampiran penawaran | **WORKSPACE ONLY** | Hubungkan ke transaksi dengan ID stabil jika integrasi disetujui |
| Draft RFQ/email ke supplier, revisi | **WORKSPACE ONLY + INTEGRASI TERKENDALI**, belum aktif | Human review; hanya Mas Supri yang mengirim email; no SMTP dari AI |
| Komparasi penawaran supplier untuk persiapan bidding | **WORKSPACE ONLY** untuk worksheet/analisis pendukung | Approval final, harga resmi, dan catatan transaksi mengikuti App/gate bila dibutuhkan |
| Bidding/customer quotation, PO, pembayaran, audit | **APP EXISTING / PERLU PERBAIKAN** | Hindari penduplikasian data di Drive |
| Supplier Portal | **ROADMAP**, bukan lingkup saat ini | Membutuhkan audit dan approval fase terpisah |

**Alur kerja:** inquiry tercatat dalam App → AI membantu Mas Supri melakukan sourcing/spesifikasi/RFQ dan menelaah quotation melalui Workspace → Mas Supri review/otorisasi → keputusan dan transaksi resmi kembali tercatat di App sesuai alur existing. Tidak semua langkah riset harus diubah menjadi tombol/fitur aplikasi.

## Blockers and next gates

- Original ZIP SHA-256 verified and CRC PASS; selective source candidate locally staged: 128 files / 322,562 bytes; TypeScript parser 113 files 0 syntax errors; relative imports 333/333 resolved. This is **not** full build/test or proof of production source parity.
- Source not yet imported into GitHub Private, and no root lockfile was found. Complete manual privacy/secret review and dependency strategy before import and reproducible build.
- No DB/hosting inspection, migration/seed, notification, external API call, deployment, or LOCK approval.
- **Status:** Overall Source/Foundation = candidate staged, import pending; Module Progress = static audit only; Source/Test = syntax PASS / regression PENDING; Hosting = NOT VERIFIED; Deploy = NOT READY; LOCK = NO.
