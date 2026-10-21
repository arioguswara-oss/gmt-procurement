#!/usr/bin/env bash
# Build a self-contained ZIP on a trusted Linux Node.js 22+ computer.
# Does not contact, migrate, or deploy to production. No staging/Hermes required.
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
command -v node >/dev/null && command -v npm >/dev/null && command -v python3 >/dev/null && command -v zip >/dev/null
test "$(node -p 'Number(process.versions.node.split(".")[0]) >= 22')" = true || { echo "Node >=22 required"; exit 1; }
test -f package-lock.json && test -f apps/api/prisma/schema.prisma && test -f app.js
test ! -f .env || echo "INFO: existing .env stays private and will NOT be packaged"
COMMIT="$(git rev-parse HEAD 2>/dev/null || echo NON_GIT_SOURCE)"
if [[ "${1:-}" != "" && "$COMMIT" != "$1" ]]; then echo "Unexpected commit: $COMMIT (expected $1)"; exit 1; fi
if [[ "$COMMIT" == "NON_GIT_SOURCE" ]]; then echo "Source must be a pinned git checkout (not an unverified folder)"; exit 1; fi

# Uses an intentionally unreachable dummy DB URL: only Prisma client generation, NO DB connection.
export DATABASE_URL='mysql://build:build@127.0.0.1:1/build_must_not_connect'
export PRISMA_CLI_QUERY_ENGINE_TYPE=binary
export PRISMA_GENERATE_NO_ENGINE=0
npm ci --ignore-scripts --no-audit --no-fund
npm run prisma:generate
npm run build
node --test scripts/test_*.cjs
python3 -m unittest discover -s scripts -p 'test*.py'
node deploy/cpanel/preflight.cjs
node --check apps/api/dist/main.js

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
mkdir -p "$STAGE/gmt-procurement/apps/api/prisma" "$STAGE/gmt-procurement/apps/web" "$STAGE/gmt-procurement/deploy/cpanel"
cp app.js package.json package-lock.json "$STAGE/gmt-procurement/"
cp -a apps/api/dist "$STAGE/gmt-procurement/apps/api/"
cp apps/api/prisma/schema.prisma "$STAGE/gmt-procurement/apps/api/prisma/"
cp -a apps/web/dist "$STAGE/gmt-procurement/apps/web/"
cp -a deploy/cpanel/preflight.cjs deploy/cpanel/sql "$STAGE/gmt-procurement/deploy/cpanel/"
cp -a node_modules "$STAGE/gmt-procurement/"
printf '%s\n' "$COMMIT" > "$STAGE/gmt-procurement/SOURCE_COMMIT.txt"
printf '%s\n' "NODE=$(node -v)" "NPM=$(npm -v)" "BUILT_UTC=$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$STAGE/gmt-procurement/BUILD_ENVIRONMENT.txt"
cat > "$STAGE/gmt-procurement/READ_FIRST.txt" <<'TXT'
GMT PROCUREMENT RELEASE PACKAGE
No .env, SQL dump, production uploads, passwords, or secrets are included.
1. Back up active app, database, .env and storage/uploads.
2. Check MariaDB schema and apply additive 02_ADD_CORETAX_AND_INVITES.sql only if baseline matches.
3. Stop app; extract the package in the Node.js application root.
4. Retain existing production .env and storage/uploads outside the package.
5. Check Node.js >=22 and execute: node deploy/cpanel/preflight.cjs
6. Restart app manually in cPanel, check /api/health and /api/health/ready.
7. SUPER_ADMIN Ario creates user invite, Pak Supri accepts.
8. Set CORETAX_VERIFIER_USER_ID to Pak Supri's displayed immutable numeric user ID, restart manually.
9. Pak Supri tests in hosting and explicitly verifies a real uploaded Coretax file before Invoice FINAL.
Do not import the old full SQL dump, auto-verify old uploads, or expose this ZIP publicly.
TXT
mkdir -p "$ROOT/release-output"
OUT="$ROOT/release-output/GMT_Procurement_${COMMIT:0:12}_MANUAL_DEPLOY.zip"
(cd "$STAGE" && zip -qr "$OUT" gmt-procurement)
sha256sum "$OUT" > "$OUT.sha256"
echo "BUILD PASS: $OUT"
echo "SHA256: $(cat "$OUT.sha256")"
