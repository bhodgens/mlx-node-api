/**
 * Map MLX-Node response format to OpenAI format
 */

import type { ChatResult, ChatStreamDelta, ChatStreamFinal } from '@mlx-node/lm';
import type {
  OpenAIChatCompletionChunk,
  OpenAIChatCompletionResponse,
  OpenAIChoice,
  OpenAIStreamChoice,
  OpenAIUsage,
} from '../types/openai.js';

/**
 * Map MLX-Node finish reason to OpenAI finish reason
 */
export function mapFinishReason(reason: string): 'stop' | 'length' | 'tool_calls' | 'content_filter' {
  switch (reason) {
    case 'length':
    case 'max_tokens':
      return 'length';
    case 'tool_calls':
    case 'tool':
      return 'tool_calls';
    case 'stop':
    case 'eos':
      return 'stop';
    default:
      return 'stop';
  }
}

/**
 * Generate a unique ID for chat completion
 */
export function generateId(prefix: string = 'chatcmpl'): string {
  return `${prefix}-${crypto.randomUUID().replace(/-/g, '').substring(0, 24)}`;
}

/**
 * Generate current timestamp for OpenAI responses
 */
export function getTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Map MLX-Node ChatResult to OpenAI ChatCompletionResponse
 */
export function toOpenAIResponse(
  result: ChatResult,
  id: string,
  model: string,
  inputTokens: number = 0,
): OpenAIChatCompletionResponse {
  const promptTokens = inputTokens;
  const completionTokens = result.numTokens;

  return {
    id,
    object: 'chat.completion',
    created: getTimestamp(),
    model,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: result.text,
          ...(result.toolCalls && result.toolCalls.length > 0
            ? {
                tool_calls: result.toolCalls.map((tc) => ({
                  id: tc.id,
                  type: 'function' as const,
                  function: {
                    name: tc.name,
                    arguments:
                      typeof tc.arguments === 'string'
                        ? tc.arguments
                        : JSON.stringify(tc.arguments),
                  },
                })),
              }
            : {}),
        },
        finish_reason: mapFinishReason(result.finishReason),
      },
    ],
    usage: {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens,
    },
  };
}

/**
 * Create an OpenAI streaming delta chunk from MLX-Node stream delta event
 */
export function toOpenAIStreamChunk(
  event: ChatStreamDelta | ChatStreamFinal,
  id: string,
  model: string,
  isFirstChunk: boolean = false,
): OpenAIChatCompletionChunk {
  if (!event.done) {
    // Delta chunk - only include content
    return {
      id,
      object: 'chat.completion.chunk',
      created: getTimestamp(),
      model,
      choices: [
        {
          index: 0,
          delta: {
            ...(isFirstChunk ? { role: 'assistant' } : {}),
            content: event.text,
          },
          finish_reason: null,
        },
      ],
    };
  } else {
    // Final chunk - include finish reason
    return {
      id,
      object: 'chat.completion.chunk',
      created: getTimestamp(),
      model,
      choices: [
        {
          index: 0,
          delta: {},
          finish_reason: mapFinishReason(event.finishReason),
        },
      ],
    };
  }
}

/**
 * Create the final [DONE] chunk for SSE streaming
 */
export function createDoneChunk(): string {
  return 'data: [DONE]\n\n';
}

/**
 * Format a chunk as SSE data
 */
export function formatSSE(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

/**
 * Convert tool calls to OpenAI format for streaming
 */
export function toolCallsToOpenAI(toolCalls: Array<{ id: string; name: string; arguments: string | Record<string, unknown> }>) {
  return toolCalls.map((tc) => ({
    index: 0,
    id: tc.id,
    type: 'function' as const,
    function: {
      name: tc.name,
      arguments: typeof tc.arguments === 'string' ? tc.arguments : JSON.stringify(tc.arguments),
    },
  }));
}
