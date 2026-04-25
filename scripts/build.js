// Build script: prepares the correct Prisma schema before Next.js build

const fs = require('fs')
const path = require('path')

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma')
const productionSchemaPath = path.join(__dirname, '..', 'prisma', 'schema.production.prisma')

// Check if we have PostgreSQL env vars (Vercel Postgres)
const hasPostgres =
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.huobao_POSTGRES_URL ||
  process.env.huobao_POSTGRES_PRISMA_URL

if (hasPostgres) {
  console.log('[build] PostgreSQL detected, using production schema...')
  
  // Set DATABASE_URL from Vercel Postgres env vars if not already set
  if (!process.env.DATABASE_URL) {
    const pgUrl = 
      process.env.POSTGRES_PRISMA_URL ||
      process.env.POSTGRES_URL_NON_POOLING ||
      process.env.POSTGRES_URL ||
      process.env.huobao_POSTGRES_PRISMA_URL ||
      process.env.huobao_POSTGRES_URL_NON_POOLING ||
      process.env.huobao_POSTGRES_URL
    
    if (pgUrl) {
      process.env.DATABASE_URL = pgUrl
      console.log('[build] Set DATABASE_URL from Vercel Postgres')
    }
  }
  
  // Copy production schema (PostgreSQL) over the default schema
  if (fs.existsSync(productionSchemaPath)) {
    fs.copyFileSync(productionSchemaPath, schemaPath)
    console.log('[build] Copied PostgreSQL schema to schema.prisma')
  }
  
  // Generate Prisma client with the correct schema
  const { execSync } = require('child_process')
  try {
    console.log('[build] Generating Prisma client...')
    execSync('npx prisma generate', { stdio: 'inherit' })
    
    console.log('[build] Pushing schema to PostgreSQL...')
    execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' })
  } catch (error) {
    console.warn('[build] Prisma setup warning:', error.message)
  }
} else {
  console.log('[build] No PostgreSQL detected, using default SQLite schema')
}

console.log('[build] Prisma setup complete, starting Next.js build...')
