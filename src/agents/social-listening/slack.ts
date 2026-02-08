/**
 * Slack Notifications
 *
 * Sends notifications to Slack when high-quality leads are found.
 */

import type { SocialPost, LeadAnalysis, Platform } from './types';
import { PLATFORM_CONFIGS } from './types';

interface SlackMessage {
  text: string;
  blocks?: SlackBlock[];
  unfurl_links?: boolean;
}

interface SlackBlock {
  type: 'section' | 'divider' | 'context' | 'actions' | 'header';
  text?: {
    type: 'mrkdwn' | 'plain_text';
    text: string;
  };
  fields?: Array<{
    type: 'mrkdwn' | 'plain_text';
    text: string;
  }>;
  elements?: Array<{
    type: 'mrkdwn' | 'plain_text' | 'button';
    text?: string | { type: string; text: string };
    url?: string;
    action_id?: string;
  }>;
}

export class SlackNotifier {
  private webhookUrl: string;

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }

  async notifyNewLead(
    post: SocialPost,
    analysis: LeadAnalysis,
    notionPageUrl?: string
  ): Promise<void> {
    const platformConfig = PLATFORM_CONFIGS[post.platform];
    const scoreEmoji = this.getScoreEmoji(analysis.matchScore);

    const message: SlackMessage = {
      text: `New lead found on ${platformConfig.name}! Match score: ${Math.round(analysis.matchScore * 100)}%`,
      unfurl_links: false,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${scoreEmoji} New Lead Found!`,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Platform:*\n${platformConfig.emoji} ${platformConfig.name}`,
            },
            {
              type: 'mrkdwn',
              text: `*Match Score:*\n${Math.round(analysis.matchScore * 100)}%`,
            },
            {
              type: 'mrkdwn',
              text: `*User Type:*\n${this.formatUserType(analysis.userType)}`,
            },
            {
              type: 'mrkdwn',
              text: `*Author:*\n${post.authorName}${post.authorHandle ? ` (@${post.authorHandle})` : ''}`,
            },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Post Content:*\n>${this.truncate(post.content, 500).replace(/\n/g, '\n>')}`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Pain Points:*\n${analysis.painPoints.map((p) => `• ${p}`).join('\n')}`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Outreach Suggestion:*\n${analysis.outreachSuggestion}`,
          },
        },
        {
          type: 'divider',
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '📱 View Original Post',
              },
              url: post.url,
              action_id: 'view_post',
            },
            ...(notionPageUrl
              ? [
                  {
                    type: 'button' as const,
                    text: {
                      type: 'plain_text' as const,
                      text: '📝 View in Notion',
                    },
                    url: notionPageUrl,
                    action_id: 'view_notion',
                  },
                ]
              : []),
          ],
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `_Found at ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Shanghai' })} (Asia/Shanghai)_`,
            },
          ],
        },
      ],
    };

    const response = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      throw new Error(`Failed to send Slack notification: ${response.status}`);
    }
  }

  async notifyDailySummary(stats: {
    totalFound: number;
    highQuality: number;
    byPlatform: Record<Platform, number>;
    topLeads: Array<{ author: string; score: number; platform: Platform }>;
  }): Promise<void> {
    const message: SlackMessage = {
      text: `Daily Social Listening Summary: Found ${stats.totalFound} potential leads`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '📊 Daily Social Listening Summary',
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Total Found:*\n${stats.totalFound}`,
            },
            {
              type: 'mrkdwn',
              text: `*High Quality (>70%):*\n${stats.highQuality}`,
            },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*By Platform:*\n${Object.entries(stats.byPlatform)
              .map(([platform, count]) => {
                const config = PLATFORM_CONFIGS[platform as Platform];
                return `${config.emoji} ${config.name}: ${count}`;
              })
              .join('\n')}`,
          },
        },
        ...(stats.topLeads.length > 0
          ? [
              {
                type: 'section' as const,
                text: {
                  type: 'mrkdwn' as const,
                  text: `*Top Leads:*\n${stats.topLeads
                    .map((lead, i) => {
                      const config = PLATFORM_CONFIGS[lead.platform];
                      return `${i + 1}. ${lead.author} (${config.emoji} ${Math.round(lead.score * 100)}%)`;
                    })
                    .join('\n')}`,
                },
              },
            ]
          : []),
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `_Report generated at ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Shanghai' })}_`,
            },
          ],
        },
      ],
    };

    const response = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      throw new Error(`Failed to send Slack summary: ${response.status}`);
    }
  }

  private getScoreEmoji(score: number): string {
    if (score >= 0.9) return '🔥';
    if (score >= 0.8) return '⭐';
    if (score >= 0.7) return '✨';
    return '📌';
  }

  private formatUserType(userType: LeadAnalysis['userType']): string {
    const labels: Record<LeadAnalysis['userType'], string> = {
      knowledge_worker: 'Knowledge Worker',
      creator: 'Creator',
      entrepreneur: 'Entrepreneur',
      student: 'Student',
      other: 'Other',
    };
    return labels[userType] || 'Other';
  }

  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
  }
}

/**
 * Instructions for setting up Slack webhook
 */
export function getSlackSetupInstructions(): string {
  return `
# Slack Webhook Setup for Social Listening Agent

1. Go to https://api.slack.com/apps and create a new app
2. Choose "From scratch" and name it "Voice Builder Leads"
3. Select your workspace
4. Go to "Incoming Webhooks" and enable them
5. Click "Add New Webhook to Workspace"
6. Choose the channel where you want lead notifications
7. Copy the webhook URL
8. Add to your .env.local:
   SLACK_WEBHOOK_URL=your_webhook_url

Optional: Create a dedicated #voice-builder-leads channel for notifications.
`.trim();
}
