import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { aiClient, AI_SYSTEM_PROMPTS, type ChatMessage } from '@/lib/ai-config'

// Type for the extracted data from the AI
interface ExtractedData {
  characters: Array<{
    name: string
    role: string
    gender: string
    appearance: string
    personality: string
  }>
  scenes: Array<{
    location: string
    timeOfDay: string
    description: string
    prompt: string
  }>
}

// POST /api/ai/extract - AI Extract Characters & Scenes
export async function POST(request: NextRequest) {
  try {
    const { episodeId, dramaId } = await request.json()

    if (!episodeId || !dramaId) {
      return NextResponse.json(
        { error: 'episodeId and dramaId are required' },
        { status: 400 }
      )
    }

    // Get episode
    const episode = await db.episode.findUnique({
      where: { id: episodeId },
    })

    if (!episode) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 })
    }

    if (!episode.scriptContent) {
      return NextResponse.json(
        { error: 'Episode has no script content. Run script rewrite first.' },
        { status: 400 }
      )
    }

    // Update extract status to processing
    await db.episode.update({
      where: { id: episodeId },
      data: { extractStatus: 'processing' },
    })

    try {
      // Call AI to extract characters and scenes using chatJson
      const messages: ChatMessage[] = [
        { role: 'system', content: AI_SYSTEM_PROMPTS.EXTRACT },
        { role: 'user', content: episode.scriptContent },
      ]

      const extracted = await aiClient.chatJson<ExtractedData>(messages, {
        maxRetries: 2,
        temperature: 0.3,
      })

      const { characters = [], scenes = [] } = extracted

      // Save characters to database
      const savedCharacters = []
      for (const char of characters) {
        const saved = await db.character.create({
          data: {
            dramaId,
            name: char.name || 'Unknown',
            role: char.role || 'supporting',
            gender: char.gender || 'unknown',
            appearance: char.appearance || '',
            personality: char.personality || '',
          },
        })
        savedCharacters.push(saved)
      }

      // Save scenes to database
      const savedScenes = []
      for (const scene of scenes) {
        const saved = await db.scene.create({
          data: {
            dramaId,
            location: scene.location || 'Unknown',
            timeOfDay: scene.timeOfDay || 'day',
            description: scene.description || '',
            prompt: scene.prompt || '',
          },
        })
        savedScenes.push(saved)
      }

      // Update extract status
      await db.episode.update({
        where: { id: episodeId },
        data: { extractStatus: 'completed' },
      })

      return NextResponse.json({
        characters: savedCharacters,
        scenes: savedScenes,
      })
    } catch (aiError) {
      // Update status to failed
      await db.episode.update({
        where: { id: episodeId },
        data: { extractStatus: 'failed' },
      })
      throw aiError
    }
  } catch (error) {
    console.error('Failed to extract characters and scenes:', error)
    return NextResponse.json(
      { error: 'Failed to extract characters and scenes' },
      { status: 500 }
    )
  }
}
