// ============================================================
// Build script: prepares Prisma schema and generates client
// This runs as part of the "build" npm script on Vercel.
// Handles both local SQLite and Vercel PostgreSQL.
// ============================================================

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// Resolve the best PostgreSQL URL for Prisma (with huobao_ prefix priority)
const huobaoNonPooling = process.env.huobao_POSTGRES_URL_NON_POOLING
const huobaoPrisma = process.env.huobao_POSTGRES_PRISMA_URL
const huobaoGeneric = process.env.huobao_POSTGRES_URL
const nonPoolingUrl = process.env.POSTGRES_URL_NON_POOLING
const prismaUrl = process.env.POSTGRES_PRISMA_URL
const genericUrl = process.env.POSTGRES_URL

// DATABASE_URL: used by Prisma Client at runtime (pooled connection for serverless)
// DIRECT_URL: used by Prisma for migrations (direct connection)
const runtimeUrl = huobaoPrisma || prismaUrl || huobaoGeneric || genericUrl || huobaoNonPooling || nonPoolingUrl || process.env.DATABASE_URL
const migrationUrl = huobaoNonPooling || nonPoolingUrl || huobaoGeneric || genericUrl || process.env.DIRECT_URL || process.env.DATABASE_URL

const hasPostgres = !!(runtimeUrl && isPostgresUrl(runtimeUrl))

function isPostgresUrl(url) {
  return url && (url.startsWith('postgresql://') || url.startsWith('postgres://'))
}

if (hasPostgres) {
  // PostgreSQL mode (Vercel production)
  console.log('[build] PostgreSQL detected - generating client for PostgreSQL')
  process.env.DATABASE_URL = runtimeUrl
  process.env.DIRECT_URL = migrationUrl

  // Ensure schema uses postgresql provider
  const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma')
  let schema = fs.readFileSync(schemaPath, 'utf8')
  if (schema.includes('provider = "sqlite"')) {
    schema = schema.replace('provider = "sqlite"', 'provider = "postgresql"')
    if (!schema.includes('directUrl')) {
      schema = schema.replace(
        /url\s*=\s*env\("DATABASE_URL"\)/,
        'url               = env("DATABASE_URL")\n  directUrl         = env("DIRECT_URL")'
      )
    }
    fs.writeFileSync(schemaPath, schema)
    console.log('[build] Switched schema from SQLite to PostgreSQL')
  }
} else {
  console.log('[build] No PostgreSQL URL found - using SQLite for local development')
  // For local SQLite, we keep the schema as-is if it's already postgresql
  // Prisma generate works with any provider as long as the schema is valid
}

// Generate Prisma client
try {
  console.log('[build] Generating Prisma client...')
  const generateEnv = hasPostgres
    ? { ...process.env, DATABASE_URL: runtimeUrl, DIRECT_URL: migrationUrl }
    : { ...process.env }
  execSync('npx prisma generate', {
    stdio: 'inherit',
    env: generateEnv,
    timeout: 120000
  })
  console.log('[build] Prisma client generated successfully')
} catch (error) {
  console.warn('[build] Prisma generate warning:', error.message?.slice(0, 300))
}

// Try to push schema to PostgreSQL using direct URL
if (hasPostgres) {
  try {
    console.log('[build] Attempting prisma db push (30s timeout)...')
    execSync('npx prisma db push --accept-data-loss --skip-generate', {
      stdio: 'pipe',
      env: { ...process.env, DATABASE_URL: migrationUrl, DIRECT_URL: migrationUrl },
      timeout: 30000
    })
    console.log('[build] Schema pushed to PostgreSQL successfully')
  } catch (error) {
    console.warn('[build] Prisma db push failed (non-critical, run /api/migrate manually)')
  }
}

console.log('[build] Prisma setup complete, starting Next.js build...')
