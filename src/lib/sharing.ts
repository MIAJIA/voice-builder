/**
 * Viral Sharing Utilities
 *
 * Provides functionality for viral sharing including:
 * - Attribution tagging ("Made with @VoiceBuilder")
 * - Referral code generation and tracking
 * - Platform-specific share URLs
 */

import type { Platform } from './store';

// Voice Builder attribution
const VOICE_BUILDER_TAG = '\n\n— Made with Voice Builder';
const VOICE_BUILDER_TWITTER_TAG = '\n\n— Made with @VoiceBuilder';
const VOICE_BUILDER_URL = 'https://voicebuilder.app'; // Update with actual URL

/**
 * Add Voice Builder attribution to content
 */
export function addAttribution(content: string, platform: Platform): string {
  // Don't add if already has attribution
  if (content.includes('Voice Builder') || content.includes('@VoiceBuilder')) {
    return content;
  }

  // Platform-specific attribution
  switch (platform) {
    case 'twitter':
      return content + VOICE_BUILDER_TWITTER_TAG;
    case 'linkedin':
      return content + VOICE_BUILDER_TAG;
    case 'xiaohongshu':
      return content + '\n\n— 用 Voice Builder 生成';
    case 'wechat':
      return content + '\n\n— Voice Builder 帮你说清楚';
    case 'video':
      return content;  // 视频大纲不加 attribution
    default:
      return content + VOICE_BUILDER_TAG;
  }
}

/**
 * Generate a referral code from user identifier
 */
export function generateReferralCode(userId: string): string {
  // Simple hash-based code generation
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `VB${Math.abs(hash).toString(36).toUpperCase().slice(0, 6)}`;
}

/**
 * Get share URL for a specific platform
 */
export function getShareUrl(
  platform: Platform,
  content: string,
  options?: {
    referralCode?: string;
    includeAttribution?: boolean;
  }
): { url: string; message?: string } {
  const { referralCode, includeAttribution = true } = options || {};

  // Add attribution if requested
  const shareContent = includeAttribution ? addAttribution(content, platform) : content;

  // Add referral link if code provided
  const referralUrl = referralCode
    ? `${VOICE_BUILDER_URL}?ref=${referralCode}`
    : VOICE_BUILDER_URL;

  switch (platform) {
    case 'twitter': {
      const tweetText = shareContent;
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
      return { url: twitterUrl };
    }

    case 'linkedin': {
      // LinkedIn share URL (posts to feed)
      const linkedinUrl = `https://www.linkedin.com/feed/?shareActive=true`;
      return {
        url: linkedinUrl,
        message: '已复制内容！请在 LinkedIn 中粘贴发布',
      };
    }

    case 'xiaohongshu': {
      // No direct share URL, copy to clipboard
      return {
        url: '',
        message: '已复制！请打开小红书 App 粘贴发布',
      };
    }

    case 'wechat': {
      // No direct share URL, copy to clipboard
      return {
        url: '',
        message: '已复制！请打开微信朋友圈粘贴发布',
      };
    }

    case 'video': {
      return {
        url: '',
        message: '已复制口播大纲！',
      };
    }

    default:
      return { url: '' };
  }
}

/**
 * Referral reward tiers
 */
export const REFERRAL_REWARDS = {
  3: {
    name: 'Early Adopter',
    description: '解锁高级功能试用',
    features: ['无限 Co-think', '优先反馈处理'],
  },
  10: {
    name: 'Voice Ambassador',
    description: '获得 1 个月 Pro 会员',
    features: ['所有 Pro 功能', '专属 badge'],
  },
  25: {
    name: 'Voice Champion',
    description: '永久 Pro 会员 + 专属感谢',
    features: ['永久 Pro', '产品方向投票权', '官方感谢名单'],
  },
} as const;

/**
 * Calculate referral progress and rewards
 */
export function calculateReferralProgress(inviteCount: number): {
  currentTier: keyof typeof REFERRAL_REWARDS | null;
  nextTier: keyof typeof REFERRAL_REWARDS | null;
  progress: number;
  remainingForNext: number;
} {
  const tiers = Object.keys(REFERRAL_REWARDS).map(Number).sort((a, b) => a - b) as Array<keyof typeof REFERRAL_REWARDS>;

  let currentTier: keyof typeof REFERRAL_REWARDS | null = null;
  let nextTier: keyof typeof REFERRAL_REWARDS | null = null;

  for (const tier of tiers) {
    if (inviteCount >= tier) {
      currentTier = tier;
    } else if (nextTier === null) {
      nextTier = tier;
    }
  }

  if (nextTier === null) {
    // All tiers achieved
    return {
      currentTier,
      nextTier: null,
      progress: 100,
      remainingForNext: 0,
    };
  }

  const previousTierThreshold = currentTier || 0;
  const progress = ((inviteCount - previousTierThreshold) / (nextTier - previousTierThreshold)) * 100;
  const remainingForNext = nextTier - inviteCount;

  return {
    currentTier,
    nextTier,
    progress: Math.min(progress, 100),
    remainingForNext,
  };
}

/**
 * Generate shareable referral link
 */
export function getReferralLink(referralCode: string): string {
  return `${VOICE_BUILDER_URL}?ref=${referralCode}`;
}

/**
 * Share messages templates for different contexts
 */
export const SHARE_TEMPLATES = {
  afterTransform: {
    zh: '我用 Voice Builder 把模糊的想法变成了清晰的表达！试试看：{url}',
    en: 'I used Voice Builder to turn my messy thoughts into clear content! Try it: {url}',
  },
  inviteFriend: {
    zh: '推荐你试试 Voice Builder - 帮你找到自己的 Voice，克服完美主义！用我的链接注册：{url}',
    en: 'Try Voice Builder - it helps you find your voice and overcome perfectionism! Sign up with my link: {url}',
  },
  testimonial: {
    zh: 'Voice Builder 帮我克服了输出焦虑，终于敢发帖了！{url}',
    en: 'Voice Builder helped me overcome my posting anxiety - I finally feel ready to share! {url}',
  },
} as const;
