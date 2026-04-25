import { NextResponse } from 'next/server'
import { aiClient, getAiConfig, NVIDIA_CHAT_MODELS } from '@/lib/ai-config'

// POST /api/ai/test-connection - Test NVIDIA API connectivity
export async function POST() {
  try {
    const config = getAiConfig()

    if (!config.nvidiaAvailable) {
      return NextResponse.json({
        success: false,
        error: 'NVIDIA_API_KEY is not configured. Set the environment variable to enable NVIDIA AI features.',
        nvidiaAvailable: false,
      })
    }

    // Try a simple chat completion to verify connectivity
    const response = await aiClient.chat('Say "OK" and nothing else.', undefined, {
      maxRetries: 1,
      temperature: 0,
      max_tokens: 10,
      model: NVIDIA_CHAT_MODELS.LLAMA_70B,
    })

    // If we got a response, the connection is working
    return NextResponse.json({
      success: true,
      model: config.defaultChatModel,
      imageProvider: config.imageProvider,
      nvidiaAvailable: config.nvidiaAvailable,
      responsePreview: response.slice(0, 100),
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred'

    return NextResponse.json({
      success: false,
      error: message,
      nvidiaAvailable: !!process.env.NVIDIA_API_KEY,
    })
  }
}
