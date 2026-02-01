import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const EXTRACT_POINTS_PROMPT = `你是一个帮助用户将对话内容提炼成笔记卡片的助手。

## 任务
从用户提供的对话内容中，提取：
1. 一个简洁有力的标题（10-20字）
2. 3-5 个核心要点（每个要点 15-30 字）

## 要求
- 标题要抓住核心观点，有吸引力
- 要点要简洁、具体、有价值
- 保持用户的语气和风格
- 用第一人称或陈述句

## 输出格式
必须返回有效的 JSON，格式如下：
{
  "title": "标题内容",
  "points": ["要点1", "要点2", "要点3"]
}

只返回 JSON，不要有其他内容。`;

export async function POST(request: Request) {
  try {
    const { content } = await request.json();

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      system: EXTRACT_POINTS_PROMPT,
      messages: [
        {
          role: 'user',
          content: content,
        },
      ],
    });

    const text =
      response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse JSON response
    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw new Error('No valid JSON found in response');
    } catch (parseError) {
      console.error('Failed to parse extract-points response:', text);
      // Return a fallback
      return new Response(
        JSON.stringify({
          title: '我的想法',
          points: ['内容提取失败，请重试'],
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error('Extract points API error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to extract points' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
