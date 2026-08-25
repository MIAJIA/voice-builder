import { describe, expect, it } from 'vitest';
import {
  ANTHROPIC_MODEL,
  ANTHROPIC_MODEL_OPTIONS,
  DEFAULT_ANTHROPIC_MODEL,
  isAnthropicModel,
  resolveAnthropicModel,
} from './anthropic-model';

describe('Anthropic model selection', () => {
  it('defaults to Sonnet 4.6', () => {
    expect(ANTHROPIC_MODEL).toBe('claude-sonnet-4-6');
    expect(DEFAULT_ANTHROPIC_MODEL).toBe('claude-sonnet-4-6');
  });

  it('offers Sonnet 4.6 and Opus 4.6', () => {
    expect(ANTHROPIC_MODEL_OPTIONS.map((option) => option.id)).toEqual([
      'claude-sonnet-4-6',
      'claude-opus-4-6',
    ]);
  });

  it('accepts only selectable models', () => {
    expect(isAnthropicModel('claude-sonnet-4-6')).toBe(true);
    expect(isAnthropicModel('claude-opus-4-6')).toBe(true);
    expect(isAnthropicModel('claude-sonnet-5')).toBe(false);
  });

  it('defaults missing values but rejects explicit unknown models', () => {
    expect(resolveAnthropicModel(undefined)).toBe('claude-sonnet-4-6');
    expect(resolveAnthropicModel('claude-opus-4-6')).toBe('claude-opus-4-6');
    expect(resolveAnthropicModel('unknown-model')).toBeNull();
    expect(resolveAnthropicModel(null)).toBeNull();
  });
});
