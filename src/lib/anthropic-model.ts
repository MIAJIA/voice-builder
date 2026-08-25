export const ANTHROPIC_MODEL_OPTIONS = [
  {
    id: 'claude-sonnet-4-6',
    label: 'Sonnet 4.6',
    description: '默认 · 快速自然',
  },
  {
    id: 'claude-opus-4-6',
    label: 'Opus 4.6',
    description: '更深入 · 成本更高',
  },
] as const;

export type AnthropicModel = (typeof ANTHROPIC_MODEL_OPTIONS)[number]['id'];

export const DEFAULT_ANTHROPIC_MODEL: AnthropicModel = 'claude-sonnet-4-6';

// Keep the existing constant for background jobs that do not expose model selection.
export const ANTHROPIC_MODEL = DEFAULT_ANTHROPIC_MODEL;

export function isAnthropicModel(value: unknown): value is AnthropicModel {
  return ANTHROPIC_MODEL_OPTIONS.some((option) => option.id === value);
}

/**
 * Missing model values use the product default for backwards compatibility.
 * Explicit, unknown values are rejected instead of silently switching models.
 */
export function resolveAnthropicModel(value: unknown): AnthropicModel | null {
  if (value === undefined) return DEFAULT_ANTHROPIC_MODEL;
  return isAnthropicModel(value) ? value : null;
}
