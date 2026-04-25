import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import ZAI from 'z-ai-web-dev-sdk';

// POST /api/ai/generate-image - AI Generate Image
export async function POST(request: NextRequest) {
  try {
    const { prompt, size } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    // Ensure the generated directory exists
    const generatedDir = path.join(process.cwd(), 'public', 'generated');
    await mkdir(generatedDir, { recursive: true });

    // Call AI to generate image
    const client = await ZAI.create();
    const response = await client.images.generations.create({
      prompt,
      size: size || '1024x1024',
    });

    if (!response.data?.[0]?.base64) {
      return NextResponse.json({ error: 'No image generated' }, { status: 500 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const filename = `img_${timestamp}_${randomStr}.png`;
    const filepath = path.join(generatedDir, filename);

    // Save the base64 image to file
    const buffer = Buffer.from(response.data[0].base64, 'base64');
    await writeFile(filepath, buffer);

    // Return the URL path
    const imageUrl = `/generated/${filename}`;

    return NextResponse.json({ imageUrl, prompt });
  } catch (error) {
    console.error('Failed to generate image:', error);
    return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 });
  }
}
