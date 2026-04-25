import { NextRequest, NextResponse } from 'next/server'
import { aiClient } from '@/lib/ai-config'

// POST /api/ai/generate-image - AI Generate Image
// Returns a data URL (data:image/png;base64,...) for Vercel compatibility
export async function POST(request: NextRequest) {
  try {
    const { prompt, size, storyboardId, atmosphere } = await request.json()

    if (!prompt) {
      return NextResponse.json(
        { error: 'prompt is required' },
        { status: 400 }
      )
    }

    // Generate image using aiClient
    let base64Image: string

    if (storyboardId || atmosphere) {
      // Use storyboard frame generation for storyboard-related requests
      base64Image = await aiClient.generateStoryboardFrame(prompt, atmosphere)
    } else {
      // Use general image generation
      const negativePrompt =
        'blurry, low quality, distorted, watermark, text overlay'
      base64Image = await aiClient.generateImage(prompt, negativePrompt, {
        size: (size as '1024x1024' | '512x512' | '256x256') || '1024x1024',
      })
    }

    // Convert base64 to data URL for Vercel compatibility (no filesystem writes)
    const imageUrl = `data:image/png;base64,${base64Image}`

    return NextResponse.json({ imageUrl, prompt })
  } catch (error) {
    console.error('Failed to generate image:', error)
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    )
  }
}
