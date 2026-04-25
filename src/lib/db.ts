import { PrismaClient } from '@prisma/client'

// ============================================================
// Database client initialization
// Handles both local SQLite and Vercel PostgreSQL
// ============================================================

function resolveDatabaseUrl(): string {
  // 1. Check Vercel Postgres non-pooling URL FIRST (best for Prisma)
  // Non-pooling URL is where prisma db push creates tables
  // and provides the most reliable Prisma Client experience
  const nonPoolingUrl =
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.huobao_POSTGRES_URL_NON_POOLING

  if (nonPoolingUrl) {
    console.log('[db] Using non-pooling PostgreSQL URL for best Prisma compatibility')
    process.env.DATABASE_URL = nonPoolingUrl
    return nonPoolingUrl
  }

  // 2. Check Prisma-specific pooled URLs (second best option)
  const prismaUrl =
    process.env.POSTGRES_PRISMA_URL ||
    process.env.huobao_POSTGRES_PRISMA_URL

  if (prismaUrl) {
    console.log('[db] Using Prisma-specific pooled URL')
    process.env.DATABASE_URL = prismaUrl
    return prismaUrl
  }

  // 3. If DATABASE_URL is explicitly set and non-empty, use it
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== '') {
    console.log('[db] Using DATABASE_URL from environment')
    return process.env.DATABASE_URL
  }

  // 4. Check generic Postgres URLs
  const genericUrl =
    process.env.POSTGRES_URL ||
    process.env.huobao_POSTGRES_URL

  if (genericUrl) {
    console.log('[db] Using generic Postgres URL from integration env vars')
    process.env.DATABASE_URL = genericUrl
    return genericUrl
  }

  // 5. Try to construct from individual Supabase/Neon components
  const host = process.env.huobao_POSTGRES_HOST || process.env.POSTGRES_HOST
  const user = process.env.huobao_POSTGRES_USER || process.env.POSTGRES_USER
  const password = process.env.huobao_POSTGRES_PASSWORD || process.env.POSTGRES_PASSWORD
  const database = process.env.huobao_POSTGRES_DATABASE || process.env.POSTGRES_DATABASE || 'postgres'

  if (host && user && password) {
    const constructedUrl = `postgresql://${user}:${password}@${host}:5432/${database}`
    console.log('[db] Constructed DATABASE_URL from individual components')
    process.env.DATABASE_URL = constructedUrl
    return constructedUrl
  }

  // 6. Fallback for local development (SQLite)
  console.log('[db] No PostgreSQL URL found, falling back to SQLite')
  return 'file:./db/custom.db'
}

// Resolve and set DATABASE_URL before PrismaClient initialization
const databaseUrl = resolveDatabaseUrl()
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.trim() === '') {
  process.env.DATABASE_URL = databaseUrl
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Log the database provider being used (mask the URL for security)
const maskedUrl = databaseUrl
  .replace(/\/\/[^:]+:[^@]+@/, '//***:***@')
  .replace(/\?[^#]+/, '?***')
console.log(`[db] Connecting to database: ${maskedUrl.slice(0, 100)}...`)

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// Test database connection on startup (non-blocking)
db.$connect()
  .then(() => console.log('[db] Database connection established successfully'))
  .catch((err) => console.error('[db] FAILED to connect to database:', err.message || err))
