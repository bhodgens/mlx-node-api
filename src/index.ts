#!/usr/bin/env node
/**
 * MLX-Node API Server
 *
 * OpenAI-compatible HTTP server for MLX-Node models
 */

import { serve } from '@hono/node-server';
import { loadConfig, getVersion } from './config.js';
import { ModelRegistry } from './server/model-registry.js';
import { createApp } from './server/index.js';

interface CliArgs {
  help: boolean;
  version: boolean;
  config?: string;
  port?: number;
  host?: string;
}

/**
 * Parse CLI arguments
 */
function parseArgs(args: string[]): CliArgs {
  const result: CliArgs = {
    help: false,
    version: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '-h':
      case '--help':
        result.help = true;
        break;
      case '-v':
      case '--version':
        result.version = true;
        break;
      case '-c':
      case '--config':
        result.config = args[++i];
        break;
      case '-p':
      case '--port':
        result.port = parseInt(args[++i], 10);
        break;
      case '--host':
        result.host = args[++i];
        break;
      default:
        if (arg.startsWith('-')) {
          console.error(`Unknown option: ${arg}`);
          result.help = true;
        }
    }
  }

  return result;
}

/**
 * Show help message
 */
function showHelp(): void {
  console.log(`
MLX-Node API v${getVersion()}
OpenAI-compatible HTTP server for MLX-Node models

USAGE:
  mlx-node-api [options]

OPTIONS:
  -h, --help              Show this help message
  -v, --version           Show version
  -c, --config <path>     Path to config file (default: mlx.config.json)
  -p, --port <number>     Override port (default: 3000)
  --host <address>        Override host (default: 0.0.0.0)

ENVIRONMENT VARIABLES:
  PORT                    Server port
  HOST                    Server host
  MODEL_PATH              Path to model (single model mode)
  MODEL_NAME              Model name (single model mode)
  MLX_CONFIG              Path to config file

EXAMPLES:
  mlx-node-api
  mlx-node-api --port 8080
  mlx-node-api --config ./my-config.json
  mlx-node-api --host 127.0.0.1 --port 3000

For more information, visit https://github.com/your-org/mlx-node-api
`);
}

/**
 * Show version
 */
function showVersion(): void {
  console.log(`mlx-node-api v${getVersion()}`);
}

async function main() {
  // Parse CLI arguments
  const args = parseArgs(process.argv.slice(2));

  // Handle flags that exit immediately
  if (args.help) {
    showHelp();
    process.exit(0);
  }

  if (args.version) {
    showVersion();
    process.exit(0);
  }

  const config = loadConfig({
    port: args.port,
    host: args.host,
    configPath: args.config,
  });
  const modelRegistry = new ModelRegistry();

  console.log('🚀 Starting MLX-Node API Server...');

  // Load models
  console.log(`\n📦 Loading ${config.models.length} model(s)...`);
  try {
    await modelRegistry.loadModels(config.models);
  } catch (error) {
    console.error('Failed to load models:', error);
    process.exit(1);
  }

  // Create and start server
  const app = createApp(config, modelRegistry);

  const server = serve({
    fetch: app.fetch,
    port: config.port,
    hostname: config.host,
  });

  console.log(`\n✅ Server running at http://${config.host}:${config.port}`);
  console.log(`\nAvailable models:`);
  for (const model of modelRegistry.listModels()) {
    console.log(`  - ${model.name}${model.default ? ' (default)' : ''}`);
  }
  console.log(`\nExample curl command:`);
  console.log(`  curl http://localhost:${config.port}/v1/models`);
  console.log(`\nPress Ctrl+C to stop.\n`);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down server...');
    server.close();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
