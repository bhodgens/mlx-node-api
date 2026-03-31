/**
 * POST /v1/messages endpoint
 * Anthropic-compatible Messages API
 */

import { Hono } from 'hono';
import type { AnthropicMessageRequest } from '../types/anthropic.js';
import { createAnthropicErrorResponse } from '../types/anthropic.js';
import { mapAnthropicMessages, mapAnthropicConfig } from '../mappers/anthropic-request.js';
import {
  toAnthropicResponse,
  AnthropicStreamEncoder,
} from '../mappers/anthropic-response.js';
import type { ModelRegistry } from '../server/model-registry.js';

export function createMessagesRoute(modelRegistry: ModelRegistry) {
  const app = new Hono();

  app.post('/', async (c) => {
    const startTime = Date.now();
    let generatedTokens = 0;

    try {
      const req = (await c.req.json()) as AnthropicMessageRequest;

      // Validate request
      if (!req.model) {
        return c.json(
          createAnthropicErrorResponse('model is required', 'invalid_request_error'),
          400,
        );
      }
      if (!req.messages || !Array.isArray(req.messages)) {
        return c.json(
          createAnthropicErrorResponse('messages must be an array', 'invalid_request_error'),
          400,
        );
      }
      if (req.max_tokens === undefined) {
        return c.json(
          createAnthropicErrorResponse('max_tokens is required', 'invalid_request_error'),
          400,
        );
      }

      // Get model
      const modelEntry = modelRegistry.getModel(req.model);
      if (!modelEntry) {
        return c.json(
          createAnthropicErrorResponse(
            `Model '${req.model}' not found. Available models: ${modelRegistry.listModels().map((m) => m.name).join(', ')}`,
            'invalid_request_error',
            404,
          ),
          404,
        );
      }

      const { model, name: modelName } = modelEntry;

      // Map Anthropic request to MLX-Node format
      const messages = mapAnthropicMessages(req.messages, req.system);
      const config = mapAnthropicConfig(req);

      // Handle streaming vs non-streaming
      if (req.stream === true) {
        // Return SSE stream
        const encoder = new AnthropicStreamEncoder(req.model);

        return c.newResponse(
          new ReadableStream({
            async start(controller) {
              const textEncoder = new TextEncoder();
              let streamedChars = 0;

              try {
                // Check if model supports streaming
                const hasChatStream = typeof (model as any).chatStream === 'function';

                if (!hasChatStream) {
                  throw new Error('Streaming is not supported for this model');
                }

                // Send message_start event
                controller.enqueue(textEncoder.encode(encoder.messageStart()));
                controller.enqueue(textEncoder.encode(encoder.contentBlockStart()));

                // Stream the response
                const stream = (model as any).chatStream(messages, config);

                for await (const event of stream) {
                  if (event.text) {
                    streamedChars += event.text.length;
                    controller.enqueue(
                      textEncoder.encode(encoder.contentBlockDelta(event.text)),
                    );
                  }

                  if (event.done) {
                    generatedTokens = event.numTokens || 0;
                    controller.enqueue(textEncoder.encode(encoder.contentBlockStop()));
                    controller.enqueue(
                      textEncoder.encode(
                        encoder.messageDelta(
                          event.finishReason === 'length'
                            ? 'max_tokens'
                            : 'end_turn',
                          generatedTokens,
                        ),
                      ),
                    );
                    controller.enqueue(textEncoder.encode(encoder.messageStop()));
                    break;
                  }
                }

                // Log metrics
                const elapsed = Date.now() - startTime;
                const tokensPerSec = generatedTokens > 0 ? (generatedTokens / (elapsed / 1000)).toFixed(2) : '0';
                console.log(
                  `[Messages API] ${modelName} | ${generatedTokens} tokens | ${elapsed}ms | ${tokensPerSec} tok/s | streaming`,
                );
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
        const result = await model.chat(messages, config);
        generatedTokens = result.numTokens || 0;
        const response = toAnthropicResponse(result, req.model);

        const elapsed = Date.now() - startTime;
        const tokensPerSec = generatedTokens > 0 ? (generatedTokens / (elapsed / 1000)).toFixed(2) : '0';
        console.log(
          `[Messages API] ${modelName} | ${generatedTokens} tokens | ${elapsed}ms | ${tokensPerSec} tok/s | non-streaming`,
        );

        return c.json(response);
      }
    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.error(`Error in messages completion (${elapsed}ms):`, error);
      return c.json(
        createAnthropicErrorResponse(
          error instanceof Error ? error.message : 'Unknown error',
          'internal_error',
          500,
        ),
        500,
      );
    }
  });

  return app;
}
