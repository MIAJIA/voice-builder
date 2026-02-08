/**
 * Social Listening Agent
 *
 * Main entry point for the social listening agent that:
 * 1. Scrapes social media platforms for target keywords
 * 2. Analyzes posts using Claude to identify potential leads
 * 3. Saves qualified leads to Notion
 * 4. Notifies via Slack for high-quality leads
 */

import type { SocialListeningConfig, SocialPost, Lead, Platform } from './types';
import { DEFAULT_KEYWORDS } from './types';
import { LeadAnalyzer } from './analyzer';
import { NotionClient, getNotionSetupInstructions } from './notion';
import { SlackNotifier, getSlackSetupInstructions } from './slack';
import { createScrapers, type Scraper } from './scrapers';

export class SocialListeningAgent {
  private config: SocialListeningConfig;
  private analyzer: LeadAnalyzer;
  private notion: NotionClient;
  private slack?: SlackNotifier;
  private scrapers: Scraper[];
  private isRunning = false;

  constructor(config: SocialListeningConfig) {
    this.config = config;
    this.analyzer = new LeadAnalyzer({ anthropic: config.anthropic });
    this.notion = new NotionClient(config.notion.apiKey, config.notion.databaseId);

    if (config.slack?.webhookUrl) {
      this.slack = new SlackNotifier(config.slack.webhookUrl);
    }

    // Initialize scrapers - requires APIFY_API_TOKEN
    const apifyToken = process.env.APIFY_API_TOKEN;
    if (!apifyToken) {
      console.warn('APIFY_API_TOKEN not set. Scrapers will not work.');
      this.scrapers = [];
    } else {
      this.scrapers = createScrapers(apifyToken).filter((s) =>
        config.platforms.includes(s.platform)
      );
    }
  }

  /**
   * Run a single iteration of the agent
   */
  async runOnce(): Promise<{
    found: number;
    qualified: number;
    saved: number;
    errors: string[];
  }> {
    const stats = {
      found: 0,
      qualified: 0,
      saved: 0,
      errors: [] as string[],
    };

    console.log(`[Social Listening] Starting scan for keywords: ${this.config.keywords.join(', ')}`);

    for (const scraper of this.scrapers) {
      console.log(`[Social Listening] Scraping ${scraper.platform}...`);

      try {
        const posts = await scraper.scrape(this.config.keywords);
        stats.found += posts.length;
        console.log(`[Social Listening] Found ${posts.length} posts on ${scraper.platform}`);

        for (const post of posts) {
          try {
            // Check for duplicates
            const isDuplicate = await this.notion.checkDuplicate(post.url);
            if (isDuplicate) {
              console.log(`[Social Listening] Skipping duplicate: ${post.url}`);
              continue;
            }

            // Analyze the post
            const analysis = await this.analyzer.analyze(post);
            console.log(
              `[Social Listening] Analyzed post from ${post.authorName}: score=${analysis.matchScore}`
            );

            // Only process posts above minimum score
            if (analysis.matchScore >= this.config.minMatchScore) {
              stats.qualified++;

              // Save to Notion
              const notionPageId = await this.notion.saveLead(post, analysis);
              stats.saved++;
              console.log(`[Social Listening] Saved lead to Notion: ${notionPageId}`);

              // Notify Slack for high-quality leads (>= 0.7)
              if (this.slack && analysis.matchScore >= 0.7) {
                const notionUrl = `https://notion.so/${notionPageId.replace(/-/g, '')}`;
                await this.slack.notifyNewLead(post, analysis, notionUrl);
                console.log(`[Social Listening] Sent Slack notification for high-quality lead`);
              }
            }
          } catch (error) {
            const errMsg = `Error processing post ${post.id}: ${error}`;
            console.error(`[Social Listening] ${errMsg}`);
            stats.errors.push(errMsg);
          }

          // Rate limiting: wait between API calls
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error) {
        const errMsg = `Error scraping ${scraper.platform}: ${error}`;
        console.error(`[Social Listening] ${errMsg}`);
        stats.errors.push(errMsg);
      }
    }

    console.log(`[Social Listening] Scan complete. Found: ${stats.found}, Qualified: ${stats.qualified}, Saved: ${stats.saved}`);
    return stats;
  }

  /**
   * Run the agent continuously
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('[Social Listening] Agent is already running');
      return;
    }

    this.isRunning = true;
    console.log(`[Social Listening] Agent started. Interval: ${this.config.checkIntervalMs}ms`);

    while (this.isRunning) {
      await this.runOnce();

      if (this.isRunning) {
        console.log(
          `[Social Listening] Waiting ${this.config.checkIntervalMs / 1000}s until next scan...`
        );
        await new Promise((resolve) => setTimeout(resolve, this.config.checkIntervalMs));
      }
    }
  }

  /**
   * Stop the agent
   */
  stop(): void {
    this.isRunning = false;
    console.log('[Social Listening] Agent stopped');
  }

  /**
   * Send daily summary to Slack
   */
  async sendDailySummary(): Promise<void> {
    if (!this.slack) {
      console.warn('[Social Listening] Slack not configured, cannot send summary');
      return;
    }

    // TODO: Query Notion for today's leads and compile stats
    // For now, this is a placeholder
    console.log('[Social Listening] Daily summary not yet implemented');
  }
}

/**
 * Create agent from environment variables
 */
export function createAgentFromEnv(): SocialListeningAgent | null {
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  const notionApiKey = process.env.NOTION_API_KEY;
  const notionDatabaseId = process.env.NOTION_LEADS_DATABASE_ID;
  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!anthropicApiKey) {
    console.error('Missing ANTHROPIC_API_KEY');
    return null;
  }

  if (!notionApiKey || !notionDatabaseId) {
    console.error('Missing NOTION_API_KEY or NOTION_LEADS_DATABASE_ID');
    console.log('\n' + getNotionSetupInstructions());
    return null;
  }

  const config: SocialListeningConfig = {
    keywords: DEFAULT_KEYWORDS,
    platforms: ['twitter', 'jike', 'xiaohongshu'],
    minMatchScore: 0.5,
    checkIntervalMs: 3600000, // 1 hour
    notion: {
      apiKey: notionApiKey,
      databaseId: notionDatabaseId,
    },
    slack: slackWebhookUrl ? { webhookUrl: slackWebhookUrl } : undefined,
    anthropic: {
      apiKey: anthropicApiKey,
    },
  };

  return new SocialListeningAgent(config);
}

// Re-export types and utilities
export * from './types';
export { getNotionSetupInstructions } from './notion';
export { getSlackSetupInstructions } from './slack';
