/**
 * Content Generator Agent
 *
 * Main entry point for the weekly content generation agent.
 * Collects inputs from various sources and generates platform-specific
 * marketing content for Voice Builder.
 */

import type {
  ContentGeneratorConfig,
  WeeklyInputs,
  ContentBatch,
  FeedbackItem,
  UsageStats,
} from './types';
import { ContentGenerator } from './generator';

export class ContentGeneratorAgent {
  private generator: ContentGenerator;
  private config: ContentGeneratorConfig;

  constructor(config: ContentGeneratorConfig) {
    this.config = config;
    this.generator = new ContentGenerator(config);
  }

  /**
   * Collect inputs from all configured sources
   */
  async collectInputs(founderNotes: string[]): Promise<WeeklyInputs> {
    const inputs: WeeklyInputs = {
      userFeedback: [],
      usageStats: this.getDefaultStats(),
      founderNotes,
    };

    // Collect from Notion if configured
    if (this.config.notion) {
      try {
        inputs.userFeedback = await this.fetchNotionFeedback();
      } catch (error) {
        console.warn('[Content Generator] Failed to fetch Notion feedback:', error);
      }
    }

    // Collect from PostHog if configured
    if (this.config.posthog) {
      try {
        inputs.usageStats = await this.fetchPostHogStats();
      } catch (error) {
        console.warn('[Content Generator] Failed to fetch PostHog stats:', error);
      }
    }

    return inputs;
  }

  /**
   * Fetch feedback from Notion database
   */
  private async fetchNotionFeedback(): Promise<FeedbackItem[]> {
    if (!this.config.notion) return [];

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const response = await fetch(
      `https://api.notion.com/v1/databases/${this.config.notion.feedbackDatabaseId}/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.notion.apiKey}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28',
        },
        body: JSON.stringify({
          filter: {
            property: 'Submitted At',
            date: {
              after: oneWeekAgo.toISOString(),
            },
          },
          sorts: [
            {
              property: 'Submitted At',
              direction: 'descending',
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Notion API error: ${response.status}`);
    }

    interface NotionPage {
      properties: {
        Type?: { select?: { name?: string } };
        Content?: { rich_text?: Array<{ plain_text?: string }> };
        'Submitted At'?: { date?: { start?: string } };
      };
    }

    const data = (await response.json()) as { results: NotionPage[] };

    return data.results.map((page) => ({
      type: this.parseFeedbackType(page.properties.Type?.select?.name),
      content: page.properties.Content?.rich_text?.[0]?.plain_text || '',
      date: page.properties['Submitted At']?.date?.start || new Date().toISOString(),
    }));
  }

  private parseFeedbackType(type?: string): FeedbackItem['type'] {
    if (!type) return 'general';
    if (type.includes('Bug')) return 'bug';
    if (type.includes('Feature')) return 'feature';
    if (type.includes('Testimonial')) return 'testimonial';
    return 'general';
  }

  /**
   * Fetch usage stats from PostHog
   */
  private async fetchPostHogStats(): Promise<UsageStats> {
    if (!this.config.posthog) return this.getDefaultStats();

    // PostHog API integration
    // Note: This is a simplified example. Real implementation would use PostHog's query API.
    const baseUrl = 'https://app.posthog.com/api';

    try {
      // Fetch insights for the past week
      const response = await fetch(
        `${baseUrl}/projects/${this.config.posthog.projectId}/insights/trend/`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.config.posthog.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            date_from: '-7d',
            events: [
              { id: 'chat_started', type: 'events' },
              { id: 'transform_completed', type: 'events' },
            ],
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`PostHog API error: ${response.status}`);
      }

      interface PostHogInsight {
        result?: Array<{
          label?: string;
          data?: number[];
        }>;
      }

      const data = (await response.json()) as PostHogInsight;

      // Parse the results
      const chatData = data.result?.find((r) => r.label?.includes('chat_started'));
      const transformData = data.result?.find((r) => r.label?.includes('transform_completed'));

      return {
        totalConversations: chatData?.data?.reduce((a, b) => a + b, 0) || 0,
        totalTransforms: transformData?.data?.reduce((a, b) => a + b, 0) || 0,
        topPlatforms: [
          { platform: 'twitter', count: 0 },
          { platform: 'xiaohongshu', count: 0 },
        ],
        retentionRate: 0.4, // Placeholder
        newUsers: 0, // Would need separate query
      };
    } catch (error) {
      console.warn('[Content Generator] PostHog fetch failed:', error);
      return this.getDefaultStats();
    }
  }

  private getDefaultStats(): UsageStats {
    return {
      totalConversations: 0,
      totalTransforms: 0,
      topPlatforms: [],
      retentionRate: 0,
      newUsers: 0,
    };
  }

  /**
   * Generate weekly content batch
   */
  async generateWeeklyContent(founderNotes: string[]): Promise<ContentBatch> {
    console.log('[Content Generator] Collecting inputs...');
    const inputs = await this.collectInputs(founderNotes);

    console.log('[Content Generator] Input summary:');
    console.log(`  - Feedback items: ${inputs.userFeedback.length}`);
    console.log(`  - Founder notes: ${inputs.founderNotes.length}`);
    console.log(`  - Total conversations: ${inputs.usageStats.totalConversations}`);

    console.log('[Content Generator] Generating content batch...');
    const batch = await this.generator.generateWeeklyBatch(inputs);

    console.log('[Content Generator] Content batch generated:');
    console.log(`  - Ideas: ${batch.ideas.length}`);
    console.log(`  - Content pieces: ${batch.content.length}`);

    return batch;
  }

  /**
   * Save content batch to Notion (if configured)
   */
  async saveToNotion(batch: ContentBatch): Promise<void> {
    if (!this.config.notion?.contentDatabaseId) {
      console.warn('[Content Generator] Notion content database not configured');
      return;
    }

    for (const content of batch.content) {
      await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.notion.apiKey}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28',
        },
        body: JSON.stringify({
          parent: { database_id: this.config.notion.contentDatabaseId },
          properties: {
            Title: {
              title: [{ text: { content: content.metadata.sourceIdea } }],
            },
            Platform: {
              select: { name: content.platform },
            },
            Content: {
              rich_text: [{ text: { content: content.content } }],
            },
            'Suggested Time': {
              rich_text: [{ text: { content: content.suggestedTime || '' } }],
            },
            Status: {
              select: { name: 'Draft' },
            },
            'Week Of': {
              date: { start: batch.weekOf },
            },
          },
        }),
      });
    }

    console.log(`[Content Generator] Saved ${batch.content.length} items to Notion`);
  }
}

/**
 * Create agent from environment variables
 */
export function createAgentFromEnv(): ContentGeneratorAgent | null {
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

  if (!anthropicApiKey) {
    console.error('Missing ANTHROPIC_API_KEY');
    return null;
  }

  const config: ContentGeneratorConfig = {
    anthropic: {
      apiKey: anthropicApiKey,
    },
    platforms: ['twitter', 'xiaohongshu', 'jike'],
  };

  // Optional Notion integration
  if (process.env.NOTION_API_KEY && process.env.NOTION_FEEDBACK_DATABASE_ID) {
    config.notion = {
      apiKey: process.env.NOTION_API_KEY,
      feedbackDatabaseId: process.env.NOTION_FEEDBACK_DATABASE_ID,
      contentDatabaseId: process.env.NOTION_CONTENT_DATABASE_ID || '',
    };
  }

  // Optional PostHog integration
  if (process.env.POSTHOG_API_KEY && process.env.POSTHOG_PROJECT_ID) {
    config.posthog = {
      apiKey: process.env.POSTHOG_API_KEY,
      projectId: process.env.POSTHOG_PROJECT_ID,
    };
  }

  return new ContentGeneratorAgent(config);
}

// Re-export types
export * from './types';
