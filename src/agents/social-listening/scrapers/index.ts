/**
 * Social Media Scrapers
 *
 * Abstract interface for platform-specific scrapers.
 * Each platform has its own implementation that fetches posts
 * matching our target keywords.
 */

import type { SocialPost, Platform } from '../types';

export interface Scraper {
  platform: Platform;
  scrape(keywords: string[]): Promise<SocialPost[]>;
}

/**
 * Twitter Scraper using Apify
 *
 * Uses Apify's Twitter Scraper actor to fetch tweets.
 * Requires APIFY_API_TOKEN environment variable.
 */
export class TwitterScraper implements Scraper {
  platform: Platform = 'twitter';
  private apifyToken: string;

  constructor(apifyToken: string) {
    this.apifyToken = apifyToken;
  }

  async scrape(keywords: string[]): Promise<SocialPost[]> {
    // Using Apify Twitter Scraper actor
    // https://apify.com/apify/twitter-scraper

    const searchQuery = keywords.map((k) => `"${k}"`).join(' OR ');

    const input = {
      searchTerms: [searchQuery],
      maxItems: 50,
      addUserInfo: true,
      scrapeTweetReplies: false,
    };

    try {
      // Start the actor run
      const runResponse = await fetch(
        `https://api.apify.com/v2/acts/apify~twitter-scraper/runs?token=${this.apifyToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        }
      );

      if (!runResponse.ok) {
        throw new Error(`Apify run failed: ${runResponse.status}`);
      }

      const run = (await runResponse.json()) as { data: { id: string } };
      const runId = run.data.id;

      // Poll for completion
      let status = 'RUNNING';
      while (status === 'RUNNING' || status === 'READY') {
        await new Promise((resolve) => setTimeout(resolve, 5000));

        const statusResponse = await fetch(
          `https://api.apify.com/v2/actor-runs/${runId}?token=${this.apifyToken}`
        );
        const statusData = (await statusResponse.json()) as { data: { status: string } };
        status = statusData.data.status;
      }

      if (status !== 'SUCCEEDED') {
        throw new Error(`Apify run ended with status: ${status}`);
      }

      // Get results
      const resultsResponse = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${this.apifyToken}`
      );
      const tweets = (await resultsResponse.json()) as Array<{
        id: string;
        full_text?: string;
        text?: string;
        url: string;
        created_at: string;
        user?: {
          id_str: string;
          name: string;
          screen_name: string;
        };
        author?: {
          id: string;
          name: string;
          userName: string;
        };
        favorite_count?: number;
        reply_count?: number;
        retweet_count?: number;
        likeCount?: number;
        replyCount?: number;
        retweetCount?: number;
      }>;

      return tweets.map((tweet) => ({
        id: tweet.id,
        platform: 'twitter' as Platform,
        authorId: tweet.user?.id_str || tweet.author?.id || '',
        authorName: tweet.user?.name || tweet.author?.name || 'Unknown',
        authorHandle: tweet.user?.screen_name || tweet.author?.userName,
        content: tweet.full_text || tweet.text || '',
        url: tweet.url || `https://twitter.com/i/status/${tweet.id}`,
        createdAt: new Date(tweet.created_at),
        engagement: {
          likes: tweet.favorite_count ?? tweet.likeCount,
          comments: tweet.reply_count ?? tweet.replyCount,
          reposts: tweet.retweet_count ?? tweet.retweetCount,
        },
      }));
    } catch (error) {
      console.error('Twitter scraping failed:', error);
      return [];
    }
  }
}

/**
 * 即刻 (Jike) Scraper
 *
 * Uses Apify or custom scraper for Jike posts.
 * Note: Jike may require authentication for full access.
 */
export class JikeScraper implements Scraper {
  platform: Platform = 'jike';
  private apifyToken: string;

  constructor(apifyToken: string) {
    this.apifyToken = apifyToken;
  }

  async scrape(keywords: string[]): Promise<SocialPost[]> {
    // Jike doesn't have an official API
    // Options:
    // 1. Use a custom Apify actor (if available)
    // 2. Build a custom scraper using Browserless/Puppeteer
    // 3. Use web search as a proxy

    // For MVP, we'll log a warning and return empty
    // TODO: Implement proper Jike scraping
    console.warn('Jike scraper not fully implemented. Consider building a custom Apify actor.');

    // Placeholder using web search as fallback
    const searchQuery = keywords.map((k) => `site:okjike.com "${k}"`).join(' OR ');

    try {
      // Use a web search actor as proxy
      const input = {
        queries: searchQuery,
        maxPagesPerQuery: 1,
        resultsPerPage: 20,
      };

      const runResponse = await fetch(
        `https://api.apify.com/v2/acts/apify~google-search-scraper/runs?token=${this.apifyToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        }
      );

      if (!runResponse.ok) {
        console.warn('Jike search failed, returning empty results');
        return [];
      }

      const run = (await runResponse.json()) as { data: { id: string } };
      const runId = run.data.id;

      // Poll for completion (simplified)
      await new Promise((resolve) => setTimeout(resolve, 30000));

      const resultsResponse = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${this.apifyToken}`
      );
      const results = (await resultsResponse.json()) as Array<{
        title?: string;
        url?: string;
        description?: string;
      }>;

      // Convert search results to SocialPost format
      return results
        .filter((r) => r.url?.includes('okjike.com'))
        .map((result, index) => ({
          id: `jike-search-${index}`,
          platform: 'jike' as Platform,
          authorId: 'unknown',
          authorName: result.title?.split(' ')[0] || 'Unknown',
          content: result.description || result.title || '',
          url: result.url || '',
          createdAt: new Date(),
        }));
    } catch (error) {
      console.error('Jike scraping failed:', error);
      return [];
    }
  }
}

/**
 * 小红书 (Xiaohongshu) Scraper
 *
 * Note: Xiaohongshu has strict anti-scraping measures.
 * Consider using official API partnerships for production.
 */
export class XiaohongshuScraper implements Scraper {
  platform: Platform = 'xiaohongshu';
  private apifyToken: string;

  constructor(apifyToken: string) {
    this.apifyToken = apifyToken;
  }

  async scrape(keywords: string[]): Promise<SocialPost[]> {
    // Xiaohongshu is notoriously difficult to scrape
    // Options:
    // 1. Official API (requires business partnership)
    // 2. Apify actor (may have reliability issues)
    // 3. Manual collection + Notion form

    console.warn(
      'Xiaohongshu scraper has limited reliability. Consider manual collection for high-quality leads.'
    );

    try {
      // Try using an Apify actor if available
      // Many Xiaohongshu scrapers are community-contributed
      const input = {
        keywords: keywords,
        maxItems: 30,
      };

      // Note: Replace with actual Xiaohongshu scraper actor if available
      const runResponse = await fetch(
        `https://api.apify.com/v2/acts/curious_coder~xiaohongshu-scraper/runs?token=${this.apifyToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        }
      );

      if (!runResponse.ok) {
        // Fallback to search-based approach
        return this.searchFallback(keywords);
      }

      const run = (await runResponse.json()) as { data: { id: string } };
      const runId = run.data.id;

      // Poll for completion
      await new Promise((resolve) => setTimeout(resolve, 60000));

      const resultsResponse = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${this.apifyToken}`
      );
      const posts = (await resultsResponse.json()) as Array<{
        id: string;
        author?: { id: string; nickname: string };
        content?: string;
        title?: string;
        url?: string;
        created_at?: string;
        liked_count?: number;
        comment_count?: number;
        collected_count?: number;
      }>;

      return posts.map((post) => ({
        id: post.id,
        platform: 'xiaohongshu' as Platform,
        authorId: post.author?.id || '',
        authorName: post.author?.nickname || 'Unknown',
        content: post.content || post.title || '',
        url: post.url || `https://www.xiaohongshu.com/explore/${post.id}`,
        createdAt: post.created_at ? new Date(post.created_at) : new Date(),
        engagement: {
          likes: post.liked_count,
          comments: post.comment_count,
          reposts: post.collected_count,
        },
      }));
    } catch (error) {
      console.error('Xiaohongshu scraping failed:', error);
      return [];
    }
  }

  private async searchFallback(keywords: string[]): Promise<SocialPost[]> {
    // Use web search as fallback
    console.log('Using search fallback for Xiaohongshu');
    return [];
  }
}

/**
 * Creates all scrapers with the given config
 */
export function createScrapers(apifyToken: string): Scraper[] {
  return [
    new TwitterScraper(apifyToken),
    new JikeScraper(apifyToken),
    new XiaohongshuScraper(apifyToken),
  ];
}
