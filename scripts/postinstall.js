// Postinstall script: detects if we're on Vercel with PostgreSQL
// and sets up the correct Prisma schema accordingly.

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma')
const productionSchemaPath = path.join(__dirname, '..', 'prisma', 'schema.production.prisma')

// Check if we have PostgreSQL env vars (Vercel Postgres)
function getPostgresUrl() {
  return (
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.huobao_POSTGRES_PRISMA_URL ||
    process.env.huobao_POSTGRES_URL_NON_POOLING ||
    process.env.huobao_POSTGRES_URL ||
    null
  )
}

const hasPostgres = !!getPostgresUrl()

if (hasPostgres) {
  console.log('[postinstall] PostgreSQL detected, using production schema...')
  
  // Set DATABASE_URL from Vercel Postgres env vars
  const pgUrl = getPostgresUrl()
  process.env.DATABASE_URL = pgUrl
  console.log('[postinstall] Set DATABASE_URL from Vercel Postgres')
  
  // Copy production schema (PostgreSQL) over the default schema
  if (fs.existsSync(productionSchemaPath)) {
    fs.copyFileSync(productionSchemaPath, schemaPath)
    console.log('[postinstall] Copied PostgreSQL schema to schema.prisma')
  }
}

// Generate Prisma client
try {
  console.log('[postinstall] Generating Prisma client...')
  execSync('npx prisma generate', { 
    stdio: 'inherit',
    env: { ...process.env }
  })
  console.log('[postinstall] Prisma client generated successfully')
} catch (error) {
  console.error('[postinstall] Prisma generate failed:', error.message)
  process.exit(1)
}

// Push schema to database on Vercel
if (hasPostgres && process.env.DATABASE_URL) {
  try {
    console.log('[postinstall] Pushing schema to PostgreSQL...')
    execSync('npx prisma db push --accept-data-loss', { 
      stdio: 'inherit',
      env: { ...process.env }
    })
    console.log('[postinstall] Schema pushed to PostgreSQL successfully')
  } catch (error) {
    console.warn('[postinstall] Prisma db push failed (may need manual migration):', error.message)
  }
}
