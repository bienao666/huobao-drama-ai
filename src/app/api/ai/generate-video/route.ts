import { NextRequest, NextResponse } from 'next/server'
import { aiClient } from '@/lib/ai-config'
import { db } from '@/lib/db'

// POST /api/ai/generate-video - Generate video for a storyboard shot (multi-provider)
export async function POST(request: NextRequest) {
  try {
    const { storyboardId, prompt, firstFrameUrl } = await request.json()

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

    // Use storyboard's videoPrompt if no prompt provided
    const videoPrompt = prompt || storyboard.videoPrompt || storyboard.action || ''

    if (!videoPrompt) {
      return NextResponse.json(
        { error: 'No prompt provided and storyboard has no video prompt or action' },
        { status: 400 }
      )
    }

    const frameUrl = firstFrameUrl || storyboard.firstFrameUrl || undefined

    // Use multi-provider aiClient
    await aiClient.generateVideo(storyboardId, videoPrompt, frameUrl)

    // Fetch updated storyboard
    const updatedStoryboard = await db.storyboard.findUnique({
      where: { id: storyboardId },
    })

    return NextResponse.json({ storyboard: updatedStoryboard })
  } catch (error) {
    console.error('Failed to generate video:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
