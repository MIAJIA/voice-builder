/**
 * Content Generator
 *
 * Uses Claude to generate marketing content ideas and platform-specific posts
 * based on weekly inputs (feedback, stats, notes).
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  ContentGeneratorConfig,
  WeeklyInputs,
  ContentIdea,
  GeneratedContent,
  ContentPlatform,
  ContentBatch,
  ExtractedQuote,
} from './types';
import { CONTENT_ANGLES, PLATFORM_GUIDELINES } from './types';

const QUOTE_EXTRACTION_PROMPT = `从以下用户反馈中提取可以直接引用的金句。

## 用户反馈
{{feedback}}

## 要求
1. 保留原话的口语化表达，不要"美化"
2. 标注情感类型：resonance(共鸣)、pain_point(痛点)、surprise(惊喜)、insight(洞察)
3. 给出使用建议：适合做开头、结尾、核心论点、或佐证观点
4. 如果反馈内容没有可引用的金句，可以返回空数组

返回 JSON 数组：
[
  {
    "original": "用户原话",
    "context": "这句话的背景/语境",
    "emotion": "resonance|pain_point|surprise|insight",
    "usageHint": "使用建议",
    "source": "来源反馈的简短描述"
  }
]

只返回 JSON，不要其他内容。`;

const IDEA_GENERATION_PROMPT = `你是 Voice Builder 的内容策划，帮助用户克服完美主义、找到自己的声音。

根据本周的素材生成 5-7 个内容创意。核心原则：让用户原话"穿透"到最终内容。

## 本周用户金句（必须使用！）
{{quotes}}

## 本周反馈原文
{{feedback}}

## 使用数据
{{stats}}

## 创始人随手记
{{notes}}

{{trending}}

## 目标用户
- 有想法但不敢发的知识工作者
- 想保持自己声音的创作者
- 与完美主义/冒名顶替综合症斗争的人

## 内容类型
${Object.entries(CONTENT_ANGLES)
  .map(([key, value]) => `- ${key}: ${value.description}`)
  .join('\n')}

## 输出格式
返回 JSON 数组：
[
  {
    "topic": "主题简述",
    "angle": "story|tip|insight|question|announcement",
    "hook": "开头金句（优先使用用户原话或改编）",
    "keyPoints": ["要点1", "要点2", "要点3"],
    "targetAudience": "目标人群",
    "callToAction": "行动号召（可选）",
    "quotesToUse": ["要使用的用户原话索引，如 0, 1"]
  }
]

## 要求
1. 每个 idea 必须关联至少 1 条用户金句
2. keyPoints 中标注哪句来自用户原话（用「」标注）
3. 保持口语化，像真人在聊天
4. 不要"品牌腔"，不要"我们相信..."、"Voice Builder帮助..."这类说法
5. 可以有不完美的表达

只返回 JSON，不要其他内容。`;

const CONTENT_GENERATION_PROMPT = `把这个内容创意写成 {{platform}} 的帖子。

## 内容创意
主题: {{topic}}
类型: {{angle}}
开头: {{hook}}
要点:
{{keyPoints}}
目标人群: {{targetAudience}}
行动号召: {{callToAction}}

## 必须使用的用户原话
{{quotesToUse}}

## {{platform}} 平台规范
- 字数限制: {{maxLength}} 字符
- 语言: {{language}}
- 语气: {{tone}}
- 标签风格: {{hashtagStyle}}

## 写作要求
- 直接引用或稍作改编用户原话
- 用「」标注引用的用户原话
- 语气像真人在说话，不像品牌声明
- 可以有不完美、口语化的表达

## 不要
- 不要用"我们相信"、"Voice Builder 帮助..."这类品牌腔
- 不要过度润色用户原话
- 不要用"赋能"、"助力"、"打造"这类空洞词汇
- 不要每句话都很"正确"，可以有点个性

只返回帖子内容，不要其他说明。`;

export class ContentGenerator {
  private client: Anthropic;
  private config: ContentGeneratorConfig;
  private extractedQuotes: ExtractedQuote[] = [];

  constructor(config: ContentGeneratorConfig) {
    this.config = config;
    this.client = new Anthropic({
      apiKey: config.anthropic.apiKey,
    });
  }

  /**
   * 从用户反馈中提取可引用的金句
   */
  async extractQuotes(feedback: WeeklyInputs['userFeedback']): Promise<ExtractedQuote[]> {
    if (!feedback.length) {
      return [];
    }

    const feedbackText = feedback
      .map((f, i) => `[${i + 1}] [${f.type}${f.sentiment ? `/${f.sentiment}` : ''}] ${f.content}`)
      .join('\n');

    const prompt = QUOTE_EXTRACTION_PROMPT.replace('{{feedback}}', feedbackText);

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return [];
    }

    let jsonText = textContent.text;
    const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    try {
      return JSON.parse(jsonText) as ExtractedQuote[];
    } catch {
      console.error('[Content Generator] Failed to parse quotes JSON');
      return [];
    }
  }

  /**
   * Generate content ideas from weekly inputs
   */
  async generateIdeas(inputs: WeeklyInputs, quotes?: ExtractedQuote[]): Promise<ContentIdea[]> {
    const quotesToUse = quotes || this.extractedQuotes;

    const quotesText = quotesToUse.length
      ? quotesToUse
          .map(
            (q, i) =>
              `[${i}] 「${q.original}」\n   情感: ${q.emotion} | 建议: ${q.usageHint} | 来源: ${q.source}`
          )
          .join('\n')
      : '本周暂无提取到的金句，请从反馈原文中寻找亮点';

    const feedbackText = inputs.userFeedback
      .map((f) => `[${f.type}] ${f.content}`)
      .join('\n');

    const statsText = `
- 总对话数: ${inputs.usageStats.totalConversations}
- 总转换数: ${inputs.usageStats.totalTransforms}
- 新用户: ${inputs.usageStats.newUsers}
- 留存率: ${(inputs.usageStats.retentionRate * 100).toFixed(1)}%
- 热门平台: ${inputs.usageStats.topPlatforms.map((p) => `${p.platform} (${p.count})`).join(', ')}
    `.trim();

    const notesText = inputs.founderNotes.map((n) => `- ${n}`).join('\n');

    const trendingText = inputs.trendingTopics?.length
      ? `\n### 热门话题\n${inputs.trendingTopics.map((t) => `- ${t}`).join('\n')}`
      : '';

    const prompt = IDEA_GENERATION_PROMPT
      .replace('{{quotes}}', quotesText)
      .replace('{{feedback}}', feedbackText || '本周暂无反馈')
      .replace('{{stats}}', statsText)
      .replace('{{notes}}', notesText || '本周暂无随手记')
      .replace('{{trending}}', trendingText);

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    // Extract JSON from response
    let jsonText = textContent.text;
    const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    // 解析 JSON，quotesToUse 此时是索引数组
    const rawIdeas = JSON.parse(jsonText) as Array<
      Omit<ContentIdea, 'quotesToUse'> & { quotesToUse?: (number | string)[] }
    >;

    // 把 quotesToUse 索引转换为实际的 ExtractedQuote 对象
    return rawIdeas.map((idea) => {
      const quoteIndices = idea.quotesToUse || [];
      const linkedQuotes = quoteIndices
        .map((idx) => {
          const index = typeof idx === 'string' ? parseInt(idx, 10) : idx;
          return quotesToUse[index];
        })
        .filter((q): q is ExtractedQuote => q !== undefined);

      return {
        ...idea,
        quotesToUse: linkedQuotes.length > 0 ? linkedQuotes : undefined,
      } as ContentIdea;
    });
  }

  /**
   * Generate platform-specific content from an idea
   */
  async generateContent(idea: ContentIdea, platform: ContentPlatform): Promise<GeneratedContent> {
    const guidelines = PLATFORM_GUIDELINES[platform];

    // 格式化要使用的用户原话
    const quotesText = idea.quotesToUse?.length
      ? idea.quotesToUse.map((q) => `- 「${q.original}」(${q.usageHint})`).join('\n')
      : '无指定原话，但请尽量从内容要点中找到用户视角的表达';

    const prompt = CONTENT_GENERATION_PROMPT
      .replace(/{{platform}}/g, platform)
      .replace('{{topic}}', idea.topic)
      .replace('{{angle}}', idea.angle)
      .replace('{{hook}}', idea.hook)
      .replace('{{keyPoints}}', idea.keyPoints.map((p) => `- ${p}`).join('\n'))
      .replace('{{targetAudience}}', idea.targetAudience)
      .replace('{{callToAction}}', idea.callToAction || '无')
      .replace('{{quotesToUse}}', quotesText)
      .replace('{{maxLength}}', String(guidelines.maxLength))
      .replace('{{language}}', guidelines.language === 'zh' ? '中文' : guidelines.language === 'en' ? '英文' : '中英皆可')
      .replace('{{tone}}', guidelines.tone)
      .replace('{{hashtagStyle}}', guidelines.hashtagStyle);

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    const content = textContent.text.trim();

    // Extract hashtags if present
    const hashtagMatch = content.match(/#[\w\u4e00-\u9fff]+/g);

    return {
      platform,
      content,
      hashtags: hashtagMatch || undefined,
      suggestedTime: guidelines.bestTimes[0],
      metadata: {
        sourceIdea: idea.topic,
        generatedAt: new Date(),
        wordCount: content.length,
      },
    };
  }

  /**
   * Generate a full week's content batch
   */
  async generateWeeklyBatch(inputs: WeeklyInputs): Promise<ContentBatch> {
    // Step 1: 提取用户金句
    console.log('[Content Generator] Extracting quotes from feedback...');
    this.extractedQuotes = await this.extractQuotes(inputs.userFeedback);
    console.log(`[Content Generator] Extracted ${this.extractedQuotes.length} quotes`);

    if (this.extractedQuotes.length > 0) {
      console.log('[Content Generator] Quotes:');
      this.extractedQuotes.forEach((q, i) => {
        console.log(`  [${i}] 「${q.original}」 (${q.emotion})`);
      });
    }

    // Step 2: 生成内容创意（传入提取的金句）
    console.log('[Content Generator] Generating ideas...');
    const ideas = await this.generateIdeas(inputs, this.extractedQuotes);
    console.log(`[Content Generator] Generated ${ideas.length} ideas`);

    const content: GeneratedContent[] = [];

    // Step 3: 为每个平台生成内容
    for (const idea of ideas) {
      for (const platform of this.config.platforms) {
        console.log(`[Content Generator] Generating ${platform} content for: ${idea.topic}`);
        if (idea.quotesToUse?.length) {
          console.log(`  Using quotes: ${idea.quotesToUse.map((q) => `「${q.original.slice(0, 20)}...」`).join(', ')}`);
        }
        try {
          const generated = await this.generateContent(idea, platform);
          content.push(generated);

          // Rate limiting
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`[Content Generator] Failed to generate ${platform} content:`, error);
        }
      }
    }

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)

    return {
      weekOf: weekStart.toISOString().split('T')[0],
      ideas,
      content,
      status: 'draft',
    };
  }
}
