// ============================================================
// Postinstall script: generates Prisma client
// On Vercel: uses huobao_POSTGRES_* env vars to switch to PostgreSQL
// Locally: uses SQLite (default)
// ============================================================

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

function isPostgresUrl(url) {
  return url && (url.startsWith('postgresql://') || url.startsWith('postgres://'))
}

// Check if we have PostgreSQL env vars (Vercel deployment)
const hasPostgres = !!(
  process.env.huobao_POSTGRES_URL ||
  process.env.huobao_POSTGRES_PRISMA_URL ||
  process.env.huobao_POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING
)

if (hasPostgres) {
  // Switch schema to PostgreSQL on Vercel
  const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma')
  try {
    let schema = fs.readFileSync(schemaPath, 'utf8')
    if (schema.includes('provider = "sqlite"')) {
      schema = schema.replace('provider = "sqlite"', 'provider = "postgresql"')
      if (!schema.includes('directUrl')) {
        schema = schema.replace(
          /url\s*=\s*env\("DATABASE_URL"\)\s*\n\s*relationMode/,
          'url               = env("DATABASE_URL")\n  directUrl         = env("DIRECT_URL")\n  relationMode'
        )
      }
      fs.writeFileSync(schemaPath, schema)
      console.log('[postinstall] Switched schema from SQLite to PostgreSQL')
    }
  } catch (err) {
    console.warn('[postinstall] Could not switch schema:', err.message)
  }

  // Resolve PostgreSQL URL
  const runtimeUrl =
    process.env.huobao_POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.huobao_POSTGRES_URL ||
    process.env.POSTGRES_URL ||
    process.env.huobao_POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL_NON_POOLING

  process.env.DATABASE_URL = runtimeUrl
  process.env.DIRECT_URL = process.env.huobao_POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL_NON_POOLING || runtimeUrl
}

// Generate Prisma client - with timeout to prevent hanging
try {
  console.log('[postinstall] Generating Prisma client...')
  execSync('npx prisma generate', {
    stdio: 'inherit',
    env: { ...process.env },
    timeout: 120000
  })
  console.log('[postinstall] Prisma client generated successfully')
} catch (error) {
  console.warn('[postinstall] Prisma generate warning:', error.message)
  // Don't fail - the build.js script will also try
}
