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

## Proposed classification, scoped behind code/role audit

| Work item | Initial classification | Acceptance and safety |
|---|---|---|
| Supplier tagging/linkage on existing BusinessPartner | PERLU PERBAIKAN or FITUR BARU, TBD | No duplicate customer/partner records; existing data preserved |
| Supplier discovery and onboarding | FITUR BARU candidate | Provenance, RBAC and audit log |
| RFQ template/specs and supporting docs | WORKSPACE ONLY initially | Stable document↔project/transaction IDs; folder ancestry and ACL verified |
| RFQ lifecycle and supplier replies | FITUR BARU / INTEGRASI candidate | No auto-send, traceability, role restrictions |
| Comparison/approval/bidding calculations | FITUR BARU candidate | Explicit tax/currency rules and immutable approval trail |
| Supplier portal | ROADMAP | No implementation during this phase |

Target flow: customer inquiry → existing/new supplier sourcing → RFQ → supplier quotation → comparison/approval → customer bidding. Preserve existing Project, BusinessPartner, and customer Quotation modules.

## Blockers and next gates

- Original ZIP SHA-256 verified and CRC PASS; selective source candidate locally staged: 128 files / 322,562 bytes; TypeScript parser 113 files 0 syntax errors; relative imports 333/333 resolved. This is **not** full build/test or proof of production source parity.
- Source not yet imported into GitHub Private, and no root lockfile was found. Complete manual privacy/secret review and dependency strategy before import and reproducible build.
- No DB/hosting inspection, migration/seed, notification, external API call, deployment, or LOCK approval.
- **Status:** Overall Source/Foundation = candidate staged, import pending; Module Progress = static audit only; Source/Test = syntax PASS / regression PENDING; Hosting = NOT VERIFIED; Deploy = NOT READY; LOCK = NO.
