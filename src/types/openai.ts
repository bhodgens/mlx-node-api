/**
 * OpenAI API compatible types
 */

// OpenAI Chat Completion Request
export interface OpenAIChatCompletionRequest {
  model: string;
  messages: OpenAIChatMessage[];
  stream?: boolean;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  max_completion_tokens?: number;
  tools?: OpenAITool[];
  tool_choice?: 'none' | 'auto' | 'required' | { type: 'function'; function: { name: string } };
}

export type OpenAIChatRole = 'system' | 'user' | 'assistant' | 'tool';

export interface OpenAIChatMessage {
  role: OpenAIChatRole;
  content: string;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
}

// OpenAI Tools
export interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
    strict?: boolean;
  };
}

export interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

// OpenAI Chat Completion Response (non-streaming)
export interface OpenAIChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: OpenAIChoice[];
  usage: OpenAIUsage;
}

export interface OpenAIChoice {
  index: number;
  message: {
    role: 'assistant';
    content: string | null;
    tool_calls?: OpenAIToolCall[];
  };
  finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter';
}

export interface OpenAIUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

// OpenAI Chat Completion Chunk (streaming)
export interface OpenAIChatCompletionChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: OpenAIStreamChoice[];
}

export interface OpenAIStreamChoice {
  index: number;
  delta: {
    role?: 'assistant';
    content?: string;
    tool_calls?: OpenAIToolCall[];
  };
  finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
}

// OpenAI Models Response
export interface OpenAIModelsResponse {
  object: 'list';
  data: OpenAIModel[];
}

export interface OpenAIModel {
  id: string;
  object: 'model';
  created: number;
  owned_by: string;
}

// OpenAI Error Response
export interface OpenAIErrorResponse {
  error: {
    message: string;
    type: string;
    param?: string;
    code?: string;
  };
}

export interface OpenAIModelResponse {
  id: string;
  object: 'model';
  created: number;
  owned_by: string;
}

// Helper to create error response
export function createOpenAIErrorResponse(
  message: string,
  type: string = 'invalid_request_error',
  statusCode: number = 400,
): OpenAIErrorResponse & { status: number } {
  return {
    error: {
      message,
      type,
    },
    status: statusCode,
  };
}
