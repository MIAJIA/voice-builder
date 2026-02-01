import Anthropic from '@anthropic-ai/sdk';
import { Platform, Profile } from '@/lib/store';
import {
  buildPlatformTransformPrompt,
  OutputLength,
} from '@/lib/prompts';

const client = new Anthropic();

export async function POST(request: Request) {
  try {
    const {
      content,
      profile,
      platform = 'twitter',
      length = 'normal',
      stream = false,
    } = (await request.json()) as {
      content: string;
      profile?: Profile;
      platform?: Platform;
      length?: OutputLength;
      stream?: boolean;
    };

    // Get persona for this platform (if exists)
    const persona = profile?.platformPersonas?.[platform] || null;

    // Build platform-specific prompt
    let systemPrompt = buildPlatformTransformPrompt(
      platform,
      persona,
      length as OutputLength
    );

    // Add global profile context if available (for non-custom personas)
    if (profile && !persona?.isCustom) {
      systemPrompt += `\n\n## 用户基础风格
- 语气: ${profile.tone === 'casual' ? '轻松随意' : profile.tone === 'professional' ? '专业正式' : '幽默风趣'}
- 避免词汇: ${profile.avoidWords?.join(', ') || '无'}
`;
    }

    // Adjust max_tokens based on platform and length
    const baseTokens = {
      twitter: { concise: 256, normal: 512, detailed: 1024 },
      xiaohongshu: { concise: 512, normal: 1024, detailed: 2048 },
      wechat: { concise: 256, normal: 512, detailed: 1024 },
      linkedin: { concise: 512, normal: 1024, detailed: 2048 },
    };
    const maxTokens = baseTokens[platform]?.[length] || 512;

    // Streaming mode
    if (stream) {
      const encoder = new TextEncoder();
      let isClosed = false;

      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            const streamResponse = client.messages.stream({
              model: 'claude-sonnet-4-20250514',
              max_tokens: maxTokens,
              system: systemPrompt,
              messages: [
                {
                  role: 'user',
                  content: content,
                },
              ],
            });

            for await (const event of streamResponse) {
              if (isClosed) break;
              if (
                event.type === 'content_block_delta' &&
                event.delta.type === 'text_delta'
              ) {
                const data = JSON.stringify({ text: event.delta.text });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              }
            }
            if (!isClosed) {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
              isClosed = true;
            }
          } catch (error) {
            if (!isClosed) {
              console.error('Stream error:', error);
              controller.error(error);
              isClosed = true;
            }
          }
        },
        cancel() {
          isClosed = true;
        },
      });

      return new Response(readableStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    // Non-streaming mode (for background prefetch)
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
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
