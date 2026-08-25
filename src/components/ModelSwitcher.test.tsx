import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ModelSwitcher } from './ModelSwitcher';

const mockSetSelectedModel = vi.fn();

vi.mock('@/lib/store', () => ({
  useStore: () => ({
    selectedModel: 'claude-sonnet-4-6',
    setSelectedModel: mockSetSelectedModel,
  }),
}));

describe('ModelSwitcher', () => {
  it('shows Sonnet by default and can select Opus', () => {
    render(<ModelSwitcher />);

    const select = screen.getByRole('combobox', { name: 'AI 模型' });
    expect(select).toHaveValue('claude-sonnet-4-6');

    fireEvent.change(select, { target: { value: 'claude-opus-4-6' } });
    expect(mockSetSelectedModel).toHaveBeenCalledWith('claude-opus-4-6');
  });
});
