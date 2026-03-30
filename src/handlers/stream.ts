/**
 * Streaming chat completion handler
 */

import type { TrainableModel, ChatConfig, ChatMessage, ChatStreamEvent } from '@mlx-node/lm';
import { Qwen35Model, Qwen35MoeModel } from '@mlx-node/lm';
import type { OpenAIChatCompletionRequest } from '../types/openai.js';
import { generateId, toOpenAIStreamChunk, createDoneChunk, formatSSE } from '../mappers/response.js';

/**
 * Handle streaming chat completion
 *
 * Returns an async generator that yields SSE-formatted chunks
 */
export async function* handleChatCompletionStream(
  model: TrainableModel,
  req: OpenAIChatCompletionRequest,
  messages: ChatMessage[],
  config: ChatConfig,
): AsyncGenerator<string, void, unknown> {
  const id = generateId();
  const modelName = req.model;
  let isFirstChunk = true;

  // The Qwen35Model and Qwen35MoeModel wrappers have AsyncGenerator-based chatStream
  // We need to use instanceof to check and cast appropriately
  if (!(model instanceof Qwen35Model || model instanceof Qwen35MoeModel)) {
    throw new Error('Streaming is only supported for Qwen35Model and Qwen35MoeModel');
  }

  const streamModel = model as Qwen35Model | Qwen35MoeModel;

  try {
    for await (const event of streamModel.chatStream(messages, config)) {
      if (event.done) {
        // Send final chunk with finish_reason
        const finalChunk = toOpenAIStreamChunk(event, id, modelName, false);
        yield formatSSE(finalChunk);

        // Send [DONE] to end the stream
        yield createDoneChunk();
        return;
      }

      // Send delta chunk with content
      const deltaChunk = toOpenAIStreamChunk(event, id, modelName, isFirstChunk);
      yield formatSSE(deltaChunk);

      isFirstChunk = false;
    }
  } catch (error) {
    // Handle streaming errors
    const errorChunk = {
      id,
      object: 'chat.completion.chunk' as const,
      created: Math.floor(Date.now() / 1000),
      model: modelName,
      choices: [
        {
          index: 0,
          delta: {},
          finish_reason: 'stop' as const,
        },
      ],
      error: error instanceof Error ? error.message : String(error),
    };
    yield formatSSE(errorChunk);
    yield createDoneChunk();
  }
}
