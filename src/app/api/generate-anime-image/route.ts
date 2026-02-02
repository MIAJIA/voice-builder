import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

const anthropic = new Anthropic();
const openai = new OpenAI();

const EXTRACT_HIGHLIGHT_PROMPT = `You create simple illustration prompts in the style of Notion or Slack illustrations.

## Style Reference
Think: Notion's empty state illustrations, Slack's onboarding graphics, Linear's minimal art.
- Simple stick-figure-like characters (not realistic humans)
- 2-3 colors maximum
- Pure white or solid color background
- One clear action or emotion
- Geometric, almost childlike simplicity

## Task
Extract ONE simple scene from the user's content. Describe it in 15-25 words.

## Format
[WHO]: A simple figure (stick person, blob character, or minimal human shape)
[DOING WHAT]: One clear, simple action
[WITH WHAT]: 1-2 simple objects maximum

## Good Examples
- "A simple line-art figure sitting cross-legged with a floating lightbulb above their head"
- "A minimal blob character watering a small plant, single green sprout"
- "One stick figure standing at a fork in a path, looking at two arrows"
- "A simple outlined person holding up a giant pencil, ready to write"

## Bad Examples (NEVER do these)
- Realistic humans with facial features
- Complex backgrounds or environments
- Multiple characters interacting
- Tech imagery (screens, code, networks)
- Anything with gradients, shadows, or 3D effects

Output ONLY the simple scene description, nothing else.`;

// Notion/Linear style - extremely minimal
const ANIME_STYLE_SUFFIX = `. Simple line art illustration, stick figure style, black outlines only, pure white background, no shading, no gradients, no shadows, geometric shapes, minimal detail, like Notion empty state illustrations, single color accent if any, extremely simple and clean`;

export async function POST(request: Request) {
  try {
    const { content, customPrompt } = await request.json();

    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let imagePrompt: string;
    let highlightText: string = '';

    if (customPrompt) {
      // Use custom prompt directly with style suffix
      console.log('[Anime Image] Using custom prompt...');
      highlightText = customPrompt;
      imagePrompt = `${customPrompt}${ANIME_STYLE_SUFFIX}`;
    } else {
      // Step 1: Extract highlight using Claude
      console.log('[Anime Image] Extracting highlight...');
      const highlightResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 256,
        system: EXTRACT_HIGHLIGHT_PROMPT,
        messages: [{ role: 'user', content }],
      });

      highlightText =
        highlightResponse.content[0].type === 'text'
          ? highlightResponse.content[0].text
          : '';

      // Step 2: Build final prompt for image generation
      imagePrompt = `${highlightText.trim()}${ANIME_STYLE_SUFFIX}`;
    }
    console.log('[Anime Image] Prompt:', imagePrompt.substring(0, 100) + '...');

    // Step 3: Generate image using DALL-E 3
    console.log('[Anime Image] Calling DALL-E 3...');
    const dalleResponse = await openai.images.generate({
      model: 'dall-e-3',
      prompt: imagePrompt,
      n: 1,
      size: '1024x1024', // Square format works better for minimal illustrations
      quality: 'standard', // Standard is fine for line art
      style: 'natural', // Natural style for cleaner, less over-processed look
      response_format: 'b64_json',
    });

    const imageData = dalleResponse.data?.[0]?.b64_json;

    if (!imageData) {
      console.log('[Anime Image] No image data returned');
      return new Response(
        JSON.stringify({
          error: 'Failed to generate image',
          details: 'DALL-E did not return image data',
          prompt: imagePrompt,
          highlight: highlightText,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Anime Image] Success!');
    return new Response(
      JSON.stringify({
        prompt: imagePrompt,
        highlight: highlightText,
        image: `data:image/png;base64,${imageData}`,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Anime Image] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        error: 'Failed to generate image',
        details: errorMessage,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
