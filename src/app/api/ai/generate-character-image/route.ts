import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

// POST /api/ai/generate-character-image - AI Generate Character Portrait
export async function POST(request: NextRequest) {
  try {
    const { characterId } = await request.json();

    if (!characterId) {
      return NextResponse.json({ error: 'characterId is required' }, { status: 400 });
    }

    // Get character
    const character = await db.character.findUnique({
      where: { id: characterId },
    });

    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    // Build image prompt from character appearance
    const appearanceDesc = character.appearance || `${character.name}, ${character.gender}`;
    const prompt = `Portrait of a character: ${appearanceDesc}. ${character.personality ? `Personality: ${character.personality}.` : ''} High quality, detailed face, cinematic lighting, dramatic portrait photography style, 8k, photorealistic`;

    // Ensure the generated directory exists
    const generatedDir = path.join(process.cwd(), 'public', 'generated');
    await mkdir(generatedDir, { recursive: true });

    // Call AI to generate image
    const client = await ZAI.create();
    const response = await client.images.generations.create({
      prompt,
      size: '768x1344',
    });

    if (!response.data?.[0]?.base64) {
      return NextResponse.json({ error: 'No image generated' }, { status: 500 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const filename = `char_${character.name}_${timestamp}_${randomStr}.png`;
    const filepath = path.join(generatedDir, filename);

    // Save the base64 image to file
    const buffer = Buffer.from(response.data[0].base64, 'base64');
    await writeFile(filepath, buffer);

    // Save imageUrl to character record
    const imageUrl = `/generated/${filename}`;
    const updatedCharacter = await db.character.update({
      where: { id: characterId },
      data: { imageUrl },
    });

    return NextResponse.json({ character: updatedCharacter, imageUrl });
  } catch (error) {
    console.error('Failed to generate character image:', error);
    return NextResponse.json({ error: 'Failed to generate character image' }, { status: 500 });
  }
}
