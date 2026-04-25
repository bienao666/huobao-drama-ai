import { NextRequest, NextResponse } from 'next/server'
import { aiClient } from '@/lib/ai-config'
import type { AiCategory } from '@/lib/ai-config'

// POST /api/ai/test-connection - Test AI provider connectivity
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const category = (body.category || 'llm') as AiCategory

    const result = await aiClient.testConnection(category)
    return NextResponse.json(result)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred'

    return NextResponse.json({
      success: false,
      error: message,
    })
  }
}
