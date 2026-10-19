# Source import and local build evidence — 2026-10-19

Lane P0-IMPORT, Codex under Rio continuation mandate; PR #7 DRAFT.

## Verified results
- Import SHA f0ad54ef5484f64d9be1609515c7cac841650a90; parent db3c2ce609b7a19fc18b2a56cf34c52c3374280f. Added 66 files / 291318 bytes. All 126 files / 321837 bytes match original ZIP by individual SHA256, size and Git blob SHA1; 60 existing files preserved.
- Original ZIP SHA256 25ce1448015b34144dc16a67609a61f9ad5dd7ef70fd647b401c3d22caf06813, 200209381 bytes. Historical review bundle unavailable locally; manifest reconstructed from verified original ZIP, not falsely claimed as compared against unavailable old manifest. Drive parent verified before download; no Drive writes/out-of-scope access.
- Source heuristic scan: zero credential findings. Reviewed credential/database code uses environment/runtime values. Existing prefilled login email retained only in authorized private source; not copied into report. Empty password default. Limited review, not comprehensive security clearance.
- New root lockfile: npm 11.17.0, Node 24.19.0; npm ci --ignore-scripts PASS, 528 installed. 604 package entries, all registry.npmjs.org and integrity hashes; npm ls --depth=0 PASS.
- New resolution, not historical reconstruction: 31 shared versions differ from archived internal lock, including React/ReactDOM 19.3.0→19.3.1, Vite 6.4.3→6.4.4, @types/node 22.20.4→22.20.5. Source package manifests unchanged. Linux/Node22 unverified.
- Install lifecycle disabled. Explicit Prisma Client 6.19.3 generate PASS with dummy localhost URL, no DB access/push/migrate/seed.

## Checks
- Python gate unit tests 17/17 PASS; tracked source guard PASS; manifest verifier 126/126 PASS.
- API TypeScript noEmit and NestJS build PASS.
- Web TypeScript noEmit and Vite build PASS (61 modules). Initial Vite sandbox access failure resolved by authorized local retry.
- DB-free regression 10/10 PASS: environment validation, missing/invalid JWT, inactive/active mocked users, authorized/unauthorized roles. No application bootstrap or real database.
- Full transactional regression, E2E, PDF rendering and DB integration NOT tested.
- Import diff check has one original trailing whitespace at apps/web/src/features/project/QuotationTab.tsx:21; preserved for byte identity.

## Blockers
- npm audit: 11 high, 1 moderate; details in DEPENDENCY_AUDIT_20261019.json. Suggested fixes include major Prisma/Puppeteer upgrades; no automatic audit fix.
- GitHub Actions source-guard run 39258188942 FAILURE, no steps, log BlobNotFound. Local guard PASS does not mean remote CI PASS.
- Hermes direct gmtci SSH denied publickey. Rio authorized sanro SSH transport and read-only sudo account transition; noninteractive sudo requires authentication. Rio supplied gmtci UID993/GID981-only output.
- Read-only inspection of reported session-31.scope and parent slices: cpu.max=max and memory.max=max. Heavy VPS build BLOCKED pending dedicated resource limits; no build as root/sanro or SANRO project/config/service access.

## Reproduction and next step
Use npm ci --ignore-scripts --no-audit --no-fund; explicitly generate Prisma client with dummy localhost DATABASE_URL and PRISMA_GENERATE_NO_AUTO_INSTALL=1. Run TypeScript noEmit for both apps, Nest build in apps/api, Vite build in apps/web, node --test scripts/test_db_free.cjs, Python gate tests and manifest verifier. Never execute setup:staging, seed, db push, migrate or app bootstrap.
Hermes build requires verified dedicated gmtci CPU/RAM/filesystem limits, exact commit, offline dependency preparation and Bubblewrap network/process/filesystem isolation. Do not reuse SANRO environment.

## Status
Overall Source/Foundation: import DONE_SOURCE, local lock/build evidence complete.
Module Progress: existing baseline retained; no new business modules.
Source/Test: 126/126 identity, 27 tests, API/web builds PASS locally; remote CI/security open.
Hosting Verification: NOT VERIFIED. Deploy Readiness: NOT READY. LOCK: NO.
Next: dependency remediation review, dedicated gmtci limits, isolated Linux build and broader regression. No merge/deploy/migration.
