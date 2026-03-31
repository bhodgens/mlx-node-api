/**
 * Map Anthropic request format to MLX-Node format
 */

import type { ChatConfig, ChatMessage } from '@mlx-node/lm';
import type { AnthropicMessageRequest, AnthropicMessage, AnthropicContentBlock } from '../types/anthropic.js';

/**
 * Map Anthropic messages to MLX-Node messages
 */
export function mapAnthropicMessages(
  anthropicMessages: AnthropicMessage[],
  systemPrompt?: string | AnthropicContentBlock[],
): ChatMessage[] {
  const result: ChatMessage[] = [];

  // Add system message if provided (Anthropic uses separate system field)
  if (systemPrompt) {
    // Handle both string and content blocks for system prompt
    const systemContent = typeof systemPrompt === 'string'
      ? systemPrompt
      : systemPrompt
          .filter((b): b is { type: 'text'; text: string } =>
            b.type === 'text' && typeof b.text === 'string',
          )
          .map((b) => b.text)
          .join('\n');

    result.push({
      role: 'system',
      content: systemContent,
    });
  }

  // Map remaining messages
  for (const msg of anthropicMessages) {
    // Handle both string content and content blocks
    const content = typeof msg.content === 'string'
      ? msg.content
      : msg.content
          .filter((b): b is { type: 'text'; text: string } =>
            b.type === 'text' && typeof b.text === 'string',
          )
          .map((b) => b.text)
          .join('\n');

    result.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content,
    });
  }

  return result;
}

/**
 * Map Anthropic request config to MLX-Node ChatConfig
 */
export function mapAnthropicConfig(req: AnthropicMessageRequest): ChatConfig {
  const config: ChatConfig = {};

  // Map common parameters
  if (req.temperature !== undefined) {
    config.temperature = req.temperature;
  }
  if (req.top_p !== undefined) {
    config.topP = req.top_p;
  }

  // Map max_tokens (Anthropic) to maxNewTokens (MLX-Node)
  if (req.max_tokens !== undefined) {
    config.maxNewTokens = req.max_tokens;
  }

  // Default: enable cache reuse for multi-turn conversations
  config.reuseCache = true;

  return config;
}
