import { NextRequest, NextResponse } from 'next/server'
import { getAiConfig, NVIDIA_CHAT_MODELS, NVIDIA_IMAGE_MODELS } from '@/lib/ai-config'
import { writeFile, readFile, mkdir } from 'fs/promises'
import path from 'path'

// Path to the settings file (stored in project root for local dev)
const SETTINGS_FILE = path.join(process.cwd(), 'ai-settings.json')

interface AiSettings {
  chatModel: string
  imageModel: string
  imageProvider: 'nvidia' | 'z-ai-sdk'
  ttsVoice: string
  videoQuality: 'speed' | 'quality'
  videoDuration: number
  videoFps: number
  videoSize: string
}

const DEFAULT_SETTINGS: AiSettings = {
  chatModel: NVIDIA_CHAT_MODELS.LLAMA_70B,
  imageModel: NVIDIA_IMAGE_MODELS.SDXL,
  imageProvider: 'nvidia',
  ttsVoice: 'tongtong',
  videoQuality: 'speed',
  videoDuration: 5,
  videoFps: 30,
  videoSize: '1344x768',
}

async function readSettings(): Promise<AiSettings> {
  try {
    const data = await readFile(SETTINGS_FILE, 'utf-8')
    return { ...DEFAULT_SETTINGS, ...JSON.parse(data) } as AiSettings
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

async function writeSettings(settings: Partial<AiSettings>): Promise<AiSettings> {
  const current = await readSettings()
  const updated = { ...current, ...settings }

  // Ensure directory exists
  const dir = path.dirname(SETTINGS_FILE)
  await mkdir(dir, { recursive: true })

  await writeFile(SETTINGS_FILE, JSON.stringify(updated, null, 2), 'utf-8')
  return updated
}

// GET /api/settings - Return current settings
export async function GET() {
  try {
    const config = getAiConfig()
    const settings = await readSettings()

    return NextResponse.json({
      settings,
      apiStatus: {
        nvidiaAvailable: config.nvidiaAvailable,
        imageProvider: config.imageProvider,
        defaultChatModel: config.defaultChatModel,
        defaultImageModel: config.defaultImageModel,
      },
    })
  } catch (error) {
    console.error('Failed to read settings:', error)
    return NextResponse.json(
      { error: 'Failed to read settings' },
      { status: 500 }
    )
  }
}

// POST /api/settings - Save settings
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const updated = await writeSettings(data)

    return NextResponse.json({ settings: updated })
  } catch (error) {
    console.error('Failed to save settings:', error)
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    )
  }
}
