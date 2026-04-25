import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

const SYSTEM_PROMPT = `你是一位专业的短剧分镜师。你的任务是将剧本拆解为分镜镜头。

每个镜头包含以下字段：
- shotNumber: 镜头序号
- title: 镜头标题（3-5字）
- shotType: 景别（close-up/medium/wide/extreme-close/full/over-shoulder）
- cameraAngle: 角度（eye-level/high/low/dutch/birds-eye）
- cameraMovement: 运镜（static/pan/tilt/zoom/dolly/tracking）
- action: 画面动作描述
- dialogue: 对话内容（含说话角色）
- dialogueChar: 说话角色名
- duration: 镜头时长（秒，10-15秒）
- imagePrompt: 静态画面英文提示词（用于首帧图片生成）
- videoPrompt: 视频英文提示词（按3秒分段描述）
- atmosphere: 氛围描述

请以JSON数组格式返回分镜列表。只返回JSON，不要添加其他内容。`;

// POST /api/ai/generate-storyboard - AI Generate Storyboard
export async function POST(request: NextRequest) {
  try {
    const { episodeId } = await request.json();

    if (!episodeId) {
      return NextResponse.json({ error: 'episodeId is required' }, { status: 400 });
    }

    // Get episode with drama info
    const episode = await db.episode.findUnique({
      where: { id: episodeId },
      include: {
        drama: {
          include: {
            characters: true,
            scenes: true,
          },
        },
      },
    });

    if (!episode) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
    }

    if (!episode.scriptContent) {
      return NextResponse.json({ error: 'Episode has no script content. Run script rewrite first.' }, { status: 400 });
    }

    // Update storyboard status to processing
    await db.episode.update({
      where: { id: episodeId },
      data: { storyboardStatus: 'processing' },
    });

    try {
      // Build context from characters and scenes
      const charactersInfo = episode.drama.characters
        .map((c) => `${c.name}(${c.role}, ${c.gender}${c.appearance ? ', ' + c.appearance : ''})`)
        .join('\n');

      const scenesInfo = episode.drama.scenes
        .map((s) => `${s.location}(${s.timeOfDay}${s.description ? ', ' + s.description : ''})`)
        .join('\n');

      const userContent = `剧本内容：
${episode.scriptContent}

${charactersInfo ? `角色列表：\n${charactersInfo}\n` : ''}${scenesInfo ? `场景列表：\n${scenesInfo}` : ''}`;

      // Call AI to generate storyboard
      const client = await ZAI.create();
      const response = await client.chat.completions.create({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
      });

      const content = response.choices?.[0]?.message?.content || '';

      // Parse JSON from response
      let jsonStr = content.trim();
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      const shots = JSON.parse(jsonStr);

      // Delete existing storyboards for this episode
      await db.storyboard.deleteMany({
        where: { episodeId },
      });

      // Save storyboard shots to database
      const savedStoryboards = [];
      for (const shot of shots) {
        const saved = await db.storyboard.create({
          data: {
            episodeId,
            shotNumber: shot.shotNumber || savedStoryboards.length + 1,
            title: shot.title || '',
            shotType: shot.shotType || 'medium',
            cameraAngle: shot.cameraAngle || 'eye-level',
            cameraMovement: shot.cameraMovement || 'static',
            action: shot.action || '',
            dialogue: shot.dialogue || null,
            dialogueChar: shot.dialogueChar || null,
            duration: shot.duration ?? 3.0,
            imagePrompt: shot.imagePrompt || null,
            videoPrompt: shot.videoPrompt || null,
            atmosphere: shot.atmosphere || null,
          },
        });
        savedStoryboards.push(saved);
      }

      // Update storyboard status
      await db.episode.update({
        where: { id: episodeId },
        data: { storyboardStatus: 'completed' },
      });

      return NextResponse.json({ storyboards: savedStoryboards });
    } catch (aiError) {
      // Update status to failed
      await db.episode.update({
        where: { id: episodeId },
        data: { storyboardStatus: 'failed' },
      });
      throw aiError;
    }
  } catch (error) {
    console.error('Failed to generate storyboard:', error);
    return NextResponse.json({ error: 'Failed to generate storyboard' }, { status: 500 });
  }
}
