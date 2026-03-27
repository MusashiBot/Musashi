#!/usr/bin/env node

import { config } from 'dotenv';
import { MusashiMCPServer } from './server.js';

/**
 * Musashi MCP Server Entry Point
 *
 * Usage:
 *   musashi-mcp                    Start server with stdio transport
 *   MUSASHI_API_KEYS=xxx musashi-mcp  Start with API key auth
 */

// Load environment variables
config();

/**
 * Main function
 */
async function main() {
  try {
    console.error('[Musashi] Initializing MCP server...');

    // Create and start server
    const server = new MusashiMCPServer();
    await server.start();

    // Log startup info
    console.error('[Musashi] Server running on stdio transport');
    console.error('[Musashi] Ready to receive requests');

    // Log initial stats
    const stats = server.getStats();
    console.error('[Musashi] Cache:', JSON.stringify(stats.cache, null, 2));
    console.error('[Musashi] Auth:', JSON.stringify(stats.auth, null, 2));

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.error('[Musashi] Shutting down...');
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.error('[Musashi] Shutting down...');
      process.exit(0);
    });
  } catch (error) {
    console.error('[Musashi] Failed to start server:', error);
    process.exit(1);
  }
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('[Musashi] Unhandled error:', error);
    process.exit(1);
  });
}

// Export for programmatic use
export { MusashiMCPServer } from './server.js';
export * from './types/index.js';
export * from './tools/index.js';
export * from './resources/index.js';
export * from './prompts/index.js';
