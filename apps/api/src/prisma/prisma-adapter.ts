import { PrismaMariaDb } from '@prisma/adapter-mariadb';

function decode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function createMariaDbAdapter(): PrismaMariaDb {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error('DATABASE_URL belum diisi.');

  const url = new URL(raw);
  const database = decode(url.pathname.replace(/^\//, ''));
  if (!database) throw new Error('Nama database tidak ditemukan pada DATABASE_URL.');

  return new PrismaMariaDb({
    host: url.hostname || '127.0.0.1',
    port: url.port ? Number(url.port) : 3306,
    user: decode(url.username),
    password: decode(url.password),
    database,
    connectionLimit: 5,
    connectTimeout: 5000,
    acquireTimeout: 10000,
  });
}
