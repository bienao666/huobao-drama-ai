import { NextRequest, NextResponse } from 'next/server'
import { aiClient } from '@/lib/ai-config'
import { db } from '@/lib/db'

// POST /api/ai/generate-tts - Generate TTS audio for a storyboard shot (multi-provider)
export async function POST(request: NextRequest) {
  try {
    const { storyboardId, text, voiceId } = await request.json()

    if (!storyboardId) {
      return NextResponse.json(
        { error: 'storyboardId is required' },
        { status: 400 }
      )
    }

    // Get storyboard from DB
    const storyboard = await db.storyboard.findUnique({
      where: { id: storyboardId },
    })

    if (!storyboard) {
      return NextResponse.json(
        { error: 'Storyboard not found' },
        { status: 404 }
      )
    }

    // Use provided text, or fall back to storyboard dialogue
    const ttsText = text || storyboard.dialogue || ''

    if (!ttsText) {
      return NextResponse.json(
        { error: 'No text provided and storyboard has no dialogue' },
        { status: 400 }
      )
    }

    // Use multi-provider aiClient
    await aiClient.generateTts(storyboardId, ttsText, voiceId)

    // Fetch updated storyboard
    const updatedStoryboard = await db.storyboard.findUnique({
      where: { id: storyboardId },
    })

    return NextResponse.json({ storyboard: updatedStoryboard })
  } catch (error) {
    console.error('Failed to generate TTS:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
