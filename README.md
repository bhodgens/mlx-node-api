# MLX-Node API

OpenAI-compatible HTTP server for [MLX-Node](https://github.com/mlx-node/mlx-node) models. Run local LLMs with an API that's compatible with OpenAI's client libraries.

## Features

- OpenAI-compatible `/v1/chat/completions` and `/v1/models` endpoints
- Streaming response support (SSE)
- Multi-model support with automatic fallback to default model
- CORS-enabled for web applications
- Environment variable and config file support
- Zero-dependency CLI for easy local deployment

## Quick Start

### Prerequisites

- Node.js 18+
- MLX-Node installed (see [mlx-node/packages/lm](https://github.com/mlx-node/mlx-node))
- A downloaded MLX-compatible model

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/mlx-node-api.git
cd mlx-node-api

# Install dependencies
npm install
```

### Configuration

Configure your models via environment variables or a config file.

**Option 1: Environment Variables**

```bash
export PORT=3000
export HOST=0.0.0.0
export MODEL_NAME="my-model"
export MODEL_PATH="/path/to/model"
```

**Option 2: Config File**

Create a `mlx.config.json` file in the project root:

```json
{
  "port": 3000,
  "host": "0.0.0.0",
  "models": [
    {
      "name": "qwen3.5-9b-unsloth",
      "path": "~/.cache/models/qwen3.5-9B-unsloth",
      "default": true
    }
  ],
  "cors": {
    "origin": "*"
  }
}
```

See `config.example.json` for a full example.

### Running the Server

```bash
# Development mode (with hot reload)
npm run dev

# Build for production
npm run build

# Run production server
npm start

# Or use the Makefile
make build
make start
```

The server will start at `http://localhost:3000` (by default).

## Usage

### Using curl

```bash
# List available models
curl http://localhost:3000/v1/models

# Chat completion (non-streaming)
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3.5-9b-unsloth",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'

# Chat completion (streaming)
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3.5-9b-unsloth",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": true
  }'
```

### Using OpenAI SDK

The API is compatible with OpenAI's official SDKs. Just point the `baseURL` to your local server.

**Python:**

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3000/v1",
    api_key="not-needed"  # API key not required
)

response = client.chat.completions.create(
    model="qwen3.5-9b-unsloth",
    messages=[{"role": "user", "content": "Hello!"}]
)

print(response.choices[0].message.content)
```

**JavaScript/TypeScript:**

```javascript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'http://localhost:3000/v1',
  apiKey: 'not-needed', // API key not required
});

const response = await client.chat.completions.create({
  model: 'qwen3.5-9b-unsloth',
  messages: [{ role: 'user', content: 'Hello!' }],
});

console.log(response.choices[0].message.content);
```

## API Endpoints

### `GET /v1/models`

List all available models.

**Response:**

```json
{
  "object": "list",
  "data": [
    {
      "id": "qwen3.5-9b-unsloth",
      "object": "model",
      "created": 1234567890,
      "owned_by": "mlx-node"
    }
  ]
}
```

### `POST /v1/chat/completions`

Create a chat completion.

**Request Body:**

```json
{
  "model": "qwen3.5-9b-unsloth",
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "Hello!" }
  ],
  "stream": false,
  "max_tokens": 512,
  "temperature": 0.7
}
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `model` | string | Yes | Model ID to use |
| `messages` | array | Yes | Array of message objects |
| `stream` | boolean | No | Enable SSE streaming (default: false) |
| `max_tokens` | number | No | Maximum tokens to generate |
| `temperature` | number | No | Sampling temperature (0-2) |

### `GET /health`

Health check endpoint.

**Response:**

```json
{
  "status": "ok",
  "models": 1,
  "timestamp": 1234567890
}
```

## CLI Options

```bash
mlx-node-api [options]

Options:
  -h, --help              Show help
  -v, --version           Show version
  -c, --config <path>     Path to config file
  -p, --port <number>     Override port (default: 3000)
  --host <address>        Override host (default: 0.0.0.0)
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `HOST` | `0.0.0.0` | Server host |
| `MODEL_NAME` | - | Model name (for single model setup) |
| `MODEL_PATH` | - | Path to model directory |
| `MLX_CONFIG` | `mlx.config.json` | Path to config file |

### Config File Schema

```json
{
  "port": number,
  "host": string,
  "models": [
    {
      "name": string,
      "path": string,
      "default": boolean
    }
  ],
  "cors": {
    "origin": string | "*"
  }
}
```

## Development

```bash
# Install dependencies
make install

# Run in development mode
make dev

# Type checking
make typecheck

# Build
make build

# Clean build artifacts
make clean
```

## Production Deployment

### Using Node.js directly

```bash
npm run build
NODE_ENV=production npm start
```

### Using Docker (optional)

```bash
docker build -t mlx-node-api .
docker run -p 3000:3000 \
  -v ~/.cache/models:/root/.cache/models \
  mlx-node-api
```

### Using Process Manager (PM2)

```bash
npm install -g pm2
pm2 start dist/index.js --name mlx-node-api
pm2 startup
pm2 save
```

## Model Path Resolution

Model paths support the following:
- Absolute paths: `/Users/username/models/my-model`
- Home directory expansion: `~/.cache/models/my-model`
- Relative paths: `./models/my-model` (relative to project root)

## Troubleshooting

**Model not loading:**
- Ensure the model path exists and is readable
- Check that MLX-Node is properly installed
- Verify the model format is compatible with MLX

**Port already in use:**
- Change the port via `PORT` environment variable or `--port` flag
- Stop the process using the port: `lsof -ti:3000 | xargs kill`

**CORS errors in browser:**
- Configure `cors.origin` in config file
- Ensure the origin is allowed or set to `"*"` for development

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
