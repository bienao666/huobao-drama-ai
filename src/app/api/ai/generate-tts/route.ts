import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'

// POST /api/ai/generate-tts - Generate TTS audio for a storyboard shot
// Uses z-ai-web-dev-sdk for TTS (NVIDIA doesn't provide TTS)
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

    // Update status to processing
    await db.storyboard.update({
      where: { id: storyboardId },
      data: { status: 'processing' },
    })

    try {
      // Create ZAI client
      const client = await ZAI.create()

      // Generate TTS audio
      const response = await client.audio.tts.create({
        input: ttsText,
        voice: voiceId || 'tongtong',
        speed: 1.0,
        response_format: 'wav',
        stream: false,
      })

      // Get audio data from response
      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(new Uint8Array(arrayBuffer))

      // Convert to base64 data URL for Vercel compatibility (no filesystem writes)
      const base64Audio = buffer.toString('base64')
      const ttsAudioUrl = `data:audio/wav;base64,${base64Audio}`

      // Update storyboard with TTS audio URL
      const updatedStoryboard = await db.storyboard.update({
        where: { id: storyboardId },
        data: {
          ttsAudioUrl,
          status: 'completed',
        },
      })

      return NextResponse.json({ storyboard: updatedStoryboard })
    } catch (aiError) {
      await db.storyboard.update({
        where: { id: storyboardId },
        data: { status: 'failed' },
      })
      throw aiError
    }
  } catch (error) {
    console.error('Failed to generate TTS:', error)
    return NextResponse.json(
      { error: 'Failed to generate TTS audio' },
      { status: 500 }
    )
  }
}
