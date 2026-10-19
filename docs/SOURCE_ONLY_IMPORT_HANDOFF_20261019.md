# GMT Procurement — Source-only import handoff (2026-10-19)

**Owner:** Rio (final approval). **Lane:** P0-IMPORT / ChatGPT. **Status:** REVIEW_REQUIRED, **NOT IMPORTED**. **Target:** dedicated private dev branch after manual security clearance; **not** `main`, production, SANRO or Drive.

## Verified local artifacts (not yet on GitHub)

1. Original authorized Drive archive `gmt-procurement.zip`: 200.209.381 bytes, SHA-256 `25ce1448015b34144dc16a67609a61f9ad5dd7ef70fd647b401c3d22caf06813`.
2. Candidate source-only `gmt-procurement-source-CANDIDATE-20261019.zip`: 128 source files, SHA-256 `de2673a06b9975b722078c825a72c8c9d68e4e1edb5fffa3133d599bea38bbe5`, manifest with per-file hashes; all 128 source files byte-identical to original archive.
3. **Import review artifact** `GMT_Procurement_SOURCE_IMPORT_REVIEW_20261019.zip`: 126 source files plus `SOURCE_IMPORT_MANIFEST.json` and `SOURCE_IMPORT_README.md` (128 archive entries), 127.997 bytes, SHA-256 `2af9eca7398bc3ca40cc4dddfef27eec06dc9738b9a7600156c897ba6865abab`.
4. Import artifact excludes source-archive `README.md` and `.gitignore` because the active private repository already has its own versions (verified by reading tree of PR #4 at commit `c6c86d3fe1241fbea96ebae2f11153844566ff53`). Neither existing file is to be overwritten without a scoped diff review.
5. Local candidate is a source *snapshot*, **not** build output or release artifact. It excludes `.env*`, logs, uploads, node_modules, runtime data, backups, and seed/migration execution. Root lockfile is missing; source completeness still requires review.

**Do not put private files/credentials into chat, a public repo, or an unrelated Drive folder.** The review archive is not accessible via a GitHub connector URL and has not been pushed.

## Import procedure for an approved engineering environment (plan, not execution)

- Confirm authenticated GitHub connector/repo account and target private repository `arioguswara-oss/gmt-procurement`. Never copy or request private keys, OAuth tokens, `.env`, SSH credentials or source attachments publicly.
- Fetch remote HEAD/workboard first. Do **not** modify another lane in progress. Branch exclusively from reviewed P0-IMPORT HEAD into a new scoped source-import branch, no force-push or merge.
- Read archive bytes locally and verify exact expected ZIP SHA. Validate each `SOURCE_IMPORT_MANIFEST.json` path and per-file SHA/length, file type, and absence of traversal/symlink/executables/binary/log/runtime paths.
- Validate all 126 file paths against the current Git tree **before** staging; existing paths must be enumerated and conflicts fail closed. Import no `README.md`/`.gitignore` from the historical ZIP.
- Do manual privacy/secrets/content review (including default email prefilling in frontend login UI, no value to be copied to logs). If any secret is found, stop and quarantine rather than upload.
- Stage **only** source paths, no ZIP itself, no local manifest containing personal data. Use one scoped commit or reviewed batches with exact SHA and count, verify tree lists precisely expected files.
- Run `git diff --check`, source safety guard, syntax/static tests and staged file manifest check; never execute `setup:staging`, Prisma migration/push/seed, package lifecycle, or app server during import.
- PR must remain DRAFT until full build/regression/permissions tests pass; do not merge `main`, modify hosting, activate IMAP/Fonnte/Drive integrations, or deploy.
- Reproducible root dependency lockfile (see `docs/DEPENDENCY_PROVENANCE_FROM_ORIGINAL_ZIP_20261019.md`) is a **separate test gate**; internal `node_modules/.package-lock.json` metadata is NOT a root lock.

## Codex engineering handoff — when source bytes are available securely

**TASK:** Import sanitized existing Procurement source to private branch, with no production changes.

**SCOPE:** verified 126-file import-review ZIP; follow exact per-file manifest hashes. If required build assets/lockfile are absent, report blocker without inventing content.

**FILE OWNERSHIP:** newly introduced `app.js`, `.nvmrc`, `package.json`, `apps/api/**`, `apps/web/**`, `deploy/cpanel/**` only. Preserve existing repository root docs, workflows, `.gitignore`, scripts and other agent lanes.

**AREA DILARANG:** `Sanro-SuperAdmin`, website repo, any other Google Drive folder, production DB/hosting, customer files/credentials, migration, automatic email/WA send, merge/deploy/LOCK.

**ACCEPTANCE:** file count and hash equality, zero path conflicts or credential findings, correct scripts/entrypoints/config inventory, new branch and scoped commit SHA, secure review of unexpected files, test logs and known blockers.

**MINIMUM TEST:** manifest verifier (read-only), source guard, TypeScript syntax, reference resolution, `git diff --check`. No npm install/build or migrations before dependency/sandbox readiness.

**DELIVERABLE:** PR DRAFT, SHA, manifest evidence, tests, risks, missing file list, next action for dependency lockfile and isolated Hermes CI.

## Project status

Overall Source/Foundation: candidate and conflict-free review ZIP staged locally; private source import **PENDING**.
Module Progress: no new business functionality.
Source/Test: ZIP/manifests and syntax static PASS; full Nest/Vite build/regression PENDING.
Hosting Verification: NOT VERIFIED.
Deploy Readiness: NOT READY.
LOCK: NO.
