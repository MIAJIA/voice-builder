import { describe, expect, it } from 'vitest';
import { ANTHROPIC_MODEL } from './anthropic-model';

describe('ANTHROPIC_MODEL', () => {
  it('uses the supported Sonnet 4.6 model', () => {
    expect(ANTHROPIC_MODEL).toBe('claude-sonnet-4-6');
  });
});
