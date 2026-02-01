import Anthropic from '@anthropic-ai/sdk';
import { TRANSFORM_TWITTER_PROMPT } from '@/lib/prompts';

const client = new Anthropic();

export async function POST(request: Request) {
  try {
    const { content, profile } = await request.json();

    let systemPrompt = TRANSFORM_TWITTER_PROMPT;

    // Add profile context if available
    if (profile) {
      systemPrompt += `\n\n## 用户风格偏好
- 语气: ${profile.tone === 'casual' ? '轻松随意' : profile.tone === 'professional' ? '专业正式' : '幽默风趣'}
- 避免词汇: ${profile.avoidWords?.join(', ') || '无'}
`;
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: content,
        },
      ],
    });

    const text =
      response.content[0].type === 'text' ? response.content[0].text : '';

    return new Response(JSON.stringify({ result: text }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Transform API error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to transform content' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
