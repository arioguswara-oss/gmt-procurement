# Document authorization audit — source-only finding (2026-10-19)

**Status: REVIEW_REQUIRED — no production test or code changes.** This is not proof of a production vulnerability. Source version from `gmt-procurement.zip` confirmed by Rio; runtime/roles/session policy may differ.

## Evidence (paths in ZIP source candidate)

- `apps/api/src/documents/documents.controller.ts`: controllers for `GET/POST /projects/:projectId/documents` and `GET /documents/:id/download`; `@UseGuards(JwtAuthGuard)` present.
- `apps/api/src/documents/documents.service.ts`: project existence checked; `list(projectId)` queries all project documents; `upload(projectId)` links user through `uploadedById`, but no obvious per-user project entitlement check in this service; `download(id)` loads document by ID and local storage. `assertBelongsToProject` validates related entity IDs against *project*, **not whether the requesting user may access that project**.
- `apps/api/src/common/guards/roles.guard.ts` enforces declared roles only when applied; the documents controller snapshot does not show `@Roles(...)` or `RolesGuard` attached.
- `apps/api/prisma/schema.prisma`: `Document` includes `projectId` and optional related transaction IDs, and `Project` includes `projectOwnerId`; schema alone does not prove effective project-permission policy.
- Web `apps/web/src/features/project/DocumentsTab.tsx` may hide actions in UI but **UI checks cannot substitute for server-side permissions**.

## Risk / classification

**P1 security review / PERLU PERBAIKAN candidate**, not immediately confirmed vulnerability. Without policy checks, a validly authenticated user might be able to enumerate/read/upload documents from unrelated projects by changing route IDs. This must be investigated and tested against *staging/test data only* before any AI↔Drive integration.

## Minimum scoped tests (no production probing)

1. Define **explicit expected RBAC** with Rio, including who may see cross-project data. Test owner/authorized user success and unauthorized authenticated user denied.
2. `GET /projects/:projectId/documents`: owner, authorized collaborator, unrelated user, disabled user, unauthenticated user.
3. `POST /projects/:projectId/documents`: owner, unrelated user, forged `quotationId` and `purchaseOrderId`, oversized file, unsupported type, and missing file; no filesystem write on denied request.
4. `GET /documents/:id/download`: unauthorized user given a known document ID, invalid/missing ID, deleted/archived project if supported; prevent enumeration and disclosure.
5. Other project endpoints including `GET /projects/:id` and partner/quotation routes must be checked to ensure project IDs and linked file identifiers cannot be leaked.
6. Preserve existing authorized flows, audit logs and legacy documents; no schema migration unless proven necessary and Rio approves.

## No shortcuts

- Do **not** fix by hiding buttons in React only, setting Google Drive folder public, using shared master credentials, or copying document contents into a spreadsheet.
- Do **not** patch/deploy production or claim vulnerability confirmed based on source-only review.
- Use scoped server-side authorization, correct project/document ownership checks, and fail-closed behavior.
- Drive API is not available to this module. Linking a Drive file should be a separate explicitly approved integration design, **not** writing a Drive URL into `Document.storagePath` that is resolved as a server filesystem path.

## Task handoff if Rio approves security remediation

TASK: harden project/document authorization. SCOPE: `apps/api/src/documents/*`, relevant common auth policy if exclusively assigned, scoped tests. FILE OWNERSHIP: to be allocated before implementation (P0 source import remains in progress; avoid editing an unimported codebase). PROHIBITED: SANRO, production, schema migrations without metadata, automatic Drive writes, email/WA send, other agent lanes. MINIMUM TEST: negative RBAC tests above + existing valid document upload/download regression. DELIVERABLE: diff, test outputs, SHA, residual risks and rollback notes.

## Gate status

Source evidence: FOUND; test exploitability: NOT VERIFIED. Hosting verification: NOT VERIFIED. Deploy readiness: NOT READY. LOCK: NO.
