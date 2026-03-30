/**
 * Non-streaming chat completion handler
 */

import type { TrainableModel } from '@mlx-node/lm';
import type { ChatConfig, ChatMessage } from '@mlx-node/lm';
import type {
  OpenAIChatCompletionRequest,
  OpenAIChatCompletionResponse,
} from '../types/openai.js';
import { generateId, toOpenAIResponse } from '../mappers/response.js';

/**
 * Handle non-streaming chat completion
 */
export async function handleChatCompletion(
  model: TrainableModel,
  req: OpenAIChatCompletionRequest,
  messages: ChatMessage[],
  config: ChatConfig,
): Promise<OpenAIChatCompletionResponse> {
  const id = generateId();
  const modelName = req.model;

  // Call MLX-Node's chat method
  const result = await model.chat(messages, config);

  // Note: MLX-Node doesn't provide input token count directly
  // We would need to use a tokenizer for accurate counting
  // For now, we'll estimate or return 0
  const inputTokens = 0;

  return toOpenAIResponse(result, id, modelName, inputTokens);
}
