/**
 * Social Listening Agent Types
 *
 * Types for the social listening agent that monitors social media
 * for potential Voice Builder target users.
 */

export type Platform = 'twitter' | 'jike' | 'xiaohongshu';

export interface SocialPost {
  id: string;
  platform: Platform;
  authorId: string;
  authorName: string;
  authorHandle?: string;
  content: string;
  url: string;
  createdAt: Date;
  engagement?: {
    likes?: number;
    comments?: number;
    reposts?: number;
  };
}

export interface LeadAnalysis {
  matchScore: number; // 0-1, how well this matches our target user
  userType: 'knowledge_worker' | 'creator' | 'entrepreneur' | 'student' | 'other';
  painPoints: string[];
  outreachSuggestion: string;
  reasoning: string;
}

export interface Lead {
  post: SocialPost;
  analysis: LeadAnalysis;
  status: 'new' | 'contacted' | 'converted' | 'not_interested' | 'ignored';
  notionPageId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SocialListeningConfig {
  keywords: string[];
  platforms: Platform[];
  minMatchScore: number;
  checkIntervalMs: number;
  notion: {
    databaseId: string;
    apiKey: string;
  };
  slack?: {
    webhookUrl: string;
    channelId?: string;
  };
  anthropic: {
    apiKey: string;
  };
}

export const DEFAULT_KEYWORDS = [
  // Chinese keywords
  '想写但',
  '一直想发',
  '不敢发',
  '完美主义',
  '输出焦虑',
  '冒名顶替',
  '想法太多',
  '不知道怎么写',
  '写不出来',
  '害怕被人看',
  // English keywords
  "want to write but",
  "afraid to post",
  "perfectionism",
  "imposter syndrome",
  "output anxiety",
  "can't finish writing",
];

export const PLATFORM_CONFIGS: Record<Platform, { name: string; emoji: string }> = {
  twitter: { name: 'Twitter/X', emoji: '🐦' },
  jike: { name: '即刻', emoji: '⚡' },
  xiaohongshu: { name: '小红书', emoji: '📕' },
};
