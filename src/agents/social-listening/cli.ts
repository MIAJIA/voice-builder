#!/usr/bin/env npx tsx
/**
 * Social Listening Agent CLI
 *
 * Run this script to start the social listening agent.
 *
 * Usage:
 *   npx tsx src/agents/social-listening/cli.ts [command]
 *
 * Commands:
 *   start     Start the agent in continuous mode
 *   once      Run a single scan
 *   setup     Show setup instructions
 *   test      Test the configuration
 */

import { createAgentFromEnv, getNotionSetupInstructions, getSlackSetupInstructions } from './index';

async function main() {
  const command = process.argv[2] || 'once';

  switch (command) {
    case 'setup':
      console.log('=== Social Listening Agent Setup ===\n');
      console.log(getNotionSetupInstructions());
      console.log('\n---\n');
      console.log(getSlackSetupInstructions());
      console.log('\n---\n');
      console.log('Environment Variables Required:');
      console.log('  ANTHROPIC_API_KEY      - Claude API key');
      console.log('  NOTION_API_KEY         - Notion integration token');
      console.log('  NOTION_LEADS_DATABASE_ID - Notion database ID');
      console.log('  APIFY_API_TOKEN        - Apify API token (for scraping)');
      console.log('  SLACK_WEBHOOK_URL      - (Optional) Slack webhook URL');
      break;

    case 'test':
      console.log('Testing configuration...\n');
      const testAgent = createAgentFromEnv();
      if (testAgent) {
        console.log('✅ Configuration valid');
        console.log('✅ Agent created successfully');
      } else {
        console.log('❌ Configuration invalid. Run `setup` to see requirements.');
        process.exit(1);
      }
      break;

    case 'once':
      console.log('Running single scan...\n');
      const onceAgent = createAgentFromEnv();
      if (!onceAgent) {
        console.log('Failed to create agent. Run `setup` to see requirements.');
        process.exit(1);
      }
      const stats = await onceAgent.runOnce();
      console.log('\n=== Scan Results ===');
      console.log(`  Posts found:    ${stats.found}`);
      console.log(`  Leads qualified: ${stats.qualified}`);
      console.log(`  Leads saved:    ${stats.saved}`);
      if (stats.errors.length > 0) {
        console.log(`  Errors:         ${stats.errors.length}`);
        stats.errors.forEach((e) => console.log(`    - ${e}`));
      }
      break;

    case 'start':
      console.log('Starting continuous mode...\n');
      console.log('Press Ctrl+C to stop.\n');
      const startAgent = createAgentFromEnv();
      if (!startAgent) {
        console.log('Failed to create agent. Run `setup` to see requirements.');
        process.exit(1);
      }

      // Handle graceful shutdown
      process.on('SIGINT', () => {
        console.log('\nReceived SIGINT, stopping agent...');
        startAgent.stop();
        process.exit(0);
      });

      process.on('SIGTERM', () => {
        console.log('\nReceived SIGTERM, stopping agent...');
        startAgent.stop();
        process.exit(0);
      });

      await startAgent.start();
      break;

    default:
      console.log('Unknown command:', command);
      console.log('Available commands: start, once, setup, test');
      process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
