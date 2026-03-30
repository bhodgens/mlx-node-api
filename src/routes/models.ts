/**
 * GET /v1/models endpoint
 * Lists available models
 */

import { Hono } from 'hono';
import type { OpenAIModelsResponse, OpenAIModel } from '../types/openai.js';
import { getTimestamp } from '../mappers/response.js';
import type { ModelRegistry } from '../server/model-registry.js';

export function createModelsRoute(modelRegistry: ModelRegistry) {
  const app = new Hono();

  app.get('/', (c) => {
    const models = modelRegistry.listModels();

    const response: OpenAIModelsResponse = {
      object: 'list',
      data: models.map(
        (m): OpenAIModel => ({
          id: m.name,
          object: 'model',
          created: getTimestamp(),
          owned_by: 'mlx-node',
        }),
      ),
    };

    return c.json(response);
  });

  return app;
}
