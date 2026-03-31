/**
 * Anthropic API compatible types
 */

// Anthropic Message Request
export interface AnthropicMessageRequest {
  model: string;
  messages: AnthropicMessage[];
  max_tokens: number;
  system?: string;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stream?: boolean;
  tools?: AnthropicTool[];
  tool_choice?: AnthropicToolChoice;
  stop_sequences?: string[];
}

export type AnthropicRole = 'user' | 'assistant';

export interface AnthropicMessage {
  role: AnthropicRole;
  content: string | AnthropicContentBlock[];
}

export type AnthropicContentBlock =
  | AnthropicTextBlock
  | AnthropicImageBlock
  | AnthropicToolUseBlock
  | AnthropicToolResultBlock;

export interface AnthropicTextBlock {
  type: 'text';
  text: string;
}

export interface AnthropicImageBlock {
  type: 'image';
  source: {
    type: 'base64';
    media_type: string;
    data: string;
  };
}

export interface AnthropicToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface AnthropicToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content?: string;
  is_error?: boolean;
}

// Anthropic Tools
export interface AnthropicTool {
  name: string;
  description?: string;
  input_schema: Record<string, unknown>;
}

export type AnthropicToolChoice =
  | 'auto'
  | 'any'
  | { type: 'tool'; name: string }
  | { type: 'none' };

// Anthropic Message Response (non-streaming)
export interface AnthropicMessageResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<AnthropicTextBlock | AnthropicToolUseBlock>;
  model: string;
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use';
  stop_sequence: string | null;
  usage: AnthropicUsage;
}

export interface AnthropicUsage {
  input_tokens: number;
  output_tokens: number;
}

// Anthropic Message Stream Event
export type AnthropicStreamEvent =
  | AnthropicMessageStart
  | AnthropicMessageDelta
  | AnthropicMessageStop
  | AnthropicContentBlockStart
  | AnthropicContentBlockDelta
  | AnthropicContentBlockStop;

export interface AnthropicMessageStart {
  type: 'message_start';
  message: {
    id: string;
    type: 'message';
    role: 'assistant';
    content: [];
    model: string;
    stop_reason: null;
    stop_sequence: null;
    usage: {
      input_tokens: number;
      output_tokens: number;
    };
  };
}

export interface AnthropicMessageDelta {
  type: 'message_delta';
  delta: {
    stop_reason: string;
    stop_sequence: string | null;
  };
  usage: {
    output_tokens: number;
  };
}

export interface AnthropicMessageStop {
  type: 'message_stop';
}

export interface AnthropicContentBlockStart {
  type: 'content_block_start';
  index: number;
  content_block: {
    type: 'text' | 'tool_use';
    text?: string;
    id?: string;
    name?: string;
    input?: Record<string, unknown>;
  };
}

export interface AnthropicContentBlockDelta {
  type: 'content_block_delta';
  index: number;
  delta: {
    type: 'text_delta' | 'input_json_delta';
    text?: string;
    partial_json?: string;
  };
}

export interface AnthropicContentBlockStop {
  type: 'content_block_stop';
  index: number;
}

// Anthropic Error Response
export interface AnthropicErrorResponse {
  type: 'error';
  error: {
    type: string;
    message: string;
  };
}

// Helper to create error response
export function createAnthropicErrorResponse(
  message: string,
  type: string = 'invalid_request_error',
  statusCode: number = 400,
): AnthropicErrorResponse & { status: number } {
  return {
    type: 'error',
    error: {
      type,
      message,
    },
    status: statusCode,
  };
}

// Helper to generate Anthropic-style ID
export function generateAnthropicId(): string {
  return `msg_${crypto.randomUUID().replace(/-/g, '').substring(0, 24)}`;
}
