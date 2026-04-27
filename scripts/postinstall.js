// ============================================================
// Postinstall script: prepares for build
// On Vercel (has PostgreSQL env vars): switches schema to PostgreSQL
// Locally (no PostgreSQL): keeps SQLite
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
      // Replace sqlite with postgresql and add directUrl
      schema = schema.replace('provider = "sqlite"', 'provider = "postgresql"')
      // Add directUrl if not present
      if (!schema.includes('directUrl')) {
        schema = schema.replace(
          /url\s*=\s*env\("DATABASE_URL"\)\s*\n(\s*)relationMode/,
          'url               = env("DATABASE_URL")\n$1directUrl         = env("DIRECT_URL")\n$1relationMode'
        )
      }
      fs.writeFileSync(schemaPath, schema)
      console.log('[postinstall] Switched schema from SQLite to PostgreSQL')
    } else {
      console.log('[postinstall] Schema already uses PostgreSQL')
    }
  } catch (err) {
    console.warn('[postinstall] Could not switch schema:', err.message)
  }

  // Resolve PostgreSQL URL for prisma generate
  const runtimeUrl =
    process.env.huobao_POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.huobao_POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.huobao_POSTGRES_URL ||
    process.env.POSTGRES_URL

  const directUrl =
    process.env.huobao_POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL_NON_POOLING ||
    runtimeUrl

  process.env.DATABASE_URL = runtimeUrl
  process.env.DIRECT_URL = directUrl
  console.log('[postinstall] PostgreSQL URLs configured for Prisma')
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
