/**
 * Main server application
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { ServerConfig } from '../config.js';
import { ModelRegistry } from './model-registry.js';
import { createChatRoute } from '../routes/chat.js';
import { createModelsRoute } from '../routes/models.js';
import { createMessagesRoute } from '../routes/messages.js';
import type { OpenAIErrorResponse } from '../types/openai.js';

export function createApp(config: ServerConfig, modelRegistry: ModelRegistry) {
  const app = new Hono();

  // Middleware
  app.use('*', logger());
  app.use(
    '*',
    cors({
      origin: config.cors.origin,
      allowHeaders: ['Content-Type', 'Authorization'],
      allowMethods: ['GET', 'POST', 'OPTIONS'],
    }),
  );

  // Health check endpoint
  app.get('/health', (c) => {
    return c.json({
      status: 'ok',
      models: modelRegistry.size(),
      timestamp: Date.now(),
    });
  });

  // Root endpoint
  app.get('/', (c) => {
    return c.json({
      name: 'mlx-node-api',
      version: '0.1.0',
      description: 'OpenAI-compatible API for MLX-Node',
      models: modelRegistry.listModels().map((m) => m.name),
    });
  });

  // OpenAI-compatible routes
  const appV1 = new Hono();
  appV1.route('/chat/completions', createChatRoute(modelRegistry));
  appV1.route('/models', createModelsRoute(modelRegistry));

  // Anthropic-compatible routes
  appV1.route('/messages', createMessagesRoute(modelRegistry));

  app.route('/v1', appV1);

  // 404 handler
  app.notFound((c) => {
    const error: OpenAIErrorResponse = {
      error: {
        message: 'Not found',
        type: 'invalid_request_error',
      },
    };
    return c.json(error, 404);
  });

  // Error handler
  app.onError((err, c) => {
    console.error('Server error:', err);
    const error: OpenAIErrorResponse = {
      error: {
        message: err.message,
        type: 'server_error',
      },
    };
    return c.json(error, 500);
  });

  return app;
}
