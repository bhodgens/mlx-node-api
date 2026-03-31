/**
 * Model registry - manages model loading and caching
 */

import { loadModel } from '@mlx-node/lm';
import type { TrainableModel } from '@mlx-node/lm';
import type { ModelConfig } from '../config.js';

// Claude model IDs that should map to the default model
const CLAUDE_MODEL_ALIASES = [
  'claude-opus-4-5-20211101',
  'claude-opus-4-6',
  'claude-sonnet-4-6',
  'claude-3-5-sonnet-20241022',
  'claude-3-5-sonnet-20240620',
  'claude-3-opus-20240229',
];

export interface ModelWithMetadata {
  name: string;
  path: string;
  default: boolean;
  model: TrainableModel;
  loadingTime: number;
}

export class ModelRegistry {
  private models = new Map<string, ModelWithMetadata>();
  private defaultModel: string | null = null;

  /**
   * Check if a model name is a Claude alias
   */
  private isClaudeAlias(name: string): boolean {
    return CLAUDE_MODEL_ALIASES.includes(name);
  }

  /**
   * Load a model and add it to the registry
   */
  async loadModel(config: ModelConfig): Promise<void> {
    console.log(`Loading model '${config.name}' from ${config.path}...`);
    const startTime = Date.now();

    try {
      const model = await loadModel(config.path);
      const loadingTime = Date.now() - startTime;

      this.models.set(config.name, {
        name: config.name,
        path: config.path,
        default: config.default ?? false,
        model,
        loadingTime,
      });

      if (config.default) {
        this.defaultModel = config.name;
      }

      console.log(`Model '${config.name}' loaded in ${loadingTime}ms`);
    } catch (error) {
      console.error(`Failed to load model '${config.name}':`, error);
      throw error;
    }
  }

  /**
   * Load multiple models
   */
  async loadModels(configs: ModelConfig[]): Promise<void> {
    const loadPromises = configs.map((config) => this.loadModel(config));
    await Promise.all(loadPromises);

    // Set default if none specified
    if (this.defaultModel === null && this.models.size > 0) {
      const firstModel = Array.from(this.models.values())[0];
      this.defaultModel = firstModel.name;
    }
  }

  /**
   * Get a model by name
   */
  getModel(name: string): ModelWithMetadata | undefined {
    // If it's a Claude alias, use the default model
    if (this.isClaudeAlias(name) && this.defaultModel) {
      return this.models.get(this.defaultModel);
    }

    // If name not found, try the default model
    if (!this.models.has(name) && this.defaultModel) {
      console.warn(`Model '${name}' not found, using default '${this.defaultModel}'`);
      return this.models.get(this.defaultModel);
    }
    return this.models.get(name);
  }

  /**
   * Get the default model
   */
  getDefaultModel(): ModelWithMetadata | undefined {
    return this.defaultModel ? this.models.get(this.defaultModel) : undefined;
  }

  /**
   * List all loaded models
   */
  listModels(): Omit<ModelWithMetadata, 'model'>[] {
    return Array.from(this.models.values()).map(({ model, ...rest }) => rest);
  }

  /**
   * Get the number of loaded models
   */
  size(): number {
    return this.models.size;
  }

  /**
   * Unload a model (free memory)
   */
  async unloadModel(name: string): Promise<boolean> {
    const entry = this.models.get(name);
    if (!entry) return false;

    // MLX-Node models are Rust-backed - we can't easily free them
    // Just remove from registry
    this.models.delete(name);

    if (this.defaultModel === name) {
      this.defaultModel = null;
    }

    return true;
  }
}
