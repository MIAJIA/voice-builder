/**
 * Content Generator Agent Types
 *
 * Types for the weekly content generation agent that produces
 * marketing content for Voice Builder.
 */

export type ContentPlatform = 'twitter' | 'xiaohongshu' | 'jike' | 'linkedin';

export interface ContentIdea {
  topic: string;
  angle: 'story' | 'tip' | 'insight' | 'question' | 'announcement';
  hook: string;
  keyPoints: string[];
  targetAudience: string;
  callToAction?: string;
  quotesToUse?: ExtractedQuote[]; // 这个 idea 要使用的用户原话
}

export interface GeneratedContent {
  platform: ContentPlatform;
  content: string;
  hashtags?: string[];
  suggestedTime?: string;
  metadata: {
    sourceIdea: string;
    generatedAt: Date;
    wordCount: number;
  };
}

export interface ContentBatch {
  weekOf: string; // ISO date string for the week start
  ideas: ContentIdea[];
  content: GeneratedContent[];
  status: 'draft' | 'reviewed' | 'scheduled' | 'published';
}

export interface WeeklyInputs {
  userFeedback: FeedbackItem[];
  usageStats: UsageStats;
  founderNotes: string[];
  trendingTopics?: string[];
}

export interface FeedbackItem {
  type: 'bug' | 'feature' | 'testimonial' | 'general';
  content: string;
  date: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  extractedQuotes?: string[]; // 可引用的金句
}

/**
 * 从用户反馈中提取的可直接引用的金句
 */
export interface ExtractedQuote {
  original: string; // 用户原话
  context: string; // 背景说明
  emotion: 'resonance' | 'pain_point' | 'surprise' | 'insight'; // 情感标签
  usageHint: string; // 使用建议 (适合做开头/结尾/核心论点)
  source: string; // 来源 (哪条反馈)
}

export interface UsageStats {
  totalConversations: number;
  totalTransforms: number;
  topPlatforms: { platform: string; count: number }[];
  retentionRate: number;
  newUsers: number;
}

export interface ContentGeneratorConfig {
  anthropic: {
    apiKey: string;
  };
  notion?: {
    apiKey: string;
    feedbackDatabaseId: string;
    contentDatabaseId: string;
  };
  posthog?: {
    apiKey: string;
    projectId: string;
  };
  buffer?: {
    apiKey: string;
  };
  platforms: ContentPlatform[];
}

// Content templates and examples
export const CONTENT_ANGLES = {
  story: {
    description: '分享创始人或用户的真实故事',
    example: '我曾经也是那个"想了很多但从来不发"的人...',
  },
  tip: {
    description: '提供实用的写作/输出技巧',
    example: '克服完美主义的3个小技巧：1. 设置"足够好"标准...',
  },
  insight: {
    description: '分享对创作/输出的洞察',
    example: '为什么AI采访比AI代笔更有效？因为...',
  },
  question: {
    description: '引发讨论的开放性问题',
    example: '你上次"想发但没发"是因为什么？',
  },
  announcement: {
    description: '产品更新或功能发布',
    example: '新功能上线！现在可以直接分享到Twitter...',
  },
} as const;

export const PLATFORM_GUIDELINES: Record<ContentPlatform, {
  maxLength: number;
  language: 'zh' | 'en' | 'both';
  tone: string;
  hashtagStyle: string;
  bestTimes: string[];
}> = {
  twitter: {
    maxLength: 280,
    language: 'en',
    tone: 'Conversational, witty, direct',
    hashtagStyle: '1-2 relevant hashtags at end',
    bestTimes: ['9:00 AM EST', '12:00 PM EST', '5:00 PM EST'],
  },
  xiaohongshu: {
    maxLength: 1000,
    language: 'zh',
    tone: '亲切、分享感、有emoji',
    hashtagStyle: '3-5个话题标签在文末',
    bestTimes: ['7:00 PM CST', '9:00 PM CST'],
  },
  jike: {
    maxLength: 2000,
    language: 'zh',
    tone: '真诚、有深度、略带思考',
    hashtagStyle: '1-2个话题标签或圈子',
    bestTimes: ['12:00 PM CST', '9:00 PM CST'],
  },
  linkedin: {
    maxLength: 1300,
    language: 'en',
    tone: 'Professional but personable, insight-driven',
    hashtagStyle: '3-5 relevant hashtags at end',
    bestTimes: ['7:00 AM EST', '12:00 PM EST'],
  },
};
