/**
 * POST /v1/chat/completions endpoint
 * OpenAI-compatible chat completions
 */

import { Hono } from 'hono';
import type { OpenAIChatCompletionRequest } from '../types/openai.js';
import { createOpenAIErrorResponse } from '../types/openai.js';
import { mapMessages, mapConfig } from '../mappers/request.js';
import { handleChatCompletion } from '../handlers/completion.js';
import { handleChatCompletionStream } from '../handlers/stream.js';
import type { ModelRegistry } from '../server/model-registry.js';
import type { ModelWithMetadata } from '../server/model-registry.js';

export function createChatRoute(modelRegistry: ModelRegistry) {
  const app = new Hono();

  app.post('/', async (c) => {
    try {
      const req = (await c.req.json()) as OpenAIChatCompletionRequest;

      // Validate request
      if (!req.model) {
        return c.json(createOpenAIErrorResponse('model is required'), 400);
      }
      if (!req.messages || !Array.isArray(req.messages)) {
        return c.json(createOpenAIErrorResponse('messages must be an array'), 400);
      }

      // Get model
      const modelEntry = modelRegistry.getModel(req.model);
      if (!modelEntry) {
        return c.json(
          createOpenAIErrorResponse(
            `Model '${req.model}' not found. Available models: ${modelRegistry.listModels().map((m) => m.name).join(', ')}`,
            'model_not_found',
            404,
          ),
          404,
        );
      }

      const { model } = modelEntry;

      // Map request to MLX-Node format
      const messages = mapMessages(req.messages);
      const config = mapConfig(req);

      // Handle streaming vs non-streaming
      if (req.stream === true) {
        // Return SSE stream
        const stream = handleChatCompletionStream(model, req, messages, config);

        return c.newResponse(
          new ReadableStream({
            async start(controller) {
              const encoder = new TextEncoder();
              try {
                for await (const chunk of stream) {
                  controller.enqueue(encoder.encode(chunk));
                }
              } catch (error) {
                controller.error(error);
              } finally {
                controller.close();
              }
            },
          }),
          {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              Connection: 'keep-alive',
            },
          },
        );
      } else {
        // Non-streaming response
        const response = await handleChatCompletion(model, req, messages, config);
        return c.json(response);
      }
    } catch (error) {
      console.error('Error in chat completion:', error);
      return c.json(
        createOpenAIErrorResponse(
          error instanceof Error ? error.message : 'Unknown error',
          'server_error',
          500,
        ),
        500,
      );
    }
  });

  return app;
}
