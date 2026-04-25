import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/upload - Upload a file and return a data URL
// Supports images, videos, and audio files
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const storyboardId = formData.get('storyboardId') as string | null
    const characterId = formData.get('characterId') as string | null
    const sceneId = formData.get('sceneId') as string | null
    const fieldType = formData.get('fieldType') as string | null // 'firstFrameUrl' | 'videoUrl' | 'ttsAudioUrl' | 'imageUrl'

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large (max 50MB)' },
        { status: 400 }
      )
    }

    // Convert to data URL for Vercel compatibility
    const buffer = Buffer.from(await file.arrayBuffer())
    const base64 = buffer.toString('base64')
    const mimeType = file.type || 'application/octet-stream'
    const dataUrl = `data:${mimeType};base64,${base64}`

    // Update the related entity if ID is provided
    if (storyboardId && fieldType) {
      const validFields = ['firstFrameUrl', 'videoUrl', 'ttsAudioUrl', 'composedUrl']
      if (!validFields.includes(fieldType)) {
        return NextResponse.json(
          { error: `Invalid field type: ${fieldType}` },
          { status: 400 }
        )
      }

      const updateData: Record<string, string> = { [fieldType]: dataUrl }
      if (fieldType === 'firstFrameUrl' || fieldType === 'videoUrl') {
        updateData.status = 'completed'
      }

      const storyboard = await db.storyboard.update({
        where: { id: storyboardId },
        data: updateData,
      })

      return NextResponse.json({ storyboard, url: dataUrl })
    }

    if (characterId && fieldType === 'imageUrl') {
      const character = await db.character.update({
        where: { id: characterId },
        data: { imageUrl: dataUrl },
      })

      return NextResponse.json({ character, url: dataUrl })
    }

    if (sceneId && fieldType === 'imageUrl') {
      const scene = await db.scene.update({
        where: { id: sceneId },
        data: { imageUrl: dataUrl },
      })

      return NextResponse.json({ scene, url: dataUrl })
    }

    // Just return the data URL if no entity to update
    return NextResponse.json({ url: dataUrl })
  } catch (error) {
    console.error('Failed to upload file:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}
