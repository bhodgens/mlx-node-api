/**
 * Server configuration
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

export interface ServerConfig {
  port: number;
  host: string;
  models: ModelConfig[];
  cors: {
    origin: string | '*';
  };
}

export interface ModelConfig {
  name: string;
  path: string;
  default?: boolean;
}

export interface ConfigFile {
  port?: number;
  host?: string;
  models?: ModelConfig[];
  cors?: {
    origin?: string | '*';
  };
}

const VERSION = '0.1.0';

/**
 * Default configuration
 * Models are loaded from ~/.cache/models/{name}
 */
export const DEFAULT_CONFIG: ServerConfig = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  host: process.env.HOST ?? '0.0.0.0',
  models: [
    {
      name: 'qwen3.5-9b-unsloth',
      path: `${process.env.HOME ?? '.'}/.cache/models/qwen3.5-9B-unsloth`,
      default: true,
    },
  ],
  cors: {
    origin: '*',
  },
};

/**
 * Expand tilde (~) in file paths
 */
function expandPath(path: string): string {
  if (path.startsWith('~/')) {
    return `${process.env.HOME}${path.slice(1)}`;
  }
  return path;
}

/**
 * Resolve a path relative to the project root
 */
function resolveProjectPath(path: string): string {
  const projectRoot = fileURLToPath(new URL('../..', import.meta.url));
  if (path.startsWith('./') || path.startsWith('../')) {
    return resolve(projectRoot, path);
  }
  return expandPath(path);
}

/**
 * Load configuration from a JSON file
 */
function loadConfigFile(filePath: string): ConfigFile | null {
  const resolvedPath = resolveProjectPath(filePath);

  if (!existsSync(resolvedPath)) {
    return null;
  }

  try {
    const content = readFileSync(resolvedPath, 'utf-8');
    const config = JSON.parse(content) as ConfigFile;

    // Expand paths in models
    if (config.models) {
      for (const model of config.models) {
        model.path = resolveProjectPath(model.path);
      }
    }

    return config;
  } catch (error) {
    console.error(`Failed to load config file '${filePath}':`, error);
    throw error;
  }
}

/**
 * Get default config file paths to search
 */
function getConfigFilePaths(): string[] {
  const envConfig = process.env.MLX_CONFIG;
  if (envConfig) {
    return [envConfig];
  }

  return [
    'mlx.config.json',
    'config.json',
    '.mlxrc.json',
  ];
}

/**
 * Merge config file with defaults
 */
function mergeConfig(base: ServerConfig, override: ConfigFile): ServerConfig {
  return {
    port: override.port ?? base.port,
    host: override.host ?? base.host,
    models: override.models ?? base.models,
    cors: {
      origin: override.cors?.origin ?? base.cors.origin,
    },
  };
}

/**
 * Load configuration from environment variables and defaults
 */
export function loadConfig(cliConfig: { port?: number; host?: string; configPath?: string } = {}): ServerConfig {
  // Start with defaults
  let config = DEFAULT_CONFIG;

  // Load from config file if specified or search for default
  const configPaths = cliConfig.configPath
    ? [cliConfig.configPath]
    : getConfigFilePaths();

  for (const path of configPaths) {
    const fileConfig = loadConfigFile(path);
    if (fileConfig) {
      console.log(`Loaded configuration from ${path}`);
      config = mergeConfig(config, fileConfig);
      break;
    }
  }

  // Environment variables override config file
  const modelPath = process.env.MODEL_PATH;
  const modelName = process.env.MODEL_NAME ?? 'qwen3.5-9b-unsloth';

  const models: ModelConfig[] = modelPath
    ? [{ name: modelName, path: expandPath(modelPath), default: true }]
    : config.models;

  // Merge final config
  const finalConfig: ServerConfig = {
    ...config,
    port: cliConfig.port ?? config.port,
    host: cliConfig.host ?? config.host,
    models,
  };

  return finalConfig;
}

/**
 * Get the version string
 */
export function getVersion(): string {
  return VERSION;
}
