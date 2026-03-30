/**
 * Map OpenAI request format to MLX-Node format
 */

import type { ChatConfig, ChatMessage } from '@mlx-node/lm';
import type { OpenAIChatCompletionRequest, OpenAITool } from '../types/openai.js';

/**
 * Map OpenAI messages to MLX-Node messages
 * OpenAI format is compatible with MLX-Node format
 */
export function mapMessages(openaiMessages: OpenAIChatCompletionRequest['messages']): ChatMessage[] {
  return openaiMessages.map((msg) => ({
    role: msg.role,
    content: msg.content,
    toolCalls: msg.tool_calls
      ? msg.tool_calls.map((tc) => ({
          id: tc.id,
          name: tc.function.name,
          arguments: tc.function.arguments,
        }))
      : undefined,
    toolCallId: msg.tool_call_id,
  }));
}

/**
 * Map OpenAI tools to MLX-Node tools
 */
export function mapTools(openaiTools?: OpenAITool[]): { type: 'function'; function: { name: string; description?: string; parameters?: { type: string; properties?: string; required?: string[] } } }[] | undefined {
  if (!openaiTools || openaiTools.length === 0) return undefined;

  return openaiTools.map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.function.name,
      description: tool.function.description,
      // OpenAI passes parameters as object, MLX-Node needs them as JSON string for properties
      parameters: tool.function.parameters
        ? {
            type: 'object',
            properties: tool.function.parameters.properties
              ? JSON.stringify(tool.function.parameters.properties)
              : undefined,
            required: tool.function.parameters.required as string[] | undefined,
          }
        : undefined,
    },
  }));
}

/**
 * Map OpenAI request config to MLX-Node ChatConfig
 */
export function mapConfig(req: OpenAIChatCompletionRequest): ChatConfig {
  const config: ChatConfig = {};

  // Map common parameters
  if (req.temperature !== undefined) {
    config.temperature = req.temperature;
  }
  if (req.top_p !== undefined) {
    config.topP = req.top_p;
  }

  // Map max_tokens (OpenAI) to maxNewTokens (MLX-Node)
  // max_completion_tokens takes precedence if provided (OpenAI convention)
  const maxTokens = req.max_completion_tokens ?? req.max_tokens;
  if (maxTokens !== undefined) {
    config.maxNewTokens = maxTokens;
  }

  // Map tools
  const tools = mapTools(req.tools);
  if (tools) {
    config.tools = tools;
  }

  // Default: enable cache reuse for multi-turn conversations
  config.reuseCache = true;

  return config;
}

/**
 * Extract model name from request
 */
export function extractModel(req: OpenAIChatCompletionRequest): string {
  return req.model;
}
