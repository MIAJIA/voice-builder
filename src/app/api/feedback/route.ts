import { NextRequest, NextResponse } from 'next/server';
import { NotionFeedbackClient, type FeedbackSubmission } from '@/lib/notion-feedback';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as FeedbackSubmission;

    // Validate required fields
    if (!body.content || !body.type) {
      return NextResponse.json(
        { error: 'Missing required fields: content and type are required' },
        { status: 400 }
      );
    }

    // Check for Notion configuration
    const notionApiKey = process.env.NOTION_API_KEY;
    const notionDatabaseId = process.env.NOTION_FEEDBACK_DATABASE_ID;

    if (!notionApiKey || !notionDatabaseId) {
      // Log feedback locally if Notion is not configured
      console.log('[Feedback] Received (Notion not configured):', {
        type: body.type,
        content: body.content.slice(0, 100),
        source: body.source,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: 'Feedback received (stored locally)',
      });
    }

    // Submit to Notion
    const client = new NotionFeedbackClient({
      apiKey: notionApiKey,
      databaseId: notionDatabaseId,
    });

    const result = await client.submitFeedback({
      ...body,
      source: body.source || 'in-app',
    });

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to submit feedback', details: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Feedback submitted successfully',
    });
  } catch (error) {
    console.error('Feedback API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
