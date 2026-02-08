/**
 * Notion Feedback Integration
 *
 * Provides functionality to submit user feedback to a Notion database.
 * Supports bug reports, feature requests, and testimonials.
 */

export type FeedbackType = 'bug' | 'feature' | 'testimonial' | 'general';
export type FeedbackSource = 'in-app' | 'social' | 'direct' | 'email';

export interface FeedbackSubmission {
  type: FeedbackType;
  content: string;
  userContact?: string;
  source: FeedbackSource;
  metadata?: {
    page?: string;
    userAgent?: string;
    screenSize?: string;
    sessionId?: string;
  };
}

export interface NotionFeedbackConfig {
  apiKey: string;
  databaseId: string;
}

const FEEDBACK_TYPE_LABELS: Record<FeedbackType, string> = {
  bug: '🐛 Bug Report',
  feature: '💡 Feature Request',
  testimonial: '⭐ Testimonial',
  general: '💬 General Feedback',
};

const FEEDBACK_SOURCE_LABELS: Record<FeedbackSource, string> = {
  'in-app': '📱 In-App',
  social: '🌐 Social Media',
  direct: '💬 Direct Message',
  email: '📧 Email',
};

export class NotionFeedbackClient {
  private apiKey: string;
  private databaseId: string;
  private baseUrl = 'https://api.notion.com/v1';

  constructor(config: NotionFeedbackConfig) {
    this.apiKey = config.apiKey;
    this.databaseId = config.databaseId;
  }

  async submitFeedback(feedback: FeedbackSubmission): Promise<{ success: boolean; pageId?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/pages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28',
        },
        body: JSON.stringify({
          parent: { database_id: this.databaseId },
          properties: {
            Title: {
              title: [
                {
                  text: {
                    content: this.generateTitle(feedback),
                  },
                },
              ],
            },
            Type: {
              select: {
                name: FEEDBACK_TYPE_LABELS[feedback.type],
              },
            },
            Content: {
              rich_text: [
                {
                  text: {
                    content: feedback.content.slice(0, 2000),
                  },
                },
              ],
            },
            'User Contact': {
              rich_text: feedback.userContact
                ? [
                    {
                      text: {
                        content: feedback.userContact.slice(0, 200),
                      },
                    },
                  ]
                : [],
            },
            Source: {
              select: {
                name: FEEDBACK_SOURCE_LABELS[feedback.source],
              },
            },
            Status: {
              select: {
                name: '🆕 New',
              },
            },
            'Submitted At': {
              date: {
                start: new Date().toISOString(),
              },
            },
            ...(feedback.metadata?.page && {
              Page: {
                rich_text: [
                  {
                    text: {
                      content: feedback.metadata.page,
                    },
                  },
                ],
              },
            }),
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Notion API error:', error);
        return { success: false, error: `Notion API error: ${response.status}` };
      }

      const data = (await response.json()) as { id: string };
      return { success: true, pageId: data.id };
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      return { success: false, error: String(error) };
    }
  }

  private generateTitle(feedback: FeedbackSubmission): string {
    const prefix = feedback.type === 'bug' ? '[Bug]' : feedback.type === 'feature' ? '[Feature]' : '';
    const contentPreview = feedback.content.slice(0, 50).replace(/\n/g, ' ');
    return `${prefix} ${contentPreview}${feedback.content.length > 50 ? '...' : ''}`.trim();
  }
}

/**
 * Instructions for setting up the Notion feedback database
 */
export function getNotionFeedbackSetupInstructions(): string {
  return `
# Notion Feedback Database Setup

Create a new database in Notion with the following properties:

| Property Name | Type | Options |
|---------------|------|---------|
| Title | Title | - |
| Type | Select | 🐛 Bug Report, 💡 Feature Request, ⭐ Testimonial, 💬 General Feedback |
| Content | Text | - |
| User Contact | Text | - |
| Source | Select | 📱 In-App, 🌐 Social Media, 💬 Direct Message, 📧 Email |
| Status | Select | 🆕 New, 👀 Reviewing, ✅ Addressed, ⏭️ Won't Fix |
| Submitted At | Date | - |
| Page | Text | - |

After creating the database:
1. Get your Notion API key from https://www.notion.so/my-integrations
2. Share the database with your integration
3. Copy the database ID from the URL
4. Add to your .env.local:
   NOTION_API_KEY=your_api_key (if not already set)
   NOTION_FEEDBACK_DATABASE_ID=your_feedback_database_id
`.trim();
}
