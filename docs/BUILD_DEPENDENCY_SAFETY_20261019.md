# Procurement build/dependency safety preflight — 2026-10-19

Source evidence: locally staged source-only candidate from original `gmt-procurement.zip` with verified archive SHA-256 `25ce1448015b34144dc16a67609a61f9ad5dd7ef70fd647b401c3d22caf06813`. **Static inspection only.** Do not run source or dependencies on hosting/production.

## Confirmed package scripts (source snapshot)

- Root `package.json`: name `gmt-procurement-cpanel`, version `0.15.0`, Node `>=22`; `build` delegates to `build:api` and `build:web`; `start:cpanel` uses `node app.js`.
- Root `prisma:generate` runs Prisma client generate. Note: it may load build scripts; run only after dependency trust check in isolated staging.
- Root `prisma:push:staging` invokes **`prisma db push`**, which can mutate a database if configured. **PROHIBITED** until separately approved with verified staging target.
- Root `prisma:seed` runs `tsx apps/api/prisma/seed.ts` and `setup:staging` chains **generate → build → seed → preflight**. **DO NOT RUN**: seed can write data and may target a DB if environment is misconfigured.
- API `apps/api/package.json` has `prisma:migrate` invoking `prisma migrate dev` and `prisma:seed`. **DO NOT RUN** on any database without explicit scope/approval.
- Frontend `apps/web/package.json` has `tsc -b && vite build`; still must review dependency scripts before executing `npm install`.
- No root `package-lock.json`, `pnpm-lock.yaml` or `yarn.lock` was found in original ZIP source review. Reproducible dependency graph **NOT VERIFIED**; avoid version guesses.

## Required before full build/test

1. Verify/source-import baseline completeness (source, `app.js`, deployment preflight, Prisma schema, static assets, important config, and migration/seed scripts inventoried **without executing them**).
2. Audit exact package dependency ranges and supply-chain risk; generate a lockfile in isolated **network-controlled** dev environment, separate from Hermes production/SANRO and unrelated credentials; do not generate against the live server.
3. No `.env` or production credentials. DB_HOST and token variables should be unset; use synthetic mock/local test resources only. No connections to production.
4. Use `npm ci --ignore-scripts` only **after** approved lockfile is present; lifecycle scripts `postinstall`/native builds need separate review. Do not automatically run package scripts except explicitly whitelisted compile/test targets.
5. Test TypeScript type-check, Nest build, frontend build, API unit/integration with **isolated test database only if explicitly approved**, role-based access tests, and browser smoke test where available.
6. Record exact SHA, lockfile, Node/npm versions, command allowlist, CI logs, file hash manifest; fail closed on missing deps or unexpected outbound access.
7. For deployment **later**, use minimal built release suitable for actual cPanel runtime; determine required dependencies and backend server entry only after test/hosting preflight. Do not assume source-only 128 KB package is deployable.
8. Staging/hosting verification ≠ LOCK. Deployment and any DB migration require explicit Rio instruction, backup, rollback and smoke checklist.

## Source/CI gate summary

- Original ZIP CRC PASS, source candidate 128 files, TypeScript syntax-only 113 files and local relative imports 333 references **previously PASS**.
- **Dependency resolution, full build, API tests, migration review, auth tests, hosting verification: PENDING.**
- Hermes smoke CI and idle checks historically PASS, but unrelated to complete app build.
- Overall source baseline: source-only candidate locally staged; GitHub import PENDING. Module progress: audit only. Deploy readiness: NOT READY. LOCK: NO.
