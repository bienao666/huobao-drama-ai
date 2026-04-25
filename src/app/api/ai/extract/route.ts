import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

const SYSTEM_PROMPT = `你是一位专业的短剧分析师。你的任务是从剧本中提取角色和场景信息。

请从以下剧本中提取所有角色和场景，以JSON格式返回：
{
  "characters": [
    { "name": "角色名", "role": "protagonist/antagonist/supporting/extras", "gender": "male/female/unknown", "appearance": "外貌描写（300-500字详细描述，包含性别、年龄、体型、面部特征、发型、着装）", "personality": "性格特点描述" }
  ],
  "scenes": [
    { "location": "地点名", "timeOfDay": "day/night/dawn/dusk", "description": "场景描述", "prompt": "用于AI图片生成的英文提示词（纯背景，不含人物）" }
  ]
}

只返回JSON，不要添加其他内容。`;

// POST /api/ai/extract - AI Extract Characters & Scenes
export async function POST(request: NextRequest) {
  try {
    const { episodeId, dramaId } = await request.json();

    if (!episodeId || !dramaId) {
      return NextResponse.json({ error: 'episodeId and dramaId are required' }, { status: 400 });
    }

    // Get episode
    const episode = await db.episode.findUnique({
      where: { id: episodeId },
    });

    if (!episode) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
    }

    if (!episode.scriptContent) {
      return NextResponse.json({ error: 'Episode has no script content. Run script rewrite first.' }, { status: 400 });
    }

    // Update extract status to processing
    await db.episode.update({
      where: { id: episodeId },
      data: { extractStatus: 'processing' },
    });

    try {
      // Call AI to extract characters and scenes
      const client = await ZAI.create();
      const response = await client.chat.completions.create({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: episode.scriptContent },
        ],
      });

      const content = response.choices?.[0]?.message?.content || '';

      // Parse JSON from response (handle markdown code blocks)
      let jsonStr = content.trim();
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      const extracted = JSON.parse(jsonStr);
      const { characters = [], scenes = [] } = extracted;

      // Save characters to database
      const savedCharacters = [];
      for (const char of characters) {
        const saved = await db.character.create({
          data: {
            dramaId,
            name: char.name || 'Unknown',
            role: char.role || 'supporting',
            gender: char.gender || 'unknown',
            appearance: char.appearance || '',
            personality: char.personality || '',
          },
        });
        savedCharacters.push(saved);
      }

      // Save scenes to database
      const savedScenes = [];
      for (const scene of scenes) {
        const saved = await db.scene.create({
          data: {
            dramaId,
            location: scene.location || 'Unknown',
            timeOfDay: scene.timeOfDay || 'day',
            description: scene.description || '',
            prompt: scene.prompt || '',
          },
        });
        savedScenes.push(saved);
      }

      // Update extract status
      await db.episode.update({
        where: { id: episodeId },
        data: { extractStatus: 'completed' },
      });

      return NextResponse.json({
        characters: savedCharacters,
        scenes: savedScenes,
      });
    } catch (aiError) {
      // Update status to failed
      await db.episode.update({
        where: { id: episodeId },
        data: { extractStatus: 'failed' },
      });
      throw aiError;
    }
  } catch (error) {
    console.error('Failed to extract characters and scenes:', error);
    return NextResponse.json({ error: 'Failed to extract characters and scenes' }, { status: 500 });
  }
}
