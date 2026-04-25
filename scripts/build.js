// ============================================================
// Build script: prepares the correct Prisma schema before Next.js build
// This runs as part of the "build" npm script on Vercel.
// ============================================================

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma')
const productionSchemaPath = path.join(__dirname, '..', 'prisma', 'schema.production.prisma')
const developmentSchemaPath = path.join(__dirname, '..', 'prisma', 'schema.development.prisma')

// Check if we have PostgreSQL env vars (Vercel Postgres)
function getPostgresUrl() {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.huobao_POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.huobao_POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.huobao_POSTGRES_URL ||
    null
  )
}

const hasPostgres = !!getPostgresUrl()

if (hasPostgres) {
  console.log('[build] PostgreSQL detected, using production schema...')

  // Resolve the best URL for Prisma (non-pooling is preferred for DDL and Prisma Client)
  const nonPoolingUrl =
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.huobao_POSTGRES_URL_NON_POOLING

  const prismaUrl =
    process.env.POSTGRES_PRISMA_URL ||
    process.env.huobao_POSTGRES_PRISMA_URL

  const genericUrl =
    process.env.POSTGRES_URL ||
    process.env.huobao_POSTGRES_URL

  // DATABASE_URL: used by Prisma Client at runtime (pooled connection for serverless)
  // DIRECT_URL: used by Prisma for migrations (direct connection)
  const databaseUrl = prismaUrl || genericUrl || nonPoolingUrl || process.env.DATABASE_URL
  const directUrl = nonPoolingUrl || genericUrl || process.env.DATABASE_URL

  process.env.DATABASE_URL = databaseUrl
  process.env.DIRECT_URL = directUrl

  console.log('[build] DATABASE_URL set to pooled Prisma URL')
  console.log('[build] DIRECT_URL set to non-pooling URL')

  // Backup the development schema if it doesn't exist
  if (!fs.existsSync(developmentSchemaPath) && fs.existsSync(schemaPath)) {
    const currentSchema = fs.readFileSync(schemaPath, 'utf8')
    if (currentSchema.includes('sqlite')) {
      fs.writeFileSync(developmentSchemaPath, currentSchema)
      console.log('[build] Backed up SQLite schema to schema.development.prisma')
    }
  }

  // Copy production schema (PostgreSQL) over the default schema
  if (fs.existsSync(productionSchemaPath)) {
    fs.copyFileSync(productionSchemaPath, schemaPath)
    console.log('[build] Copied PostgreSQL schema to schema.prisma')
  }

  // Generate Prisma client with the correct schema
  try {
    console.log('[build] Generating Prisma client...')
    execSync('npx prisma generate', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: databaseUrl, DIRECT_URL: directUrl },
      timeout: 120000
    })
    console.log('[build] Prisma client generated successfully')
  } catch (error) {
    console.warn('[build] Prisma generate warning:', error.message?.slice(0, 300))
  }

  // Try to push schema to PostgreSQL using direct URL
  // This is non-critical - runtime auto-migration will handle table creation
  try {
    console.log('[build] Attempting prisma db push (30s timeout)...')
    execSync('npx prisma db push --accept-data-loss --skip-generate', {
      stdio: 'pipe',
      env: { ...process.env, DATABASE_URL: directUrl, DIRECT_URL: directUrl },
      timeout: 30000
    })
    console.log('[build] Schema pushed to PostgreSQL successfully')
  } catch (error) {
    console.warn('[build] Prisma db push failed (non-critical, runtime migration will handle it)')
  }
} else {
  console.log('[build] No PostgreSQL detected, using default SQLite schema')

  // Restore development schema if we previously backed it up
  if (fs.existsSync(developmentSchemaPath)) {
    const currentSchema = fs.readFileSync(schemaPath, 'utf8')
    if (!currentSchema.includes('sqlite')) {
      fs.copyFileSync(developmentSchemaPath, schemaPath)
      console.log('[build] Restored SQLite schema from schema.development.prisma')
    }
  }

  // Generate Prisma client for SQLite
  try {
    execSync('npx prisma generate', {
      stdio: 'inherit',
      env: { ...process.env },
      timeout: 120000
    })
  } catch (error) {
    console.warn('[build] Prisma generate warning:', error.message)
  }
}

console.log('[build] Prisma setup complete, starting Next.js build...')
