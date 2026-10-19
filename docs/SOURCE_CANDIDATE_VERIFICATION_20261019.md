# GMT Procurement — verified source candidate gate (2026-10-19)

Owner Rio. Lane P0-IMPORT (ChatGPT). **Source review artifact, not a deployment package.**

## Verified inputs and cross-check

- Original `gmt-procurement.zip`: 200,209,381 bytes, 37,761 ZIP entries, SHA-256 `25ce1448015b34144dc16a67609a61f9ad5dd7ef70fd647b401c3d22caf06813` (matched prior checkpoint), CRC PASS.
- Locally staged `gmt-procurement-source-CANDIDATE-20261019.zip`: 128,217 bytes, SHA-256 `de2673a06b9975b722078c825a72c8c9d68e4e1edb5fffa3133d599bea38bbe5`, CRC PASS.
- **128/128 candidate files byte-identical to named files in original ZIP**. Candidate source payload 322,562 bytes (93 API, 29 web, six root/deploy). Embedded per-file SHA256/size manifest matched exactly; candidate files matched local staged copies.
- All expected root / cPanel entrypoint / API bootstrap / Prisma schema / frontend bootstrap files present in candidate. `node_modules`, `.env*`, uploads, runtime storage, logs and historical patch bundles excluded.
- Local scanner checked unsafe ZIP paths, source-only classification, entry types, content binary, common token and private-key indicators: zero blocker findings. **Not a complete manual secret/PII clearance.**
- Added `scripts/verify_source_candidate.py` and `scripts/test_verify_source_candidate.py` to PR #4. Git blob hashes `9c794537ca902331cc7baffaae5a5d04fee09f0d` and `f6792d23aa317197962c2878f4cbf287f2826b66` matched locally tested bytes.
- **Six synthetic unit tests PASS locally**: valid manifest, candidate SHA mismatch, unexpected file, path traversal, credential-like content, forbidden runtime path.
- Running verifier against actual candidate returned `REVIEW_REQUIRED`, `files_verified=128`, zero findings; includes source-review manifest separately from 128 code files. This label does **not** mean `PASS FOR DEPLOY`.

## Findings blocking full source import/build

- Candidate ZIP contains 128 file source subset, not all needed distribution artifacts. The original ZIP has no root package lockfile; reproducible dependency install/build and licensing/supply-chain gates remain PENDING.
- Static source review identified a potential missing project-level authorization check on document list/upload/download endpoints. See `docs/DOCUMENT_ACCESS_REVIEW_20261019.md` on PR #5. Hosting exploitability **NOT VERIFIED**; test authorization using synthetic staging user/project data only.
- `prisma:push:staging`, `prisma:seed`, `setup:staging` and API `prisma:migrate` can mutate DB. No automatic execution allowed. See `docs/BUILD_DEPENDENCY_SAFETY_20261019.md`.
- **Full source import to GitHub is NOT DONE**. GitHub connector changes recorded in this PR are *audit tooling/docs only*. Do not claim that the 128 file app source tree already exists in the repository.
- The local candidate artifact is readable in the sandbox, but the GitHub file connector currently accepts file content rather than the local ZIP path. Bulk source upload must use a separately approved secure transport or an authorized developer tool after manual clearance; do not expose a production credential or push using Hermes read-only deploy key.

## Gate and work status

| Dimension | Current state |
|---|---|
| Overall Source/Foundation | Local source candidate integrity VERIFIED; GitHub source import PENDING |
| Module Progress | Existing modules inventoried; no new business functionality |
| Source/Test | 6/6 candidate verifier tests PASS local; source parse PASS previously; full build/regression PENDING |
| Hosting Verification | NOT VERIFIED |
| Deploy Readiness | NOT READY |
| LOCK | NO |

**NEXT SAFE ACTION:** scoped manual review of candidate source (privacy, dangerous URLs, packaging), then secure import on dedicated branch. Full Node/Nest/Vite build only once lockfile/dependency and isolation gates are approved. Do not touch Drive outside authorized folder, SANRO, production, mail or Fonnte.
