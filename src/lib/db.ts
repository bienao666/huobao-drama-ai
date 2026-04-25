import { PrismaClient } from '@prisma/client'

// ============================================================
// Database client initialization
// Handles both local SQLite and Vercel PostgreSQL
// ============================================================

// On Vercel, DATABASE_URL is NOT automatically set as an env var.
// Instead, the Neon/Postgres integration provides prefixed env vars
// like huobao_POSTGRES_PRISMA_URL. We need to set DATABASE_URL
// BEFORE PrismaClient is initialized so that env("DATABASE_URL")
// in schema.prisma resolves correctly.
function resolveDatabaseUrl(): string {
  // 1. If DATABASE_URL is explicitly set, use it
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL
  }

  // 2. Check Vercel Postgres env vars (both standard and prefixed)
  const vercelPostgresUrl =
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.huobao_POSTGRES_PRISMA_URL ||
    process.env.huobao_POSTGRES_URL_NON_POOLING ||
    process.env.huobao_POSTGRES_URL

  if (vercelPostgresUrl) {
    // CRITICAL: Set DATABASE_URL in process.env so that Prisma's
    // schema.prisma `url = env("DATABASE_URL")` resolves correctly.
    // Without this, Prisma falls back to a dummy URL.
    process.env.DATABASE_URL = vercelPostgresUrl
    return vercelPostgresUrl
  }

  // 3. Fallback for local development (SQLite)
  return 'file:./db/custom.db'
}

// Resolve and set DATABASE_URL before PrismaClient initialization
const databaseUrl = resolveDatabaseUrl()
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = databaseUrl
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
