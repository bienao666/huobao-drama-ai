import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { aiClient, AI_SYSTEM_PROMPTS, type ChatMessage } from '@/lib/ai-config'

// Type for storyboard shot from AI
interface StoryboardShot {
  shotNumber: number
  title: string
  shotType: string
  cameraAngle: string
  cameraMovement: string
  action: string
  dialogue?: string | null
  dialogueChar?: string | null
  duration: number
  imagePrompt?: string | null
  videoPrompt?: string | null
  atmosphere?: string | null
}

// POST /api/ai/generate-storyboard - AI Generate Storyboard
export async function POST(request: NextRequest) {
  try {
    const { episodeId } = await request.json()

    if (!episodeId) {
      return NextResponse.json(
        { error: 'episodeId is required' },
        { status: 400 }
      )
    }

    // Get episode with drama info
    const episode = await db.episode.findUnique({
      where: { id: episodeId },
      include: {
        drama: {
          include: {
            characters: true,
            scenes: true,
          },
        },
      },
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

    // Update storyboard status to processing
    await db.episode.update({
      where: { id: episodeId },
      data: { storyboardStatus: 'processing' },
    })

    try {
      // Build context from characters and scenes
      const charactersInfo = episode.drama.characters
        .map(
          (c) =>
            `${c.name}(${c.role}, ${c.gender}${c.appearance ? ', ' + c.appearance : ''})`
        )
        .join('\n')

      const scenesInfo = episode.drama.scenes
        .map(
          (s) =>
            `${s.location}(${s.timeOfDay}${s.description ? ', ' + s.description : ''})`
        )
        .join('\n')

      const userContent = `剧本内容：
${episode.scriptContent}

${charactersInfo ? `角色列表：\n${charactersInfo}\n` : ''}${scenesInfo ? `场景列表：\n${scenesInfo}` : ''}`

      // Call AI to generate storyboard using chatJson
      const messages: ChatMessage[] = [
        { role: 'system', content: AI_SYSTEM_PROMPTS.STORYBOARD },
        { role: 'user', content: userContent },
      ]

      const shots = await aiClient.chatJson<StoryboardShot[]>(messages, {
        maxRetries: 2,
        temperature: 0.5,
      })

      // Delete existing storyboards for this episode
      await db.storyboard.deleteMany({
        where: { episodeId },
      })

      // Save storyboard shots to database
      const savedStoryboards = []
      for (const shot of shots) {
        const saved = await db.storyboard.create({
          data: {
            episodeId,
            shotNumber: shot.shotNumber || savedStoryboards.length + 1,
            title: shot.title || '',
            shotType: shot.shotType || 'medium',
            cameraAngle: shot.cameraAngle || 'eye-level',
            cameraMovement: shot.cameraMovement || 'static',
            action: shot.action || '',
            dialogue: shot.dialogue || null,
            dialogueChar: shot.dialogueChar || null,
            duration: shot.duration ?? 3.0,
            imagePrompt: shot.imagePrompt || null,
            videoPrompt: shot.videoPrompt || null,
            atmosphere: shot.atmosphere || null,
          },
        })
        savedStoryboards.push(saved)
      }

      // Update storyboard status
      await db.episode.update({
        where: { id: episodeId },
        data: { storyboardStatus: 'completed' },
      })

      return NextResponse.json({ storyboards: savedStoryboards })
    } catch (aiError) {
      // Update status to failed
      await db.episode.update({
        where: { id: episodeId },
        data: { storyboardStatus: 'failed' },
      })
      throw aiError
    }
  } catch (error) {
    console.error('Failed to generate storyboard:', error)
    return NextResponse.json(
      { error: 'Failed to generate storyboard' },
      { status: 500 }
    )
  }
}
