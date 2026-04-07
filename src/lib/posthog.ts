/**
 * PostHog Analytics
 *
 * User behavior tracking for Voice Builder.
 * Tracks key events to understand user engagement and conversion.
 */

import posthog from 'posthog-js';

// Event names for type safety
export const EVENTS = {
  // Onboarding
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_STEP_COMPLETED: 'onboarding_step_completed',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  ONBOARDING_SKIPPED: 'onboarding_skipped',

  // Co-think (Chat)
  CHAT_STARTED: 'chat_started',
  CHAT_MESSAGE_SENT: 'chat_message_sent',
  CHAT_COMPLETED: 'chat_completed',
  CHAT_IMAGE_ATTACHED: 'chat_image_attached',

  // Transform
  TRANSFORM_STARTED: 'transform_started',
  TRANSFORM_COMPLETED: 'transform_completed',
  TRANSFORM_COPIED: 'transform_copied',
  TRANSFORM_SHARED: 'transform_shared',

  // Image Generation
  IMAGE_GENERATED: 'image_generated',
  IMAGE_DOWNLOADED: 'image_downloaded',
  IMAGE_COPIED: 'image_copied',

  // Profile
  PROFILE_UPDATED: 'profile_updated',
  PERSONA_CREATED: 'persona_created',
  PERSONA_UPDATED: 'persona_updated',

  // Engagement
  CONVERSATION_DELETED: 'conversation_deleted',
  RATE_LIMIT_HIT: 'rate_limit_hit',

  // Viral/Growth
  SHARE_BUTTON_CLICKED: 'share_button_clicked',
  REFERRAL_CODE_USED: 'referral_code_used',

  // Feedback
  FEEDBACK_SUBMITTED: 'feedback_submitted',
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];

// Platform types for analytics
export type Platform = 'twitter' | 'xiaohongshu' | 'wechat' | 'linkedin' | 'video';
export type ContentAngle =
  | 'sharing'
  | 'asking'
  | 'opinion'
  | 'casual'
  | 'roast'
  | 'teaching'
  | 'story';
export type Audience = 'peers' | 'beginners' | 'leadership' | 'friends';

interface AnalyticsConfig {
  posthogKey?: string;
  posthogHost?: string;
  debug?: boolean;
}

class Analytics {
  private initialized = false;

  init(config: AnalyticsConfig = {}): void {
    if (this.initialized) return;
    if (typeof window === 'undefined') return;

    const key = config.posthogKey || process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = config.posthogHost || process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

    if (!key) {
      if (config.debug) {
        console.warn('[Analytics] PostHog key not configured, analytics disabled');
      }
      return;
    }

    posthog.init(key, {
      api_host: host,
      loaded: (posthog) => {
        if (config.debug && process.env.NODE_ENV === 'development') {
          posthog.debug();
        }
      },
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: false, // We'll track events manually for better control
      persistence: 'localStorage',
    });

    this.initialized = true;
  }

  /**
   * Track a custom event
   */
  track(event: EventName, properties?: Record<string, unknown>): void {
    if (!this.initialized) return;
    posthog.capture(event, properties);
  }

  /**
   * Identify a user (for future auth integration)
   */
  identify(userId: string, traits?: Record<string, unknown>): void {
    if (!this.initialized) return;
    posthog.identify(userId, traits);
  }

  /**
   * Reset user identity (on logout)
   */
  reset(): void {
    if (!this.initialized) return;
    posthog.reset();
  }

  /**
   * Set user properties
   */
  setUserProperties(properties: Record<string, unknown>): void {
    if (!this.initialized) return;
    posthog.people.set(properties);
  }

  // ========== Convenience Methods ==========

  // Onboarding
  trackOnboardingStarted(): void {
    this.track(EVENTS.ONBOARDING_STARTED);
  }

  trackOnboardingStep(step: number, stepName: string): void {
    this.track(EVENTS.ONBOARDING_STEP_COMPLETED, { step, stepName });
  }

  trackOnboardingCompleted(): void {
    this.track(EVENTS.ONBOARDING_COMPLETED);
  }

  trackOnboardingSkipped(atStep: number): void {
    this.track(EVENTS.ONBOARDING_SKIPPED, { atStep });
  }

  // Chat
  trackChatStarted(hasImage: boolean = false): void {
    this.track(EVENTS.CHAT_STARTED, { hasImage });
  }

  trackChatMessage(messageCount: number, hasImage: boolean = false): void {
    this.track(EVENTS.CHAT_MESSAGE_SENT, { messageCount, hasImage });
  }

  trackChatCompleted(messageCount: number, durationMs: number): void {
    this.track(EVENTS.CHAT_COMPLETED, { messageCount, durationMs });
  }

  trackChatImageAttached(): void {
    this.track(EVENTS.CHAT_IMAGE_ATTACHED);
  }

  // Transform
  trackTransformStarted(platform: Platform, options?: { angle?: ContentAngle; audience?: Audience }): void {
    this.track(EVENTS.TRANSFORM_STARTED, { platform, ...options });
  }

  trackTransformCompleted(
    platform: Platform,
    options?: { angle?: ContentAngle; audience?: Audience; length?: string }
  ): void {
    this.track(EVENTS.TRANSFORM_COMPLETED, { platform, ...options });
  }

  trackTransformCopied(platform: Platform): void {
    this.track(EVENTS.TRANSFORM_COPIED, { platform });
  }

  trackTransformShared(platform: Platform, destination: 'twitter' | 'clipboard' | 'other'): void {
    this.track(EVENTS.TRANSFORM_SHARED, { platform, destination });
  }

  // Image
  trackImageGenerated(style: string): void {
    this.track(EVENTS.IMAGE_GENERATED, { style });
  }

  trackImageDownloaded(): void {
    this.track(EVENTS.IMAGE_DOWNLOADED);
  }

  trackImageCopied(): void {
    this.track(EVENTS.IMAGE_COPIED);
  }

  // Profile
  trackProfileUpdated(fields: string[]): void {
    this.track(EVENTS.PROFILE_UPDATED, { fields });
  }

  trackPersonaCreated(platform: Platform): void {
    this.track(EVENTS.PERSONA_CREATED, { platform });
  }

  trackPersonaUpdated(platform: Platform): void {
    this.track(EVENTS.PERSONA_UPDATED, { platform });
  }

  // Engagement
  trackConversationDeleted(): void {
    this.track(EVENTS.CONVERSATION_DELETED);
  }

  trackRateLimitHit(limitType: 'chat' | 'transform' | 'image'): void {
    this.track(EVENTS.RATE_LIMIT_HIT, { limitType });
  }

  // Viral/Growth
  trackShareButtonClicked(platform: Platform): void {
    this.track(EVENTS.SHARE_BUTTON_CLICKED, { platform });
  }

  trackReferralCodeUsed(code: string): void {
    this.track(EVENTS.REFERRAL_CODE_USED, { code });
  }

  // Feedback
  trackFeedbackSubmitted(type: string): void {
    this.track(EVENTS.FEEDBACK_SUBMITTED, { type });
  }
}

// Singleton instance
export const analytics = new Analytics();
