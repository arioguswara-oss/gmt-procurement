function requireValue(env: Record<string, unknown>, key: string): string {
  const value = String(env[key] ?? '').trim();
  if (!value) throw new Error(`Environment variable ${key} wajib diisi`);
  return value;
}

function positiveNumber(env: Record<string, unknown>, key: string, fallback: number): number {
  const raw = String(env[key] ?? fallback);
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Environment variable ${key} harus berupa angka > 0`);
  }
  return value;
}

function boolValue(value: unknown, fallback = false): boolean {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

export function validateEnvironment(env: Record<string, unknown>) {
  const nodeEnv = String(env.NODE_ENV ?? 'development').trim();
  const databaseUrl = requireValue(env, 'DATABASE_URL');
  const jwtSecret = requireValue(env, 'JWT_SECRET');

  if (!databaseUrl.startsWith('mysql://')) {
    throw new Error('DATABASE_URL harus menggunakan skema mysql:// untuk MariaDB/Prisma');
  }

  if (nodeEnv !== 'development' && jwtSecret.length < 32) {
    throw new Error('JWT_SECRET untuk staging/production minimal 32 karakter');
  }

  positiveNumber(env, 'PORT', 3001);
  positiveNumber(env, 'MAX_UPLOAD_MB', 25);
  positiveNumber(env, 'PDF_TIMEOUT_MS', 30000);

  if (nodeEnv !== 'development') {
    requireValue(env, 'WEB_ORIGIN');
  }

  const pdfServerEnabled = boolValue(env.PDF_SERVER_ENABLED, nodeEnv === 'development');
  if (pdfServerEnabled) {
    requireValue(env, 'PDF_CHROMIUM_EXECUTABLE');
  }

  env.PDF_SERVER_ENABLED = pdfServerEnabled ? 'true' : 'false';
  return env;
}
