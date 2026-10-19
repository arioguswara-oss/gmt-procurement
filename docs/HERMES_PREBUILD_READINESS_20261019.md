# Hermes Procurement — Build Readiness Gate V0 (DRAFT)

Date: 2026-10-19. Owner: ChatGPT. Final approver: Rio.

**DESIGN + STATIC CHECK ONLY.** No new CI daemon, package installation, application build, network, database, or production access.

## Scope and gate

Files: `ci/hermes/inspect_build_readiness.py` and `ci/hermes/test_inspect_build_readiness.py`.

- Checks required Node/cPanel entrypoint, API/web manifests and bootstraps, Prisma schema, and whether required paths are ordinary files (not symlinks).
- Checks all three package JSON manifests and a root `package-lock.json` **structure** (v2/v3 and name match). Structure validation is NOT supply-chain verification.
- Inspects the statically resolved `npm run` build script references within each package. Flags known database-mutating/suspicious commands, shell expansion, missing targets, and lifecycle install hooks for manual review.
- **Never executes package scripts, npm, Prisma, source code or installer.**
- Returns `BLOCKED` (exit 2) if a prerequisite fails, or `REVIEW_REQUIRED` (exit 0) if this narrow static check finds no blocker. No READY_TO_BUILD or READY_TO_DEPLOY result is produced.

## Verified local evidence

The source candidate ZIP was selectively and locally staged from the approved ZIP and verified at SHA256 `de2673a06b9975b722078c825a72c8c9d68e4e1edb5fffa3133d599bea38bbe5`. Only required package files/entrypoint/schema were inspected in a scratch directory; no source executed.

- **8/8 synthetic local unit tests PASS**: good metadata, missing lockfile, DB mutating build script, missing build script target, shell substitution, lifecycle hook, missing required source, malformed lockfile.
- Actual Procurement source metadata: **BLOCKED, finding ROOT_LOCKFILE_MISSING**. Three package manifests and five build-related script definitions checked; no other finding from these limited patterns.
- GitHub blob SHA values were verified to match the byte-identical locally tested Python source/test files.
- **TESTED ON HERMES 2026-10-19 11:10 WIB**: 8/8 synthetic tests PASS in manual Bubblewrap run at verified Git SHA `69d7d15b74414a11feda9f236dee0a4e4beca397`; test script extracted via `git archive` from fetched commit; previous `ci/hermes/run-checks.sh` remains unchanged.

## Future on-demand test (after Rio review)

Fetch the PR branch to the `gmtci` repository using the read-only deploy key, **without changing the active checkout**. Verify fetched SHA. Extract *only these two Python CI files* with `git archive` to a fresh `gmtci`-owned temporary directory. Execute `python3 -m unittest discover -s /work -p test_inspect_build_readiness.py -v` inside offline Bubblewrap with read-only source mount, timeout max 60 seconds; clean temporary files. This synthetic test does not require app source.

An attempt to scan the current CI-only branch as an application checkout should return `BLOCKED` (missing application files). This is expected, not CI failure.

## Gates before full app build

1. Import the complete, manually sanitized app source to a scoped private development branch. Source ZIP and Drive folder are not replacements for Git repository files.
2. Establish an audited dependency lockfile and isolated installation, and verify actual dependency scripts and package licensing.
3. Set measurable memory/CPU limits, no network by default, no host secrets, no access to SANRO or production DB; only explicitly approved build commands.
4. Run full Nest/Vite build, API regression and negative RBAC tests using approved isolated test resources.
5. Record SHA + test evidence; only Rio may authorize any migration/deploy. CI PASS ≠ HOSTING VERIFIED ≠ LOCKED.

## Status

Overall Source/Foundation: staged source candidate; GitHub source import pending. Module Progress: no new business feature. Source/Test: 8/8 local PASS for this gate, Procurement static readiness BLOCKED (missing lockfile), full build/regression PENDING. Hosting Verification: NOT VERIFIED. Deploy Readiness: NOT READY. LOCK: NO.

## Checkpoint Hermes execution — 2026-10-19, screenshot Rio 11:10 WIB

- `gmtci` fetched `chatgpt/hermes-prebuild-readiness-20261019` and verified `FETCH_HEAD` = `69d7d15b74414a11feda9f236dee0a4e4beca397`; active checkout branch stayed `chatgpt/hermes-ondemand-ci-20261019`.
- In a temporary directory owned by `gmtci`, two CI Python files were extracted via `git archive` from the **verified SHA**. The user ran `timeout 60s bwrap --unshare-user --unshare-pid --unshare-net --unshare-ipc --unshare-uts ... --ro-bind ...`, synthetic unittest discover with `test_inspect_build_readiness.py`.
- Screenshot shows **all eight tests `ok`**, `Ran 8 tests in 0.032s`, `OK`, `HERMES_PREBUILD_TEST_PASS` and terminal prompt returned. This is evidence for **offline synthetic gate** only, **not** application source build.
- No `npm install`, DB operation, email, WhatsApp, migration, source app execution, deploy, SANRO or Google Drive writes were requested by this procedure.
- After this test, residual processes and cgroup memory limits were **not independently checked**, though shell returned. Previously documented IDLE PASS applies to prior test only.
- Gate `ROOT_LOCKFILE_MISSING` for original app source remains a blocker. **Full Nest/Vite build, production verification, and LOCK were not performed.**
- Source/Test: Hermes prebuild gate **8/8 PASS**, actual app build **BLOCKED/PENDING**. Hosting NOT VERIFIED, Deploy NOT READY, LOCK NO.
- NEXT: verify a reproducible lockfile and sanitized source import on dedicated GitHub branch, then resource-limited build/test in separate CI lane; continue to use on-demand, offline-by-default and require Rio approval for deploy.
