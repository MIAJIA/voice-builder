'use client';

import { Sparkles } from 'lucide-react';
import {
  ANTHROPIC_MODEL_OPTIONS,
  type AnthropicModel,
} from '@/lib/anthropic-model';
import { useStore } from '@/lib/store';

export function ModelSwitcher() {
  const { selectedModel, setSelectedModel } = useStore();
  const selectedOption =
    ANTHROPIC_MODEL_OPTIONS.find((option) => option.id === selectedModel) ??
    ANTHROPIC_MODEL_OPTIONS[0];

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-[calc(100vw-2rem)]">
      <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur">
        <Sparkles
          className="h-4 w-4 shrink-0 text-violet-500"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <label
            htmlFor="model-switcher"
            className="block text-[10px] font-medium uppercase tracking-wide text-gray-400"
          >
            AI 模型
          </label>
          <select
            id="model-switcher"
            aria-describedby="model-switcher-description"
            value={selectedModel}
            onChange={(event) =>
              setSelectedModel(event.target.value as AnthropicModel)
            }
            className="block max-w-[150px] cursor-pointer appearance-none bg-transparent pr-5 text-sm font-medium text-gray-800 outline-none"
          >
            {ANTHROPIC_MODEL_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <span
          id="model-switcher-description"
          className="hidden whitespace-nowrap text-xs text-gray-400 sm:inline"
        >
          {selectedOption.description}
        </span>
      </div>
    </div>
  );
}
