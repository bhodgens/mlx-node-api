/**
 * GET /v1/models endpoint
 * Lists available models
 */

import { Hono } from 'hono';
import type { OpenAIModelsResponse, OpenAIModel } from '../types/openai.js';
import { getTimestamp } from '../mappers/response.js';
import type { ModelRegistry } from '../server/model-registry.js';

// Claude model IDs to expose as aliases to the default model
const CLAUDE_MODEL_ALIASES = [
  'claude-opus-4-5-20211101',
  'claude-opus-4-6',
  'claude-sonnet-4-6',
  'claude-3-5-sonnet-20241022',
  'claude-3-5-sonnet-20240620',
  'claude-3-opus-20240229',
];

export function createModelsRoute(modelRegistry: ModelRegistry) {
  const app = new Hono();

  app.get('/', (c) => {
    const models = modelRegistry.listModels();
    const defaultModel = modelRegistry.getDefaultModel();

    const response: OpenAIModelsResponse = {
      object: 'list',
      data: [
        // Actual loaded models
        ...models.map(
          (m): OpenAIModel => ({
            id: m.name,
            object: 'model',
            created: getTimestamp(),
            owned_by: 'mlx-node',
          }),
        ),
        // Claude model aliases (if we have a default model)
        ...(defaultModel
          ? CLAUDE_MODEL_ALIASES.map(
              (id): OpenAIModel => ({
                id,
                object: 'model',
                created: getTimestamp(),
                owned_by: 'anthropic',
              }),
            )
          : []),
      ],
    };

    return c.json(response);
  });

  return app;
}
