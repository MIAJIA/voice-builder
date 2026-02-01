import Anthropic from '@anthropic-ai/sdk';
import { buildCoThinkSystemPrompt } from '@/lib/prompts';

const client = new Anthropic();

// Message format from client
interface ClientMessage {
  role: 'user' | 'assistant';
  content: string;
  image?: string; // base64 data URI
}

// Convert client message to Anthropic API format
function formatMessageContent(
  message: ClientMessage
): Anthropic.MessageParam['content'] {
  // Assistant messages are always text-only
  if (message.role === 'assistant') {
    return message.content;
  }

  // User messages can have text + image
  if (message.image) {
    const content: Anthropic.ContentBlockParam[] = [];

    // Add image block
    // Extract base64 and media type from data URI
    const match = message.image.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      const mediaType = match[1] as
        | 'image/jpeg'
        | 'image/png'
        | 'image/gif'
        | 'image/webp';
      const base64Data = match[2];

      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: base64Data,
        },
      });
    }

    // Add text block if present
    if (message.content) {
      content.push({
        type: 'text',
        text: message.content,
      });
    } else {
      // If no text, add a prompt to describe/discuss the image
      content.push({
        type: 'text',
        text: '请看这张图片，然后开始采访我关于它的想法。',
      });
    }

    return content;
  }

  // Text-only message
  return message.content;
}

export async function POST(request: Request) {
  try {
    const { messages, profile } = await request.json();

    const systemPrompt = buildCoThinkSystemPrompt(profile);

    // Format messages for Anthropic API
    const formattedMessages: Anthropic.MessageParam[] = messages.map(
      (m: ClientMessage) => ({
        role: m.role,
        content: formatMessageContent(m),
      })
    );

    // Create a streaming response
    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: formattedMessages,
    });

    // Create a ReadableStream for SSE
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              const data = JSON.stringify({ text: event.delta.text });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process chat request' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
