// ============================================================
// Build script: prepares Prisma schema and generates client
// This runs as part of the "build" npm script on Vercel.
// Handles both local SQLite and Vercel PostgreSQL.
// ============================================================

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

function isPostgresUrl(url) {
  return url && (url.startsWith('postgresql://') || url.startsWith('postgres://'))
}

// Resolve the best PostgreSQL URL for Prisma (with huobao_ prefix priority)
const huobaoNonPooling = process.env.huobao_POSTGRES_URL_NON_POOLING
const huobaoPrisma = process.env.huobao_POSTGRES_PRISMA_URL
const huobaoGeneric = process.env.huobao_POSTGRES_URL
const nonPoolingUrl = process.env.POSTGRES_URL_NON_POOLING
const prismaUrl = process.env.POSTGRES_PRISMA_URL
const genericUrl = process.env.POSTGRES_URL

// DATABASE_URL: used by Prisma Client at runtime (pooled connection for serverless)
// DIRECT_URL: used by Prisma for migrations (direct connection)
const runtimeUrl = huobaoPrisma || prismaUrl || huobaoNonPooling || nonPoolingUrl || huobaoGeneric || genericUrl || process.env.DATABASE_URL
const migrationUrl = huobaoNonPooling || nonPoolingUrl || huobaoGeneric || genericUrl || process.env.DIRECT_URL || runtimeUrl

const hasPostgres = !!runtimeUrl && isPostgresUrl(runtimeUrl)

if (hasPostgres) {
  // PostgreSQL mode (Vercel production)
  console.log('[build] PostgreSQL detected - ensuring schema uses PostgreSQL provider')

  // Ensure schema uses postgresql provider (in case postinstall didn't run or didn't switch)
  const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma')
  try {
    let schema = fs.readFileSync(schemaPath, 'utf8')
    let modified = false

    if (schema.includes('provider = "sqlite"')) {
      schema = schema.replace('provider = "sqlite"', 'provider = "postgresql"')
      modified = true
    }

    if (!schema.includes('directUrl')) {
      schema = schema.replace(
        /url\s*=\s*env\("DATABASE_URL"\)\s*\n(\s*)relationMode/,
        'url               = env("DATABASE_URL")\n$1directUrl         = env("DIRECT_URL")\n$1relationMode'
      )
      modified = true
    }

    if (modified) {
      fs.writeFileSync(schemaPath, schema)
      console.log('[build] Switched schema to PostgreSQL with directUrl')
    } else {
      console.log('[build] Schema already configured for PostgreSQL')
    }
  } catch (err) {
    console.warn('[build] Could not modify schema:', err.message)
  }

  process.env.DATABASE_URL = runtimeUrl
  process.env.DIRECT_URL = migrationUrl
} else {
  console.log('[build] No PostgreSQL URL found - using SQLite for local development')
}

// Generate Prisma client (always regenerate to ensure correct provider)
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
