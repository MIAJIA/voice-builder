import Anthropic from '@anthropic-ai/sdk';
import type { FavoriteCreator } from '@/lib/store';

const client = new Anthropic();

export interface VideoResearchResult {
  topic: string;
  references: Array<{
    creator: string;
    title: string;
    url?: string;
    hookPattern: string;
    structure: string;
    duration?: string;
    whyItWorks: string;
  }>;
  recommendedStructure: string;
  recommendedReason: string;
}

const RECOMMEND_STRUCTURE_PROMPT = `你是一个短视频内容策略专家。根据用户的内容，推荐最适合的口播故事结构。

## 输出格式
只返回 JSON：
{
  "topic": "主题概括",
  "references": [],
  "recommendedStructure": "推荐的故事结构（如：误区揭示→亲身体验→方法对比）",
  "recommendedReason": "为什么推荐这个结构（结合用户内容的具体特点，100字以内）"
}

## 要求
- references 必须为空数组（V1 暂不支持真实搜索）
- recommendedStructure 要根据内容特点动态选择，不套模板
- recommendedReason 要具体，说明为什么这个结构适合这个内容
- 可选的结构模式：反常识→故事→反转 / 结果→倒叙→复盘 / 问题→尝试→发现 / 对比→体验→观点 / 也可以自创

只返回 JSON，不要有其他内容。`;

export async function POST(request: Request) {
  try {
    let body: {
      content: string;
      favoriteCreators?: FavoriteCreator[];
    };

    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { content } = body;
    // favoriteCreators reserved for future browser automation integration

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      system: RECOMMEND_STRUCTURE_PROMPT,
      messages: [{ role: 'user', content }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result: VideoResearchResult = JSON.parse(jsonMatch[0]);
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw new Error('No valid JSON found');
    } catch {
      return new Response(JSON.stringify({
        topic: '',
        references: [],
        recommendedStructure: '个人经历 → 核心观点 → 行动建议',
        recommendedReason: '基于通用短视频结构推荐。',
      } satisfies VideoResearchResult), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Video research API error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to research video content' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
