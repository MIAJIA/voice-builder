import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock fetch globally
global.fetch = vi.fn();

// Mock window.alert
global.alert = vi.fn();

// Mock navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

// Mock window.open
global.open = vi.fn();

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});
