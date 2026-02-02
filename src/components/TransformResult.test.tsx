import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TransformResult } from './TransformResult';

// Mock the store
const mockCheckRateLimit = vi.fn().mockReturnValue({ allowed: true, remaining: 50 });
const mockIncrementUsage = vi.fn();

vi.mock('@/lib/store', () => ({
  useStore: () => ({
    profile: null,
    checkRateLimit: mockCheckRateLimit,
    incrementUsage: mockIncrementUsage,
  }),
  DAILY_LIMITS: {
    chat: 50,
    transform: 100,
    image: 10,
  },
}));

vi.mock('@/lib/prompts', () => ({
  PLATFORM_NAMES: {
    twitter: 'Twitter',
    xiaohongshu: '小红书',
    wechat: '朋友圈',
    linkedin: 'LinkedIn',
  },
}));

// Mock the NoteCardTemplate component
vi.mock('./NoteCardTemplate', () => ({
  NoteCardTemplate: vi.fn(() => <div data-testid="note-card">Mock Note Card</div>),
}));

// Mock the generate-image utilities
vi.mock('@/lib/generate-image', () => ({
  generateImageFromElement: vi.fn(),
  downloadImage: vi.fn(),
  copyImageToClipboard: vi.fn(),
}));

// Helper to create a mock streaming response
function createMockStreamResponse(text: string) {
  const encoder = new TextEncoder();
  const fullData = text.split('').map(char => `data: ${JSON.stringify({ text: char })}\n\n`).join('') + 'data: [DONE]\n\n';

  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(fullData));
      controller.close();
    }
  });
}

// Helper to create mock fetch that returns new stream each call
function createMockFetch(responses: string[]) {
  let callIndex = 0;
  return vi.fn().mockImplementation(() => {
    const text = responses[callIndex] || responses[responses.length - 1];
    callIndex++;
    return Promise.resolve({
      ok: true,
      body: createMockStreamResponse(text),
    });
  });
}

describe('TransformResult', () => {
  const mockOnClose = vi.fn();
  const defaultProps = {
    content: 'Test content for transformation',
    onClose: mockOnClose,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockReturnValue({ allowed: true, remaining: 50 });
  });

  describe('Default Language Settings', () => {
    it('should default Twitter to English', async () => {
      const fetchMock = global.fetch as Mock;
      fetchMock.mockResolvedValueOnce({
        ok: true,
        body: createMockStreamResponse('Hello world'),
      });

      render(<TransformResult {...defaultProps} />);

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalled();
      });

      const callArgs = fetchMock.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.platform).toBe('twitter');
      expect(body.language).toBe('en');
    });

    it('should show EN button as active for Twitter by default', async () => {
      const fetchMock = global.fetch as Mock;
      fetchMock.mockResolvedValueOnce({
        ok: true,
        body: createMockStreamResponse('Test'),
      });

      render(<TransformResult {...defaultProps} />);

      await waitFor(() => {
        const enButton = screen.getByRole('button', { name: 'EN' });
        expect(enButton).toHaveClass('bg-[#2a2a2a]');
      });
    });

    it('should default 小红书 to Chinese', async () => {
      const fetchMock = global.fetch as Mock;
      // First call for Twitter auto-load
      fetchMock.mockResolvedValueOnce({
        ok: true,
        body: createMockStreamResponse('Twitter content'),
      });
      // Second call for 小红书
      fetchMock.mockResolvedValueOnce({
        ok: true,
        body: createMockStreamResponse('小红书内容'),
      });

      render(<TransformResult {...defaultProps} />);

      // Wait for Twitter to load
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });

      // Click on 小红书 tab
      const xiaohongshuTab = screen.getByRole('button', { name: /小红书/ });
      fireEvent.click(xiaohongshuTab);

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(2);
      });

      const secondCallArgs = fetchMock.mock.calls[1];
      const body = JSON.parse(secondCallArgs[1].body);

      expect(body.platform).toBe('xiaohongshu');
      expect(body.language).toBe('zh');
    });

    it('should default LinkedIn to English', async () => {
      const fetchMock = global.fetch as Mock;
      fetchMock.mockResolvedValueOnce({
        ok: true,
        body: createMockStreamResponse('Twitter'),
      });
      fetchMock.mockResolvedValueOnce({
        ok: true,
        body: createMockStreamResponse('LinkedIn'),
      });

      render(<TransformResult {...defaultProps} />);

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });

      const linkedinTab = screen.getByRole('button', { name: /LinkedIn/ });
      fireEvent.click(linkedinTab);

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(2);
      });

      const body = JSON.parse(fetchMock.mock.calls[1][1].body);
      expect(body.platform).toBe('linkedin');
      expect(body.language).toBe('en');
    });

    it('should default 朋友圈 to Chinese', async () => {
      const fetchMock = global.fetch as Mock;
      fetchMock.mockResolvedValueOnce({
        ok: true,
        body: createMockStreamResponse('Twitter'),
      });
      fetchMock.mockResolvedValueOnce({
        ok: true,
        body: createMockStreamResponse('朋友圈'),
      });

      render(<TransformResult {...defaultProps} />);

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });

      const wechatTab = screen.getByRole('button', { name: /朋友圈/ });
      fireEvent.click(wechatTab);

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(2);
      });

      const body = JSON.parse(fetchMock.mock.calls[1][1].body);
      expect(body.platform).toBe('wechat');
      expect(body.language).toBe('zh');
    });
  });

  describe('Language Toggle', () => {
    it('should switch Twitter from English to Chinese when clicking 中文 button', async () => {
      const fetchMock = global.fetch as Mock;
      fetchMock.mockResolvedValueOnce({
        ok: true,
        body: createMockStreamResponse('English content'),
      });
      fetchMock.mockResolvedValueOnce({
        ok: true,
        body: createMockStreamResponse('中文内容'),
      });

      render(<TransformResult {...defaultProps} />);

      // Wait for initial load
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });

      // Click Chinese button
      const zhButton = screen.getByRole('button', { name: '中文' });
      fireEvent.click(zhButton);

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(2);
      });

      const secondCallBody = JSON.parse(fetchMock.mock.calls[1][1].body);
      expect(secondCallBody.language).toBe('zh');
      expect(secondCallBody.platform).toBe('twitter');
    });

    it('should switch LinkedIn from English to Chinese', async () => {
      const fetchMock = global.fetch as Mock;
      fetchMock.mockResolvedValueOnce({
        ok: true,
        body: createMockStreamResponse('Twitter'),
      });
      fetchMock.mockResolvedValueOnce({
        ok: true,
        body: createMockStreamResponse('LinkedIn EN'),
      });
      fetchMock.mockResolvedValueOnce({
        ok: true,
        body: createMockStreamResponse('LinkedIn 中文'),
      });

      render(<TransformResult {...defaultProps} />);

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

      // Switch to LinkedIn
      const linkedinTab = screen.getByRole('button', { name: /LinkedIn/ });
      fireEvent.click(linkedinTab);

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

      // Switch to Chinese
      const zhButton = screen.getByRole('button', { name: '中文' });
      fireEvent.click(zhButton);

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));

      const thirdCallBody = JSON.parse(fetchMock.mock.calls[2][1].body);
      expect(thirdCallBody.platform).toBe('linkedin');
      expect(thirdCallBody.language).toBe('zh');
    });

    it('should switch 小红书 from Chinese to English', async () => {
      const fetchMock = global.fetch as Mock;
      fetchMock.mockResolvedValueOnce({
        ok: true,
        body: createMockStreamResponse('Twitter'),
      });
      fetchMock.mockResolvedValueOnce({
        ok: true,
        body: createMockStreamResponse('小红书中文'),
      });
      fetchMock.mockResolvedValueOnce({
        ok: true,
        body: createMockStreamResponse('Xiaohongshu EN'),
      });

      render(<TransformResult {...defaultProps} />);

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

      // Switch to 小红书
      const xiaohongshuTab = screen.getByRole('button', { name: /小红书/ });
      fireEvent.click(xiaohongshuTab);

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

      // Switch to English
      const enButton = screen.getByRole('button', { name: 'EN' });
      fireEvent.click(enButton);

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));

      const thirdCallBody = JSON.parse(fetchMock.mock.calls[2][1].body);
      expect(thirdCallBody.platform).toBe('xiaohongshu');
      expect(thirdCallBody.language).toBe('en');
    });

    it('should preserve language setting after switching length', async () => {
      const fetchMock = createMockFetch(['Content', 'Content ZH', 'Content ZH Detailed']);
      global.fetch = fetchMock;

      render(<TransformResult {...defaultProps} />);

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

      // First switch to Chinese
      const zhButton = screen.getByRole('button', { name: '中文' });
      fireEvent.click(zhButton);

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

      // Then switch length to detailed
      const detailedButton = screen.getByRole('button', { name: '详细' });
      fireEvent.click(detailedButton);

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));

      const thirdCallBody = JSON.parse(fetchMock.mock.calls[2][1].body);
      expect(thirdCallBody.language).toBe('zh');
      expect(thirdCallBody.length).toBe('detailed');
    });
  });

  describe('Length Toggle', () => {
    it('should switch from normal to concise length', async () => {
      const fetchMock = createMockFetch(['Content', 'Concise']);
      global.fetch = fetchMock;

      render(<TransformResult {...defaultProps} />);

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

      // Click concise button
      const conciseButton = screen.getByRole('button', { name: '简洁' });
      fireEvent.click(conciseButton);

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

      const secondCallBody = JSON.parse(fetchMock.mock.calls[1][1].body);
      expect(secondCallBody.length).toBe('concise');
    });

    it('should switch from normal to detailed length', async () => {
      const fetchMock = createMockFetch(['Content', 'Detailed']);
      global.fetch = fetchMock;

      render(<TransformResult {...defaultProps} />);

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

      const detailedButton = screen.getByRole('button', { name: '详细' });
      fireEvent.click(detailedButton);

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

      const secondCallBody = JSON.parse(fetchMock.mock.calls[1][1].body);
      expect(secondCallBody.length).toBe('detailed');
    });

    it('should preserve language setting when changing length', async () => {
      const fetchMock = createMockFetch(['Content EN', 'Content EN Detailed']);
      global.fetch = fetchMock;

      render(<TransformResult {...defaultProps} />);

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

      // Initial call should be English
      expect(JSON.parse(fetchMock.mock.calls[0][1].body).language).toBe('en');

      // Change length - language should stay English
      const detailedButton = screen.getByRole('button', { name: '详细' });
      fireEvent.click(detailedButton);

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

      const secondCallBody = JSON.parse(fetchMock.mock.calls[1][1].body);
      expect(secondCallBody.length).toBe('detailed');
      expect(secondCallBody.language).toBe('en');
    });
  });

  describe('Platform Switching', () => {
    it('should load platform with its default language when switching tabs', async () => {
      const fetchMock = createMockFetch(['Twitter', 'Xiaohongshu', 'LinkedIn', 'Wechat']);
      global.fetch = fetchMock;

      render(<TransformResult {...defaultProps} />);

      // Twitter loads first (EN)
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      expect(JSON.parse(fetchMock.mock.calls[0][1].body).language).toBe('en');

      // Switch to 小红书 (ZH)
      const xiaohongshuTab = screen.getByRole('button', { name: /小红书/ });
      fireEvent.click(xiaohongshuTab);

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
      expect(JSON.parse(fetchMock.mock.calls[1][1].body).language).toBe('zh');

      // Switch to LinkedIn (EN)
      const linkedinTab = screen.getByRole('button', { name: /LinkedIn/ });
      fireEvent.click(linkedinTab);

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
      expect(JSON.parse(fetchMock.mock.calls[2][1].body).language).toBe('en');

      // Switch to 朋友圈 (ZH)
      const wechatTab = screen.getByRole('button', { name: /朋友圈/ });
      fireEvent.click(wechatTab);

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
      expect(JSON.parse(fetchMock.mock.calls[3][1].body).language).toBe('zh');
    });

    it('should preserve language setting when returning to a platform', async () => {
      const fetchMock = createMockFetch(['Twitter EN', 'Twitter ZH', 'Xiaohongshu ZH']);
      global.fetch = fetchMock;

      render(<TransformResult {...defaultProps} />);

      // Twitter loads first (EN)
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

      // Change Twitter to Chinese
      const zhButton = screen.getByRole('button', { name: '中文' });
      fireEvent.click(zhButton);
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

      // Switch to 小红书
      const xiaohongshuTab = screen.getByRole('button', { name: /小红书/ });
      fireEvent.click(xiaohongshuTab);
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));

      // Switch back to Twitter - should NOT reload since it already has content
      const twitterTab = screen.getByRole('button', { name: /Twitter/ });
      fireEvent.click(twitterTab);

      // Should still be 3 calls (no new fetch because Twitter already loaded)
      expect(fetchMock).toHaveBeenCalledTimes(3);

      // Verify Chinese button is still active for Twitter
      await waitFor(() => {
        const zhButtonAfter = screen.getByRole('button', { name: '中文' });
        expect(zhButtonAfter).toHaveClass('bg-[#2a2a2a]');
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should show alert when rate limit exceeded', async () => {
      mockCheckRateLimit.mockReturnValue({ allowed: false, remaining: 0 });
      const alertMock = global.alert as Mock;

      const fetchMock = global.fetch as Mock;

      render(<TransformResult {...defaultProps} />);

      // Should show alert
      await waitFor(() => {
        expect(alertMock).toHaveBeenCalledWith(
          expect.stringContaining('今日转换次数已用完')
        );
      });

      // Should not make any fetch calls
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should increment usage when transform is successful', async () => {
      const fetchMock = createMockFetch(['Content']);
      global.fetch = fetchMock;

      render(<TransformResult {...defaultProps} />);

      await waitFor(() => {
        expect(mockIncrementUsage).toHaveBeenCalledWith('transform');
      });
    });
  });

  describe('Regenerate Button', () => {
    it('should use current language and length settings when regenerating', async () => {
      const fetchMock = createMockFetch([
        'Version 1---Version 2',
        'Chinese Version',
        'Chinese Detailed',
        'Regenerated Chinese Detailed'
      ]);
      global.fetch = fetchMock;

      render(<TransformResult {...defaultProps} />);

      // Wait for initial load
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

      // Wait for content to appear and streaming to complete
      await waitFor(() => {
        expect(screen.getByText(/Version 1/)).toBeInTheDocument();
      });

      // Change to Chinese
      const zhButton = screen.getByRole('button', { name: '中文' });
      fireEvent.click(zhButton);
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

      // Change to detailed
      const detailedButton = screen.getByRole('button', { name: '详细' });
      fireEvent.click(detailedButton);
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));

      // Wait for REGENERATE button to appear (streaming must be complete)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'REGENERATE' })).toBeInTheDocument();
      });

      // Click regenerate
      const regenerateButton = screen.getByRole('button', { name: 'REGENERATE' });
      fireEvent.click(regenerateButton);

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));

      const lastCallBody = JSON.parse(fetchMock.mock.calls[3][1].body);
      expect(lastCallBody.language).toBe('zh');
      expect(lastCallBody.length).toBe('detailed');
    });
  });

  describe('API Request Format', () => {
    it('should include all required parameters in API request', async () => {
      const fetchMock = createMockFetch(['Content']);
      global.fetch = fetchMock;

      render(<TransformResult {...defaultProps} />);

      await waitFor(() => expect(fetchMock).toHaveBeenCalled());

      const [url, options] = fetchMock.mock.calls[0];
      const body = JSON.parse(options.body);

      expect(url).toBe('/api/transform');
      expect(body).toHaveProperty('content', 'Test content for transformation');
      expect(body).toHaveProperty('platform', 'twitter');
      expect(body).toHaveProperty('length', 'normal');
      expect(body).toHaveProperty('language', 'en');
      expect(body).toHaveProperty('stream', true);
    });

    it('should use streaming mode for user-triggered transforms', async () => {
      const fetchMock = createMockFetch(['Content']);
      global.fetch = fetchMock;

      render(<TransformResult {...defaultProps} />);

      await waitFor(() => expect(fetchMock).toHaveBeenCalled());

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.stream).toBe(true);
    });
  });
});
