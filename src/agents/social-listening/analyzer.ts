/**
 * Lead Analyzer
 *
 * Uses Claude to analyze social media posts and determine if they
 * match Voice Builder's target user profile.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { SocialPost, LeadAnalysis, Platform, SocialListeningConfig } from './types';
import { PLATFORM_CONFIGS } from './types';

const ANALYSIS_PROMPT = `You are analyzing a social media post to determine if the author is a potential target user for Voice Builder.

Voice Builder's target users:
1. **Primary**: Knowledge workers who have ideas but struggle to share them
   - Have professional expertise
   - Often think "I should write about this"
   - Struggle with perfectionism or impostor syndrome
   - Fear being criticized or judged

2. **Secondary**: Content creators who want to find their authentic voice
   - Already creating content
   - Feel their content is too "AI-sounding" or inauthentic
   - Want to maintain their unique perspective

Analyze this post and return a JSON response:

Post Details:
- Platform: {{platform}}
- Author: {{author}}
- Content: {{content}}
- Engagement: {{engagement}}

Return ONLY valid JSON in this exact format:
{
  "matchScore": <number 0-1>,
  "userType": "<knowledge_worker|creator|entrepreneur|student|other>",
  "painPoints": ["<pain point 1>", "<pain point 2>"],
  "outreachSuggestion": "<how to approach this person>",
  "reasoning": "<why this person is/isn't a good match>"
}

Match Score Guidelines:
- 0.9-1.0: Perfect match - explicitly mentions output anxiety/perfectionism
- 0.7-0.9: Strong match - shows signs of wanting to share but holding back
- 0.5-0.7: Moderate match - discusses content creation struggles
- 0.3-0.5: Weak match - tangentially related
- 0.0-0.3: Not a match - different problem or context`;

export class LeadAnalyzer {
  private client: Anthropic;

  constructor(config: Pick<SocialListeningConfig, 'anthropic'>) {
    this.client = new Anthropic({
      apiKey: config.anthropic.apiKey,
    });
  }

  async analyze(post: SocialPost): Promise<LeadAnalysis> {
    const platformConfig = PLATFORM_CONFIGS[post.platform];

    const prompt = ANALYSIS_PROMPT
      .replace('{{platform}}', platformConfig.name)
      .replace('{{author}}', post.authorName + (post.authorHandle ? ` (@${post.authorHandle})` : ''))
      .replace('{{content}}', post.content)
      .replace('{{engagement}}', this.formatEngagement(post.engagement));

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    try {
      // Extract JSON from potential markdown code blocks
      let jsonText = textContent.text.trim();
      const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1].trim();
      }

      const analysis = JSON.parse(jsonText) as LeadAnalysis;

      // Validate required fields
      if (
        typeof analysis.matchScore !== 'number' ||
        !analysis.userType ||
        !Array.isArray(analysis.painPoints) ||
        !analysis.outreachSuggestion ||
        !analysis.reasoning
      ) {
        throw new Error('Invalid analysis response structure');
      }

      // Clamp matchScore to valid range
      analysis.matchScore = Math.max(0, Math.min(1, analysis.matchScore));

      return analysis;
    } catch (error) {
      console.error('Failed to parse Claude response:', textContent.text);
      throw new Error(`Failed to parse analysis: ${error}`);
    }
  }

  private formatEngagement(engagement?: SocialPost['engagement']): string {
    if (!engagement) return 'No engagement data';

    const parts: string[] = [];
    if (engagement.likes !== undefined) parts.push(`${engagement.likes} likes`);
    if (engagement.comments !== undefined) parts.push(`${engagement.comments} comments`);
    if (engagement.reposts !== undefined) parts.push(`${engagement.reposts} reposts`);

    return parts.length > 0 ? parts.join(', ') : 'No engagement data';
  }
}
