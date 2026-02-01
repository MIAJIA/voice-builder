import Anthropic from '@anthropic-ai/sdk';
import { Platform } from '@/lib/store';
import { GENERATE_PERSONA_PROMPT, PERSONA_QUESTIONS, PLATFORM_NAMES } from '@/lib/prompts';

const client = new Anthropic();

export async function POST(request: Request) {
  try {
    const { platform, answers } = await request.json() as {
      platform: Platform;
      answers: string[];
    };

    const questions = PERSONA_QUESTIONS[platform];
    const platformName = PLATFORM_NAMES[platform];

    // Build Q&A context
    const qaContext = questions
      .map((q, i) => `Q: ${q}\nA: ${answers[i] || '(未回答)'}`)
      .join('\n\n');

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      system: GENERATE_PERSONA_PROMPT,
      messages: [
        {
          role: 'user',
          content: `平台: ${platformName}\n\n${qaContext}`,
        },
      ],
    });

    const text =
      response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse JSON response
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return new Response(
          JSON.stringify({
            ...result,
            isCustom: true,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      throw new Error('No valid JSON found in response');
    } catch (parseError) {
      console.error('Failed to parse persona response:', text);
      return new Response(
        JSON.stringify({
          platformBio: `${platformName} 内容创作者`,
          tone: '真诚、专业',
          styleNotes: '保持自然表达',
          isCustom: true,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error('Generate persona API error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate persona' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
