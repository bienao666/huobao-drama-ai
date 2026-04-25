import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/migrate - Run database migration
// Default: SAFE mode (CREATE IF NOT EXISTS, never drops data)
// ?force=true: DESTRUCTIVE mode (drops and recreates all tables - use for fixing broken state)
export async function POST(request: NextRequest) {
  const url = new URL(request.url)
  const force = url.searchParams.get('force') === 'true'
  const results: Record<string, string> = {}

  try {
    if (force) {
      console.log('[migrate] FORCE mode: dropping and recreating all tables...')
      return await forceMigrate(results)
    } else {
      console.log('[migrate] SAFE mode: creating tables if not exist...')
      return await safeMigrate(results)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[migrate] Failed:', message)
    return NextResponse.json(
      { status: 'error', message, results },
      { status: 500 }
    )
  }
}

async function safeMigrate(results: Record<string, string>): Promise<NextResponse> {
  // Create tables if they don't exist (NEVER drops)
  const tables = [
    {
      name: 'Drama',
      sql: `CREATE TABLE IF NOT EXISTS "Drama" (
        "id" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT NOT NULL DEFAULT '',
        "genre" TEXT NOT NULL DEFAULT '都市',
        "style" TEXT NOT NULL DEFAULT 'realistic',
        "coverImage" TEXT,
        "totalEpisodes" INTEGER NOT NULL DEFAULT 0,
        "status" TEXT NOT NULL DEFAULT 'draft',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Drama_pkey" PRIMARY KEY ("id")
      )`
    },
    {
      name: 'Episode',
      sql: `CREATE TABLE IF NOT EXISTS "Episode" (
        "id" TEXT NOT NULL,
        "dramaId" TEXT NOT NULL,
        "episodeNumber" INTEGER NOT NULL,
        "title" TEXT NOT NULL DEFAULT '',
        "rawContent" TEXT,
        "scriptContent" TEXT,
        "scriptStatus" TEXT NOT NULL DEFAULT 'pending',
        "extractStatus" TEXT NOT NULL DEFAULT 'pending',
        "storyboardStatus" TEXT NOT NULL DEFAULT 'pending',
        "status" TEXT NOT NULL DEFAULT 'draft',
        "videoUrl" TEXT,
        "duration" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Episode_pkey" PRIMARY KEY ("id")
      )`
    },
    {
      name: 'Character',
      sql: `CREATE TABLE IF NOT EXISTS "Character" (
        "id" TEXT NOT NULL,
        "dramaId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "role" TEXT NOT NULL DEFAULT 'supporting',
        "gender" TEXT NOT NULL DEFAULT 'unknown',
        "age" TEXT NOT NULL DEFAULT '',
        "appearance" TEXT NOT NULL DEFAULT '',
        "personality" TEXT NOT NULL DEFAULT '',
        "voiceStyle" TEXT NOT NULL DEFAULT '',
        "voiceId" TEXT,
        "imageUrl" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
      )`
    },
    {
      name: 'Scene',
      sql: `CREATE TABLE IF NOT EXISTS "Scene" (
        "id" TEXT NOT NULL,
        "dramaId" TEXT NOT NULL,
        "location" TEXT NOT NULL,
        "timeOfDay" TEXT NOT NULL DEFAULT 'day',
        "description" TEXT NOT NULL DEFAULT '',
        "prompt" TEXT NOT NULL DEFAULT '',
        "imageUrl" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Scene_pkey" PRIMARY KEY ("id")
      )`
    },
    {
      name: 'Storyboard',
      sql: `CREATE TABLE IF NOT EXISTS "Storyboard" (
        "id" TEXT NOT NULL,
        "episodeId" TEXT NOT NULL,
        "shotNumber" INTEGER NOT NULL,
        "title" TEXT NOT NULL DEFAULT '',
        "shotType" TEXT NOT NULL DEFAULT 'medium',
        "cameraAngle" TEXT NOT NULL DEFAULT 'eye-level',
        "cameraMovement" TEXT NOT NULL DEFAULT 'static',
        "action" TEXT NOT NULL DEFAULT '',
        "dialogue" TEXT,
        "dialogueChar" TEXT,
        "duration" DOUBLE PRECISION NOT NULL DEFAULT 3.0,
        "imagePrompt" TEXT,
        "videoPrompt" TEXT,
        "atmosphere" TEXT,
        "firstFrameUrl" TEXT,
        "videoUrl" TEXT,
        "ttsAudioUrl" TEXT,
        "composedUrl" TEXT,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Storyboard_pkey" PRIMARY KEY ("id")
      )`
    },
    {
      name: 'AiProvider',
      sql: `CREATE TABLE IF NOT EXISTS "AiProvider" (
        "id" TEXT NOT NULL,
        "category" TEXT NOT NULL,
        "provider" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "apiKey" TEXT NOT NULL DEFAULT '',
        "baseUrl" TEXT NOT NULL DEFAULT '',
        "model" TEXT NOT NULL DEFAULT '',
        "isActive" BOOLEAN NOT NULL DEFAULT false,
        "sort" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "AiProvider_pkey" PRIMARY KEY ("id")
      )`
    }
  ]

  for (const table of tables) {
    try {
      await db.$executeRawUnsafe(table.sql)
      results[table.name] = 'ok'
    } catch (err) {
      results[table.name] = `error: ${err instanceof Error ? err.message : String(err)}`
    }
  }

  // Add missing columns for tables that might exist but be incomplete
  const columnAdditions = [
    { table: 'Character', column: 'dramaId', def: 'TEXT NOT NULL DEFAULT \'\'' },
    { table: 'Scene', column: 'dramaId', def: 'TEXT NOT NULL DEFAULT \'\'' },
    { table: 'Storyboard', column: 'episodeId', def: 'TEXT NOT NULL DEFAULT \'\'' },
    { table: 'Episode', column: 'dramaId', def: 'TEXT NOT NULL DEFAULT \'\'' },
  ]

  for (const col of columnAdditions) {
    try {
      await db.$executeRawUnsafe(`ALTER TABLE "${col.table}" ADD COLUMN IF NOT EXISTS "${col.column}" ${col.def}`)
    } catch {
      // Ignore - column might already exist
    }
  }
  results.missingColumns = 'checked'

  // Create unique indexes (safe - IF NOT EXISTS)
  try {
    await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Episode_dramaId_episodeNumber_key" ON "Episode"("dramaId", "episodeNumber")`)
    await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "AiProvider_category_provider_key" ON "AiProvider"("category", "provider")`)
    results.indexes = 'ok'
  } catch (err) {
    results.indexes = `warning: ${err instanceof Error ? err.message : String(err)}`
  }

  // Add foreign key constraints (safe - check if they exist first)
  try {
    await db.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Episode_dramaId_fkey') THEN
          ALTER TABLE "Episode" ADD CONSTRAINT "Episode_dramaId_fkey" FOREIGN KEY ("dramaId") REFERENCES "Drama"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Character_dramaId_fkey') THEN
          ALTER TABLE "Character" ADD CONSTRAINT "Character_dramaId_fkey" FOREIGN KEY ("dramaId") REFERENCES "Drama"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Scene_dramaId_fkey') THEN
          ALTER TABLE "Scene" ADD CONSTRAINT "Scene_dramaId_fkey" FOREIGN KEY ("dramaId") REFERENCES "Drama"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Storyboard_episodeId_fkey') THEN
          ALTER TABLE "Storyboard" ADD CONSTRAINT "Storyboard_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$
    `)
    results.foreignKeys = 'ok'
  } catch (err) {
    results.foreignKeys = `warning: ${err instanceof Error ? err.message : String(err)}`
  }

  console.log('[migrate] Safe migration completed')
  return NextResponse.json({
    status: 'ok',
    message: 'Safe migration completed (no data dropped)',
    results,
  })
}

async function forceMigrate(results: Record<string, string>): Promise<NextResponse> {
  // Step 1: Drop all tables in reverse dependency order
  const dropStatements = [
    'DROP TABLE IF EXISTS "Storyboard" CASCADE',
    'DROP TABLE IF EXISTS "Scene" CASCADE',
    'DROP TABLE IF EXISTS "Character" CASCADE',
    'DROP TABLE IF EXISTS "Episode" CASCADE',
    'DROP TABLE IF EXISTS "AiProvider" CASCADE',
    'DROP TABLE IF EXISTS "Drama" CASCADE',
  ]

  for (const stmt of dropStatements) {
    try {
      await db.$executeRawUnsafe(stmt)
    } catch {
      // Ignore errors - table might not exist
    }
  }
  results.dropTables = 'ok'

  // Step 2: Create all tables from scratch
  await db.$executeRawUnsafe(`
    CREATE TABLE "Drama" (
      "id" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "description" TEXT NOT NULL DEFAULT '',
      "genre" TEXT NOT NULL DEFAULT '都市',
      "style" TEXT NOT NULL DEFAULT 'realistic',
      "coverImage" TEXT,
      "totalEpisodes" INTEGER NOT NULL DEFAULT 0,
      "status" TEXT NOT NULL DEFAULT 'draft',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Drama_pkey" PRIMARY KEY ("id")
    )
  `)
  results.drama = 'created'

  await db.$executeRawUnsafe(`
    CREATE TABLE "Episode" (
      "id" TEXT NOT NULL,
      "dramaId" TEXT NOT NULL,
      "episodeNumber" INTEGER NOT NULL,
      "title" TEXT NOT NULL DEFAULT '',
      "rawContent" TEXT,
      "scriptContent" TEXT,
      "scriptStatus" TEXT NOT NULL DEFAULT 'pending',
      "extractStatus" TEXT NOT NULL DEFAULT 'pending',
      "storyboardStatus" TEXT NOT NULL DEFAULT 'pending',
      "status" TEXT NOT NULL DEFAULT 'draft',
      "videoUrl" TEXT,
      "duration" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Episode_pkey" PRIMARY KEY ("id")
    )
  `)
  results.episode = 'created'

  await db.$executeRawUnsafe(`
    CREATE TABLE "Character" (
      "id" TEXT NOT NULL,
      "dramaId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "role" TEXT NOT NULL DEFAULT 'supporting',
      "gender" TEXT NOT NULL DEFAULT 'unknown',
      "age" TEXT NOT NULL DEFAULT '',
      "appearance" TEXT NOT NULL DEFAULT '',
      "personality" TEXT NOT NULL DEFAULT '',
      "voiceStyle" TEXT NOT NULL DEFAULT '',
      "voiceId" TEXT,
      "imageUrl" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
    )
  `)
  results.character = 'created'

  await db.$executeRawUnsafe(`
    CREATE TABLE "Scene" (
      "id" TEXT NOT NULL,
      "dramaId" TEXT NOT NULL,
      "location" TEXT NOT NULL,
      "timeOfDay" TEXT NOT NULL DEFAULT 'day',
      "description" TEXT NOT NULL DEFAULT '',
      "prompt" TEXT NOT NULL DEFAULT '',
      "imageUrl" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Scene_pkey" PRIMARY KEY ("id")
    )
  `)
  results.scene = 'created'

  await db.$executeRawUnsafe(`
    CREATE TABLE "Storyboard" (
      "id" TEXT NOT NULL,
      "episodeId" TEXT NOT NULL,
      "shotNumber" INTEGER NOT NULL,
      "title" TEXT NOT NULL DEFAULT '',
      "shotType" TEXT NOT NULL DEFAULT 'medium',
      "cameraAngle" TEXT NOT NULL DEFAULT 'eye-level',
      "cameraMovement" TEXT NOT NULL DEFAULT 'static',
      "action" TEXT NOT NULL DEFAULT '',
      "dialogue" TEXT,
      "dialogueChar" TEXT,
      "duration" DOUBLE PRECISION NOT NULL DEFAULT 3.0,
      "imagePrompt" TEXT,
      "videoPrompt" TEXT,
      "atmosphere" TEXT,
      "firstFrameUrl" TEXT,
      "videoUrl" TEXT,
      "ttsAudioUrl" TEXT,
      "composedUrl" TEXT,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Storyboard_pkey" PRIMARY KEY ("id")
    )
  `)
  results.storyboard = 'created'

  await db.$executeRawUnsafe(`
    CREATE TABLE "AiProvider" (
      "id" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "provider" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "apiKey" TEXT NOT NULL DEFAULT '',
      "baseUrl" TEXT NOT NULL DEFAULT '',
      "model" TEXT NOT NULL DEFAULT '',
      "isActive" BOOLEAN NOT NULL DEFAULT false,
      "sort" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AiProvider_pkey" PRIMARY KEY ("id")
    )
  `)
  results.aiProvider = 'created'

  // Create unique indexes
  await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Episode_dramaId_episodeNumber_key" ON "Episode"("dramaId", "episodeNumber")`)
  await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "AiProvider_category_provider_key" ON "AiProvider"("category", "provider")`)
  results.indexes = 'created'

  // Create foreign key constraints
  await db.$executeRawUnsafe(`ALTER TABLE "Episode" ADD CONSTRAINT "Episode_dramaId_fkey" FOREIGN KEY ("dramaId") REFERENCES "Drama"("id") ON DELETE CASCADE ON UPDATE CASCADE`)
  await db.$executeRawUnsafe(`ALTER TABLE "Character" ADD CONSTRAINT "Character_dramaId_fkey" FOREIGN KEY ("dramaId") REFERENCES "Drama"("id") ON DELETE CASCADE ON UPDATE CASCADE`)
  await db.$executeRawUnsafe(`ALTER TABLE "Scene" ADD CONSTRAINT "Scene_dramaId_fkey" FOREIGN KEY ("dramaId") REFERENCES "Drama"("id") ON DELETE CASCADE ON UPDATE CASCADE`)
  await db.$executeRawUnsafe(`ALTER TABLE "Storyboard" ADD CONSTRAINT "Storyboard_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE`)
  results.foreignKeys = 'created'

  console.log('[migrate] Force migration completed')
  return NextResponse.json({
    status: 'ok',
    message: 'Force migration completed (all tables recreated)',
    results,
  })
}

// GET /api/migrate - Check migration status
export async function GET() {
  try {
    const tables = await db.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `

    const tableNames = tables.map((t) => t.table_name)
    const requiredTables = ['Drama', 'Episode', 'Character', 'Scene', 'Storyboard', 'AiProvider']
    const existing = requiredTables.filter((t) => tableNames.includes(t))
    const missing = requiredTables.filter((t) => !tableNames.includes(t))

    // Check key columns in Character table
    let characterColumns: string[] = []
    try {
      const cols = await db.$queryRaw<Array<{ column_name: string }>>`
        SELECT column_name FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'Character'
      `
      characterColumns = cols.map((c) => c.column_name)
    } catch {
      // Table might not exist
    }

    return NextResponse.json({
      status: missing.length === 0 ? 'ok' : 'needs_migration',
      message: missing.length === 0 ? 'All tables exist' : `Missing tables: ${missing.join(', ')}`,
      existing,
      missing,
      characterColumns,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { status: 'error', message },
      { status: 500 }
    )
  }
}
