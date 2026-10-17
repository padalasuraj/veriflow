import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

export function connectDatabase(url = process.env.DATABASE_URL ?? 'file:./prisma/dev.db') {
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
}

export const db = connectDatabase();
export type Database = typeof db;
