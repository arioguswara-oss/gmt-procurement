#!/usr/bin/env bash
# Manual, interactive only: Rio runs this AFTER backup, SQL migration, and source ZIP extraction.
# Never performs DB writes, migration, seed, or server restart.
set -Eeuo pipefail
cd "$(dirname "$0")/../.."
if [ ! -f app.js ] || [ ! -f package-lock.json ]; then
  echo "ERROR: Jalankan dari hasil extract root GMT Procurement" >&2; exit 1
fi
node -e 'if (+process.versions.node.split(".")[0] < 22) process.exit(1)' || { echo "Node.js >=22 wajib. Pilih versi Node di cPanel." >&2; exit 1; }
test -n "${DATABASE_URL:-}" || test -f .env || { echo "DATABASE_URL/.env production tidak tersedia; jangan lanjut"; exit 1; }
echo "Installing exact locked dependency tree (will not run lifecycle scripts)..."
npm ci --ignore-scripts --no-audit --no-fund
echo "Generating Prisma client using existing production env setting; no database connection..."
npm run prisma:generate
echo "Building API and frontend..."
npm run build
echo "Checking required artifacts..."
node deploy/cpanel/preflight.cjs
echo "Build completed. Restart Node.js manually in cPanel; DO NOT run prisma db push or seed."
