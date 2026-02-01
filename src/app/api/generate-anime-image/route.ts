import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

const anthropic = new Anthropic();
const openai = new OpenAI();

const EXTRACT_HIGHLIGHT_PROMPT = `你是一个帮助用户从对话内容中提取核心概念用于生成配图的助手。

## 任务
从用户提供的对话内容中，提取 1-2 个最核心、最有画面感的概念或意象。

## 要求
- 选择最能代表内容核心思想的意象
- 意象要有视觉表现力，适合生成插画
- 避免抽象概念，选择具体、有画面感的元素

## 输出格式
返回一个简短的英文图片描述（30-50 words），用于生成动漫/插画风格的配图。
描述应该包含：
- 主要视觉元素
- 情绪/氛围
- 简单的场景描述

只返回英文描述，不要有其他内容。`;

const ANIME_STYLE_SUFFIX = `, anime illustration style, soft colors, clean lines, Studio Ghibli inspired aesthetic, warm and inviting atmosphere, digital art`;

export async function POST(request: Request) {
  try {
    const { content } = await request.json();

    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Extract highlight using Claude
    console.log('[Anime Image] Extracting highlight...');
    const highlightResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 256,
      system: EXTRACT_HIGHLIGHT_PROMPT,
      messages: [{ role: 'user', content }],
    });

    const highlightText =
      highlightResponse.content[0].type === 'text'
        ? highlightResponse.content[0].text
        : '';

    // Step 2: Build final prompt for image generation
    const imagePrompt = `${highlightText.trim()}${ANIME_STYLE_SUFFIX}`;
    console.log('[Anime Image] Prompt:', imagePrompt.substring(0, 100) + '...');

    // Step 3: Generate image using DALL-E 3
    console.log('[Anime Image] Calling DALL-E 3...');
    const dalleResponse = await openai.images.generate({
      model: 'dall-e-3',
      prompt: imagePrompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      response_format: 'b64_json',
    });

    const imageData = dalleResponse.data[0]?.b64_json;

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
