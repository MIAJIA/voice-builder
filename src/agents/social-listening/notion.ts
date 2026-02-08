/**
 * Notion Integration
 *
 * Saves leads to a Notion database for tracking and follow-up.
 */

import type { Lead, SocialPost, LeadAnalysis, Platform } from './types';
import { PLATFORM_CONFIGS } from './types';

// Notion API types (simplified for our use case)
interface NotionPage {
  id: string;
  properties: Record<string, unknown>;
}

interface NotionDatabaseEntry {
  parent: { database_id: string };
  properties: Record<string, unknown>;
}

/**
 * Notion Database Schema:
 *
 * Required columns in your Notion database:
 * - Author (title): Text
 * - Platform (select): twitter, jike, xiaohongshu
 * - Content (rich_text): Post content
 * - URL (url): Link to original post
 * - Match Score (number): 0-100
 * - User Type (select): knowledge_worker, creator, entrepreneur, student, other
 * - Pain Points (multi_select): Tags for identified pain points
 * - Outreach Suggestion (rich_text): How to approach
 * - Status (select): new, contacted, converted, not_interested, ignored
 * - Post Date (date): When the post was created
 * - Found Date (date): When we found it
 */

export class NotionClient {
  private apiKey: string;
  private databaseId: string;
  private baseUrl = 'https://api.notion.com/v1';

  constructor(apiKey: string, databaseId: string) {
    this.apiKey = apiKey;
    this.databaseId = databaseId;
  }

  async saveLead(post: SocialPost, analysis: LeadAnalysis): Promise<string> {
    const platformConfig = PLATFORM_CONFIGS[post.platform];

    const entry: NotionDatabaseEntry = {
      parent: { database_id: this.databaseId },
      properties: {
        Author: {
          title: [
            {
              text: {
                content: post.authorName + (post.authorHandle ? ` (@${post.authorHandle})` : ''),
              },
            },
          ],
        },
        Platform: {
          select: {
            name: `${platformConfig.emoji} ${platformConfig.name}`,
          },
        },
        Content: {
          rich_text: [
            {
              text: {
                content: post.content.slice(0, 2000), // Notion has a 2000 char limit per rich_text block
              },
            },
          ],
        },
        URL: {
          url: post.url,
        },
        'Match Score': {
          number: Math.round(analysis.matchScore * 100),
        },
        'User Type': {
          select: {
            name: this.formatUserType(analysis.userType),
          },
        },
        'Pain Points': {
          multi_select: analysis.painPoints.slice(0, 5).map((point) => ({
            name: point.slice(0, 100), // Notion tag length limit
          })),
        },
        'Outreach Suggestion': {
          rich_text: [
            {
              text: {
                content: analysis.outreachSuggestion.slice(0, 2000),
              },
            },
          ],
        },
        Status: {
          select: {
            name: '🆕 New',
          },
        },
        'Post Date': {
          date: {
            start: post.createdAt.toISOString().split('T')[0],
          },
        },
        'Found Date': {
          date: {
            start: new Date().toISOString().split('T')[0],
          },
        },
        Reasoning: {
          rich_text: [
            {
              text: {
                content: analysis.reasoning.slice(0, 2000),
              },
            },
          ],
        },
      },
    };

    const response = await fetch(`${this.baseUrl}/pages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify(entry),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to save to Notion: ${response.status} ${error}`);
    }

    const page = (await response.json()) as NotionPage;
    return page.id;
  }

  async checkDuplicate(postUrl: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/databases/${this.databaseId}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        filter: {
          property: 'URL',
          url: {
            equals: postUrl,
          },
        },
      }),
    });

    if (!response.ok) {
      console.error('Failed to check duplicate:', await response.text());
      return false;
    }

    const data = (await response.json()) as { results: unknown[] };
    return data.results.length > 0;
  }

  async updateStatus(pageId: string, status: Lead['status']): Promise<void> {
    const statusLabels: Record<Lead['status'], string> = {
      new: '🆕 New',
      contacted: '📨 Contacted',
      converted: '✅ Converted',
      not_interested: '❌ Not Interested',
      ignored: '⏭️ Ignored',
    };

    const response = await fetch(`${this.baseUrl}/pages/${pageId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        properties: {
          Status: {
            select: {
              name: statusLabels[status],
            },
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update status: ${response.status}`);
    }
  }

  private formatUserType(userType: LeadAnalysis['userType']): string {
    const labels: Record<LeadAnalysis['userType'], string> = {
      knowledge_worker: '👨‍💼 Knowledge Worker',
      creator: '✍️ Creator',
      entrepreneur: '🚀 Entrepreneur',
      student: '🎓 Student',
      other: '👤 Other',
    };
    return labels[userType] || labels.other;
  }
}

/**
 * Creates instructions for setting up the Notion database
 */
export function getNotionSetupInstructions(): string {
  return `
# Notion Database Setup for Social Listening Agent

Create a new database in Notion with the following properties:

| Property Name | Type | Options |
|---------------|------|---------|
| Author | Title | - |
| Platform | Select | 🐦 Twitter/X, ⚡ 即刻, 📕 小红书 |
| Content | Text | - |
| URL | URL | - |
| Match Score | Number | Format: Percentage |
| User Type | Select | 👨‍💼 Knowledge Worker, ✍️ Creator, 🚀 Entrepreneur, 🎓 Student, 👤 Other |
| Pain Points | Multi-select | (will be auto-created) |
| Outreach Suggestion | Text | - |
| Status | Select | 🆕 New, 📨 Contacted, ✅ Converted, ❌ Not Interested, ⏭️ Ignored |
| Post Date | Date | - |
| Found Date | Date | - |
| Reasoning | Text | - |

After creating the database:
1. Get your Notion API key from https://www.notion.so/my-integrations
2. Share the database with your integration
3. Copy the database ID from the URL (the part after notion.so/ and before ?)
4. Add these to your .env.local:
   NOTION_API_KEY=your_api_key
   NOTION_LEADS_DATABASE_ID=your_database_id
`.trim();
}
