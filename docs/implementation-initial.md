# Implementation Plan: OpenAI-Compatible Server for MLX-Node

## Overview

Create an OpenAI-compatible HTTP server that wraps the MLX-Node library, enabling local Qwen models to work with tools expecting OpenAI API compatibility.

## Project Structure

```
mlx-node-api/
├── package.json              # Project dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── src/
│   ├── index.ts              # Server entry point
│   ├── config.ts             # Configuration management
│   ├── types/
│   │   └── openai.ts         # OpenAI type definitions
│   ├── mappers/
│   │   ├── request.ts        # OpenAI → MLX-Node mapping
│   │   └── response.ts       # MLX-Node → OpenAI mapping
│   ├── handlers/
│   │   ├── completion.ts     # Non-streaming handler
│   │   └── stream.ts         # SSE streaming handler
│   ├── routes/
│   │   ├── chat.ts           # /v1/chat/completions endpoint
│   │   └── models.ts         # /v1/models endpoint
│   └── server/
│       ├── index.ts          # Hono app setup
│       └── model-registry.ts # Model loading and caching
└── docs/
    └── implementation-initial.md
```

## Implementation Details

### 1. Dependencies

- **@hono/node-server**: HTTP server (fast, TypeScript-native)
- **hono**: Web framework with SSE support
- **@mlx-node/lm**: MLX-Node model inference

### 2. Core Components

#### config.ts
- Environment-based configuration
- Model path configuration
- CORS settings

#### types/openai.ts
- OpenAI request/response types
- Error response types

#### mappers/request.ts
- Map OpenAI messages to MLX-Node messages
- Map OpenAI config to MLX-Node ChatConfig
- Tool definition mapping

#### mappers/response.ts
- Map MLX-Node results to OpenAI format
- SSE chunk formatting
- Finish reason mapping

#### handlers/completion.ts
- Non-streaming chat completion
- Uses `model.chat()`

#### handlers/stream.ts
- Streaming chat completion
- Uses `model.chatStream()` with AsyncGenerator
- SSE format

#### routes/chat.ts
- POST /v1/chat/completions
- Handles streaming/non-streaming modes
- Error handling

#### routes/models.ts
- GET /v1/models
- Lists available models

#### server/model-registry.ts
- Model loading with `loadModel()`
- Model caching
- Default model selection

#### server/index.ts
- Hono app with middleware
- CORS configuration
- Route setup
- Error handling

#### index.ts
- CLI entry point
- Server startup
- Graceful shutdown

## Testing Plan

### Test Model
Use: `/Volumes/LLMs/Brooooooklyn/Qwen3.5-27B-unsloth-mlx/`

### Test Commands

1. **Models endpoint:**
   ```bash
   curl http://localhost:3000/v1/models
   ```

2. **Non-streaming chat:**
   ```bash
   curl -X POST http://localhost:3000/v1/chat/completions \
     -H "Content-Type: application/json" \
     -d '{
       "model": "qwen3.5-27b",
       "messages": [{"role": "user", "content": "Hello!"}]
     }'
   ```

3. **Streaming chat:**
   ```bash
   curl -X POST http://localhost:3000/v1/chat/completions \
     -H "Content-Type: application/json" \
     -d '{
       "model": "qwen3.5-27b",
       "messages": [{"role": "user", "content": "Count to 10"}],
       "stream": true
     }'
   ```

4. **With OpenAI SDK:**
   ```typescript
   import OpenAI from 'openai';
   const client = new OpenAI({
     baseURL: 'http://localhost:3000/v1',
     apiKey: 'dummy',
   });
   const response = await client.chat.completions.create({
     model: 'qwen3.5-27b',
     messages: [{ role: 'user', content: 'Hello!' }],
   });
   ```

## Build & Run

```bash
# Install dependencies
yarn install

# Development mode
yarn dev

# Build
yarn build

# Production
yarn start
```

## Environment Variables

- `PORT`: Server port (default: 3000)
- `HOST`: Server host (default: 0.0.0.0)
- `MODEL_PATH`: Path to model (overrides config)
- `MODEL_NAME`: Model name (default: qwen3.5-9b-unsloth)
