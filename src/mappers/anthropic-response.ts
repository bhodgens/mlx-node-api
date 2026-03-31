/**
 * Map MLX-Node response format to Anthropic format
 */

import type { ChatResult, ChatStreamDelta, ChatStreamFinal } from '@mlx-node/lm';
import type {
  AnthropicMessageResponse,
  AnthropicStreamEvent,
  AnthropicMessageStart,
  AnthropicMessageDelta,
  AnthropicMessageStop,
  AnthropicContentBlockStart,
  AnthropicContentBlockDelta,
  AnthropicContentBlockStop,
  AnthropicUsage,
} from '../types/anthropic.js';
import { generateAnthropicId } from '../types/anthropic.js';

/**
 * Map MLX-Node finish reason to Anthropic finish reason
 */
export function mapFinishReason(reason: string): 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use' {
  switch (reason) {
    case 'length':
    case 'max_tokens':
      return 'max_tokens';
    case 'tool_calls':
    case 'tool':
      return 'tool_use';
    case 'stop_sequence':
      return 'stop_sequence';
    case 'stop':
    case 'eos':
    default:
      return 'end_turn';
  }
}

/**
 * Map MLX-Node ChatResult to Anthropic MessageResponse
 */
export function toAnthropicResponse(
  result: ChatResult,
  model: string,
  inputTokens: number = 0,
): AnthropicMessageResponse {
  const promptTokens = inputTokens;
  const completionTokens = result.numTokens;

  return {
    id: generateAnthropicId(),
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: result.text,
      },
    ],
    model,
    stop_reason: mapFinishReason(result.finishReason),
    stop_sequence: null,
    usage: {
      input_tokens: promptTokens,
      output_tokens: completionTokens,
    },
  };
}

/**
 * Create Anthropic streaming events
 */
export class AnthropicStreamEncoder {
  private messageId: string;
  private model: string;
  private inputTokens: number;
  private outputTokens: number = 0;
  private blockIndex: number = 0;
  private accumulatedText: string = '';

  constructor(model: string, inputTokens: number = 0) {
    this.messageId = generateAnthropicId();
    this.model = model;
    this.inputTokens = inputTokens;
  }

  /**
   * Create message_start event
   */
  messageStart(): string {
    const event: AnthropicMessageStart = {
      type: 'message_start',
      message: {
        id: this.messageId,
        type: 'message',
        role: 'assistant',
        content: [],
        model: this.model,
        stop_reason: null,
        stop_sequence: null,
        usage: {
          input_tokens: this.inputTokens,
          output_tokens: 0,
        },
      },
    };
    return this.formatEvent(event);
  }

  /**
   * Create content_block_start event
   */
  contentBlockStart(): string {
    const event: AnthropicContentBlockStart = {
      type: 'content_block_start',
      index: this.blockIndex,
      content_block: {
        type: 'text',
        text: '',
      },
    };
    return this.formatEvent(event);
  }

  /**
   * Create content_block_delta event with text
   */
  contentBlockDelta(text: string): string {
    this.accumulatedText += text;
    const event: AnthropicContentBlockDelta = {
      type: 'content_block_delta',
      index: this.blockIndex,
      delta: {
        type: 'text_delta',
        text,
      },
    };
    return this.formatEvent(event);
  }

  /**
   * Create content_block_stop event
   */
  contentBlockStop(): string {
    const event: AnthropicContentBlockStop = {
      type: 'content_block_stop',
      index: this.blockIndex,
    };
    this.blockIndex++;
    return this.formatEvent(event);
  }

  /**
   * Create message_delta event (final)
   * @param finishReason - The reason the generation stopped
   * @param outputTokens - Actual token count from the model
   */
  messageDelta(finishReason: string, outputTokens?: number): string {
    // Use provided token count if available, otherwise keep accumulated
    if (outputTokens !== undefined) {
      this.outputTokens = outputTokens;
    }

    const event: AnthropicMessageDelta = {
      type: 'message_delta',
      delta: {
        stop_reason: finishReason,
        stop_sequence: null,
      },
      usage: {
        output_tokens: this.outputTokens,
      },
    };
    return this.formatEvent(event);
  }

  /**
   * Create message_stop event
   */
  messageStop(): string {
    const event: AnthropicMessageStop = {
      type: 'message_stop',
    };
    return this.formatEvent(event);
  }

  /**
   * Format event as SSE
   */
  private formatEvent(event: AnthropicStreamEvent): string {
    return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
  }
}
