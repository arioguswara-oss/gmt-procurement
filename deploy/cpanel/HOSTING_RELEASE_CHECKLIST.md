# GMT Procurement — paket manual untuk Rio dan UAT Pak Supri

## IMPORTANT
PR #16 code version MUST be frozen. Do not call source ZIP a compiled binary artifact. The complete source ZIP contains **all required application files**, excludes database dumps, .env and uploads. The build happens on hosting via Rio's manual command `bash deploy/cpanel/BUILD_ON_HOSTING_MANUAL.sh`. It requires a Node.js >=22 environment, npm registry access, and working compilation; no staging/Hermes/Telegram needed.

## INSTALLATION ORDER
1. Export a new full MariaDB backup via hosting phpMyAdmin and save it away from webroot. Also back up old application code, production `.env`, and storage/uploads. Record current Node app root, startup file `app.js`, environment settings and Node version.
2. In phpMyAdmin select the *GMT Procurement* database. Run `sql/01_PREFLIGHT_READ_ONLY.sql` and compare against Rio's dump from Oct 19, 2026. If schema has already changed, STOP — do not blindly reapply.
3. **Manually**, when the baseline matches and DB backup exists, run `sql/02_ADD_CORETAX_AND_INVITES.sql` exactly once. It is additive but MariaDB DDL autocommits. Run `sql/03_POSTFLIGHT_READ_ONLY.sql` to inspect.
4. Set maintenance window and stop the running Procurement Node app. Extract complete ZIP source into the Node app root, retaining the existing `.env` and storage outside overwritable source folders. Protect files from public HTTP access and never publish source ZIP in public_html.
5. In cPanel select **Node.js >=22**, point startup at `app.js`, and run `bash deploy/cpanel/BUILD_ON_HOSTING_MANUAL.sh` manually through allowed terminal. Do not run `prisma db push`, `migrate dev`, `setup:staging`, or `seed`.
6. Restart the Node app in cPanel manually. Check `/api/health` and `/api/health/ready`. Note that `PDF_SERVER_ENABLED` must only be true if a runnable Chromium path is configured; browser preview/print can still work if off.
7. Login Ario SUPER_ADMIN → *Pengguna & Undangan* → create OPERATIONS invite for Pak Supri → copy link once and share privately. Pak Supri opens the link, creates password, logs in. Do not share Ario credentials.
8. On *Pengguna & Undangan*, obtain Pak Supri's immutable numeric ID. Set `CORETAX_VERIFIER_USER_ID=<actual numeric id>` in **server environment**, restart manually. Never put Ario's ID or a guessed number.
9. Pak Supri uploads a real Coretax PDF/JPG/PNG, inspects the source file and clicks explicit Verify. Make sure before verification Invoice FINAL is blocked. After verified, FINAL is allowed; replaced tax proof requires new verification. Test invoice and Kwitansi preview/print/PDF, archived billing file access and negative role tests.
10. Pak Supri confirms UAT result to Rio; only then label release accepted.

## ROLLBACK
If installation fails **before any new users/tax verification records**, stop new Node app, restore previous code and full MariaDB backup together; preserve existing `.env` and storage snapshot. Do not run `sql/04_ROLLBACK_SCHEMA_MANUAL_ONLY.sql` without investigating if new rows exist. If users are invited/accepted or tax records verified, manual downgrade is data-sensitive; do not drop table/column or automatically downgrade VERIFIED enum.
