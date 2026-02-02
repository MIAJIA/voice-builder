#!/usr/bin/env npx tsx
/**
 * Content Generator Agent CLI
 *
 * Run this script to generate weekly marketing content.
 *
 * Usage:
 *   npx tsx src/agents/content-generator/cli.ts [command] [options]
 *
 * Commands:
 *   generate    Generate a weekly content batch
 *   ideas       Generate just the content ideas
 *   setup       Show setup instructions
 *
 * Options:
 *   --notes "note1" "note2"    Founder notes to include
 *   --output <file>            Save output to file (default: stdout)
 *   --save-notion              Save to Notion (requires config)
 */

import { createAgentFromEnv, ContentGeneratorAgent } from './index';

async function main() {
  const command = process.argv[2] || 'generate';
  const args = process.argv.slice(3);

  // Parse options
  const notes: string[] = [];
  let outputFile: string | null = null;
  let saveToNotion = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--notes') {
      // Collect all notes until next flag
      i++;
      while (i < args.length && !args[i].startsWith('--')) {
        notes.push(args[i]);
        i++;
      }
      i--; // Back up since loop will increment
    } else if (args[i] === '--output') {
      outputFile = args[++i];
    } else if (args[i] === '--save-notion') {
      saveToNotion = true;
    }
  }

  switch (command) {
    case 'setup':
      showSetupInstructions();
      break;

    case 'ideas':
      await runIdeasOnly(notes);
      break;

    case 'generate':
      await runGenerate(notes, outputFile, saveToNotion);
      break;

    default:
      console.log('Unknown command:', command);
      console.log('Available commands: generate, ideas, setup');
      process.exit(1);
  }
}

function showSetupInstructions() {
  console.log(`
# Content Generator Agent Setup

## Required Environment Variables
ANTHROPIC_API_KEY=your_anthropic_api_key

## Optional: Notion Integration
NOTION_API_KEY=your_notion_api_key
NOTION_FEEDBACK_DATABASE_ID=your_feedback_database_id
NOTION_CONTENT_DATABASE_ID=your_content_database_id

## Optional: PostHog Integration (for usage stats)
POSTHOG_API_KEY=your_posthog_api_key
POSTHOG_PROJECT_ID=your_project_id

## Usage Examples

# Generate content with founder notes
pnpm agent:content-generator generate --notes "Shipped image export" "Got great feedback on co-think"

# Just generate ideas
pnpm agent:content-generator ideas --notes "Week 2 insights"

# Save output to file
pnpm agent:content-generator generate --notes "Note 1" --output content.json

# Save to Notion
pnpm agent:content-generator generate --notes "Note 1" --save-notion
  `.trim());
}

async function runIdeasOnly(notes: string[]) {
  const agent = createAgentFromEnv();
  if (!agent) {
    console.error('Failed to create agent. Run "setup" to see requirements.');
    process.exit(1);
  }

  console.log('Collecting inputs and generating ideas...\n');

  const inputs = await agent.collectInputs(notes);

  // Use generator directly for just ideas
  const { ContentGenerator } = await import('./generator');
  const generator = new ContentGenerator({
    anthropic: { apiKey: process.env.ANTHROPIC_API_KEY! },
    platforms: ['twitter', 'xiaohongshu', 'jike'],
  });

  const ideas = await generator.generateIdeas(inputs);

  console.log('=== Generated Content Ideas ===\n');
  ideas.forEach((idea, i) => {
    console.log(`${i + 1}. [${idea.angle}] ${idea.topic}`);
    console.log(`   Hook: "${idea.hook}"`);
    console.log(`   Key points:`);
    idea.keyPoints.forEach((p) => console.log(`     - ${p}`));
    console.log(`   Target: ${idea.targetAudience}`);
    if (idea.callToAction) console.log(`   CTA: ${idea.callToAction}`);
    console.log();
  });
}

async function runGenerate(notes: string[], outputFile: string | null, saveToNotion: boolean) {
  const agent = createAgentFromEnv();
  if (!agent) {
    console.error('Failed to create agent. Run "setup" to see requirements.');
    process.exit(1);
  }

  console.log('Generating weekly content batch...\n');

  const batch = await agent.generateWeeklyContent(notes.length > 0 ? notes : [
    'No specific notes this week - generate based on general themes',
  ]);

  // Output results
  if (outputFile) {
    const fs = await import('fs');
    fs.writeFileSync(outputFile, JSON.stringify(batch, null, 2));
    console.log(`\nContent saved to: ${outputFile}`);
  } else {
    console.log('\n=== Generated Content Batch ===\n');
    console.log(`Week of: ${batch.weekOf}`);
    console.log(`Status: ${batch.status}`);
    console.log(`Ideas: ${batch.ideas.length}`);
    console.log(`Content pieces: ${batch.content.length}\n`);

    console.log('--- Content Preview ---\n');
    batch.content.forEach((content, i) => {
      console.log(`[${content.platform.toUpperCase()}] ${content.metadata.sourceIdea}`);
      console.log('-'.repeat(50));
      console.log(content.content);
      if (content.suggestedTime) {
        console.log(`\nSuggested time: ${content.suggestedTime}`);
      }
      console.log('\n');
    });
  }

  // Save to Notion if requested
  if (saveToNotion) {
    console.log('Saving to Notion...');
    await agent.saveToNotion(batch);
    console.log('Done!');
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
