import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'

// POST /api/ai/generate-video - Generate video for a storyboard shot
// Uses z-ai-web-dev-sdk for video generation (NVIDIA doesn't provide video gen)
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

    // Update status to processing
    await db.storyboard.update({
      where: { id: storyboardId },
      data: { status: 'processing' },
    })

    try {
      // Use storyboard's videoPrompt if no prompt provided
      const videoPrompt = prompt || storyboard.videoPrompt || storyboard.action || ''

      if (!videoPrompt) {
        await db.storyboard.update({
          where: { id: storyboardId },
          data: { status: 'failed' },
        })
        return NextResponse.json(
          { error: 'No prompt provided and storyboard has no video prompt or action' },
          { status: 400 }
        )
      }

      // Create ZAI client
      const client = await ZAI.create()

      // Create video generation task
      const videoRequestBody: Record<string, unknown> = {
        prompt: videoPrompt,
        quality: 'speed',
        with_audio: false,
        size: '1344x768',
        fps: 30,
        duration: 5,
      }

      // Add first frame URL if provided (for image-to-video)
      if (firstFrameUrl || storyboard.firstFrameUrl) {
        const frameUrl = firstFrameUrl || storyboard.firstFrameUrl
        videoRequestBody.image_url = frameUrl
      }

      const task = await client.video.generations.create(
        videoRequestBody as import('z-ai-web-dev-sdk').CreateVideoGenerationBody
      )

      console.log(`[generate-video] Task created: ${task.id}, status: ${task.task_status}`)

      // Poll for result with timeout
      const maxPolls = 60
      const pollInterval = 5000 // 5 seconds
      let result = await client.async.result.query(task.id)
      let pollCount = 0

      while (result.task_status === 'PROCESSING' && pollCount < maxPolls) {
        pollCount++
        await new Promise((resolve) => setTimeout(resolve, pollInterval))
        result = await client.async.result.query(task.id)
        console.log(
          `[generate-video] Poll ${pollCount}/${maxPolls}: status=${result.task_status}`
        )
      }

      if (result.task_status === 'SUCCESS') {
        // Get video URL from result
        const videoUrl =
          result.video_result?.[0]?.url ||
          result.video_url ||
          result.url ||
          result.video ||
          ''

        if (!videoUrl) {
          await db.storyboard.update({
            where: { id: storyboardId },
            data: { status: 'failed' },
          })
          return NextResponse.json(
            { error: 'Video generation succeeded but no URL was returned' },
            { status: 500 }
          )
        }

        // Update storyboard with video URL
        const updatedStoryboard = await db.storyboard.update({
          where: { id: storyboardId },
          data: {
            videoUrl: String(videoUrl),
            status: 'completed',
          },
        })

        return NextResponse.json({ storyboard: updatedStoryboard })
      } else {
        // Video generation failed or timed out
        await db.storyboard.update({
          where: { id: storyboardId },
          data: { status: 'failed' },
        })
        return NextResponse.json(
          {
            error: `Video generation ${result.task_status === 'FAIL' ? 'failed' : 'timed out'}`,
          },
          { status: 500 }
        )
      }
    } catch (aiError) {
      await db.storyboard.update({
        where: { id: storyboardId },
        data: { status: 'failed' },
      })
      throw aiError
    }
  } catch (error) {
    console.error('Failed to generate video:', error)
    return NextResponse.json(
      { error: 'Failed to generate video' },
      { status: 500 }
    )
  }
}
