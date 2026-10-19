import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * CloudLinux/cPanel can mis-detect the OpenSSL target used by Prisma.
 * Prefer the OpenSSL 1.1 query engine when it is present.
 */
export function configurePrismaEngineForCpanel(): void {
  if (process.env.PRISMA_QUERY_ENGINE_LIBRARY) return;

  const engineName = 'libquery_engine-debian-openssl-1.1.x.so.node';
  const candidates: string[] = [];

  try {
    // @prisma/client may live inside the cPanel Node virtualenv.
    const clientPkg = require.resolve('@prisma/client/package.json');
    const nodeModules = path.resolve(path.dirname(clientPkg), '..', '..');
    candidates.push(path.join(nodeModules, '.prisma', 'client', engineName));
  } catch {
    // Continue with cwd-based fallbacks.
  }

  candidates.push(
    path.resolve(process.cwd(), 'node_modules', '.prisma', 'client', engineName),
    path.resolve(process.cwd(), '..', '..', 'node_modules', '.prisma', 'client', engineName),
  );

  const enginePath = candidates.find((candidate) => fs.existsSync(candidate));
  if (enginePath) {
    process.env.PRISMA_QUERY_ENGINE_LIBRARY = enginePath;
  }
}
