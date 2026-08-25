import { describe, expect, it } from 'vitest';
import { endsWithUserMessage } from './anthropic-messages';

describe('endsWithUserMessage', () => {
  it('accepts conversations that end with a user message', () => {
    expect(
      endsWithUserMessage([
        { role: 'assistant' },
        { role: 'user' },
      ])
    ).toBe(true);
  });

  it('rejects assistant prefilling and empty conversations', () => {
    expect(endsWithUserMessage([{ role: 'assistant' }])).toBe(false);
    expect(endsWithUserMessage([])).toBe(false);
  });
});
