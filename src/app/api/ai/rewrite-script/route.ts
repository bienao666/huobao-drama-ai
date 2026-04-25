import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

const SYSTEM_PROMPT = `你是一位专业的短剧编剧。你的任务是将原始故事内容改写为格式化的短剧剧本。

改写规则：
1. 保留核心情节和角色关系
2. 增强画面感，将叙述性文字转化为可视化场景描写
3. 用对话驱动情节，减少旁白
4. 每场戏控制在30-60秒
5. 不写镜头语言（景别、角度等），这些属于分镜步骤

格式化剧本格式：
## S编号 | 内景/外景 · 地点 | 时间段

动作描写自然段

角色名：（状态/表情）台词内容

请直接输出改写后的剧本，不要添加其他说明。`;

// POST /api/ai/rewrite-script - AI Script Rewrite
export async function POST(request: NextRequest) {
  try {
    const { episodeId } = await request.json();

    if (!episodeId) {
      return NextResponse.json({ error: 'episodeId is required' }, { status: 400 });
    }

    // Get episode
    const episode = await db.episode.findUnique({
      where: { id: episodeId },
    });

    if (!episode) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
    }

    if (!episode.rawContent) {
      return NextResponse.json({ error: 'Episode has no raw content' }, { status: 400 });
    }

    // Update status to processing
    await db.episode.update({
      where: { id: episodeId },
      data: { scriptStatus: 'processing' },
    });

    try {
      // Call AI to rewrite script
      const client = await ZAI.create();
      const response = await client.chat.completions.create({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: episode.rawContent },
        ],
      });

      const scriptContent = response.choices?.[0]?.message?.content || '';

      // Save to database
      const updated = await db.episode.update({
        where: { id: episodeId },
        data: {
          scriptContent,
          scriptStatus: 'completed',
        },
      });

      return NextResponse.json({ episode: updated, scriptContent });
    } catch (aiError) {
      // Update status to failed
      await db.episode.update({
        where: { id: episodeId },
        data: { scriptStatus: 'failed' },
      });
      throw aiError;
    }
  } catch (error) {
    console.error('Failed to rewrite script:', error);
    return NextResponse.json({ error: 'Failed to rewrite script' }, { status: 500 });
  }
}
