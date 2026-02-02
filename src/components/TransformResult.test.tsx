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
  AUDIENCE_LABELS: {
    peers: '同行',
    beginners: '小白',
    leadership: '老板/客户',
    friends: '朋友',
  },
  ANGLE_LABELS: {
    sharing: '分享经验',
    asking: '求助讨论',
    opinion: '观点输出',
    casual: '随便记录',
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

    it('should show EN in collapsed settings summary for Twitter by default', async () => {
      const fetchMock = global.fetch as Mock;
      fetchMock.mockResolvedValueOnce({
        ok: true,
        body: createMockStreamResponse('Test'),
      });

      render(<TransformResult {...defaultProps} />);

      await waitFor(() => {
        // Check that the collapsed settings summary shows EN
        const advancedToggle = screen.getByRole('button', { name: /更多设置/ });
        expect(advancedToggle).toHaveTextContent('EN');
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

      // Expand advanced settings first
      const advancedToggle = screen.getByRole('button', { name: /更多设置/ });
      fireEvent.click(advancedToggle);

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

      // Expand advanced settings first
      const advancedToggle = screen.getByRole('button', { name: /更多设置/ });
      fireEvent.click(advancedToggle);

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

      // Expand advanced settings first
      const advancedToggle = screen.getByRole('button', { name: /更多设置/ });
      fireEvent.click(advancedToggle);

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

      // Expand advanced settings first
      const advancedToggle = screen.getByRole('button', { name: /更多设置/ });
      fireEvent.click(advancedToggle);

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

  describe('Audience and Angle Toggle', () => {
    it('should switch audience from peers to beginners', async () => {
      const fetchMock = createMockFetch(['Content', 'Beginners Content']);
      global.fetch = fetchMock;

      render(<TransformResult {...defaultProps} />);

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

      // Expand advanced settings first
      const advancedToggle = screen.getByRole('button', { name: /更多设置/ });
      fireEvent.click(advancedToggle);

      // Click on 小白 (beginners)
      const beginnersButton = screen.getByRole('button', { name: '小白' });
      fireEvent.click(beginnersButton);

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

      const secondCallBody = JSON.parse(fetchMock.mock.calls[1][1].body);
      expect(secondCallBody.audience).toBe('beginners');
    });

    it('should switch angle from sharing to opinion', async () => {
      const fetchMock = createMockFetch(['Content', 'Opinion Content']);
      global.fetch = fetchMock;

      render(<TransformResult {...defaultProps} />);

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

      // Expand advanced settings first
      const advancedToggle = screen.getByRole('button', { name: /更多设置/ });
      fireEvent.click(advancedToggle);

      // Click on 观点输出 (opinion)
      const opinionButton = screen.getByRole('button', { name: '观点输出' });
      fireEvent.click(opinionButton);

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

      const secondCallBody = JSON.parse(fetchMock.mock.calls[1][1].body);
      expect(secondCallBody.angle).toBe('opinion');
    });

    it('should default 朋友圈 to friends audience and casual angle', async () => {
      const fetchMock = createMockFetch(['Twitter', 'Wechat']);
      global.fetch = fetchMock;

      render(<TransformResult {...defaultProps} />);

      // Wait for Twitter to load
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

      // Switch to 朋友圈
      const wechatTab = screen.getByRole('button', { name: /朋友圈/ });
      fireEvent.click(wechatTab);

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

      const wechatCallBody = JSON.parse(fetchMock.mock.calls[1][1].body);
      expect(wechatCallBody.audience).toBe('friends');
      expect(wechatCallBody.angle).toBe('casual');
    });

    it('should preserve audience and angle when switching length', async () => {
      const fetchMock = createMockFetch(['Content', 'Opinion', 'Opinion Detailed']);
      global.fetch = fetchMock;

      render(<TransformResult {...defaultProps} />);

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

      // Expand advanced settings first
      const advancedToggle = screen.getByRole('button', { name: /更多设置/ });
      fireEvent.click(advancedToggle);

      // Change angle to opinion
      const opinionButton = screen.getByRole('button', { name: '观点输出' });
      fireEvent.click(opinionButton);

      // Wait for the opinion call
      await waitFor(() => {
        const twitterCalls = fetchMock.mock.calls.filter((call: [string, { body: string }]) => {
          const body = JSON.parse(call[1].body);
          return body.platform === 'twitter' && body.stream === true;
        });
        return expect(twitterCalls.length).toBeGreaterThanOrEqual(2);
      });

      // Change length to detailed
      const detailedButton = screen.getByRole('button', { name: '详细' });
      fireEvent.click(detailedButton);

      // Wait for the detailed call
      await waitFor(() => {
        const twitterCalls = fetchMock.mock.calls.filter((call: [string, { body: string }]) => {
          const body = JSON.parse(call[1].body);
          return body.platform === 'twitter' && body.stream === true;
        });
        return expect(twitterCalls.length).toBeGreaterThanOrEqual(3);
      });

      // Find the last twitter streaming call
      const twitterCalls = fetchMock.mock.calls.filter((call: [string, { body: string }]) => {
        const body = JSON.parse(call[1].body);
        return body.platform === 'twitter' && body.stream === true;
      });
      const lastCallBody = JSON.parse(twitterCalls[twitterCalls.length - 1][1].body);
      expect(lastCallBody.angle).toBe('opinion');
      expect(lastCallBody.length).toBe('detailed');
    });

    it('should show current settings in collapsed state', async () => {
      const fetchMock = createMockFetch(['Content']);
      global.fetch = fetchMock;

      render(<TransformResult {...defaultProps} />);

      await waitFor(() => expect(fetchMock).toHaveBeenCalled());

      // Should show current settings in collapsed toggle button
      const advancedToggle = screen.getByRole('button', { name: /更多设置/ });
      expect(advancedToggle).toHaveTextContent('同行');
      expect(advancedToggle).toHaveTextContent('分享经验');
      expect(advancedToggle).toHaveTextContent('EN');
    });
  });

  describe('Platform Switching', () => {
    it('should load platform with its default language when switching tabs', async () => {
      const fetchMock = createMockFetch(['Twitter', 'Xiaohongshu', 'LinkedIn', 'Wechat', 'extra', 'extra', 'extra', 'extra', 'extra']);
      global.fetch = fetchMock;

      render(<TransformResult {...defaultProps} />);

      // Twitter loads first (EN) - check the first twitter call
      await waitFor(() => expect(fetchMock).toHaveBeenCalled());
      const twitterCalls = fetchMock.mock.calls.filter((call: [string, { body: string }]) => {
        const body = JSON.parse(call[1].body);
        return body.platform === 'twitter';
      });
      expect(JSON.parse(twitterCalls[0][1].body).language).toBe('en');

      // Switch to 小红书 (ZH)
      const xiaohongshuTab = screen.getByRole('button', { name: /小红书/ });
      fireEvent.click(xiaohongshuTab);

      await waitFor(() => {
        const xhsCalls = fetchMock.mock.calls.filter((call: [string, { body: string }]) => {
          const body = JSON.parse(call[1].body);
          return body.platform === 'xiaohongshu' && body.stream === true;
        });
        return expect(xhsCalls.length).toBeGreaterThanOrEqual(1);
      });
      const xhsCalls = fetchMock.mock.calls.filter((call: [string, { body: string }]) => {
        const body = JSON.parse(call[1].body);
        return body.platform === 'xiaohongshu' && body.stream === true;
      });
      expect(JSON.parse(xhsCalls[0][1].body).language).toBe('zh');

      // Switch to LinkedIn (EN)
      const linkedinTab = screen.getByRole('button', { name: /LinkedIn/ });
      fireEvent.click(linkedinTab);

      await waitFor(() => {
        const linkedinCalls = fetchMock.mock.calls.filter((call: [string, { body: string }]) => {
          const body = JSON.parse(call[1].body);
          return body.platform === 'linkedin' && body.stream === true;
        });
        return expect(linkedinCalls.length).toBeGreaterThanOrEqual(1);
      });
      const linkedinCalls = fetchMock.mock.calls.filter((call: [string, { body: string }]) => {
        const body = JSON.parse(call[1].body);
        return body.platform === 'linkedin' && body.stream === true;
      });
      expect(JSON.parse(linkedinCalls[0][1].body).language).toBe('en');

      // Switch to 朋友圈 (ZH)
      const wechatTab = screen.getByRole('button', { name: /朋友圈/ });
      fireEvent.click(wechatTab);

      await waitFor(() => {
        const wechatCalls = fetchMock.mock.calls.filter((call: [string, { body: string }]) => {
          const body = JSON.parse(call[1].body);
          return body.platform === 'wechat' && body.stream === true;
        });
        return expect(wechatCalls.length).toBeGreaterThanOrEqual(1);
      });
      const wechatCalls = fetchMock.mock.calls.filter((call: [string, { body: string }]) => {
        const body = JSON.parse(call[1].body);
        return body.platform === 'wechat' && body.stream === true;
      });
      expect(JSON.parse(wechatCalls[0][1].body).language).toBe('zh');
    });

    it('should preserve language setting when returning to a platform', async () => {
      const fetchMock = createMockFetch(['Twitter EN', 'Twitter ZH', 'Xiaohongshu ZH', 'extra', 'extra', 'extra', 'extra', 'extra']);
      global.fetch = fetchMock;

      render(<TransformResult {...defaultProps} />);

      // Twitter loads first (EN)
      await waitFor(() => expect(fetchMock).toHaveBeenCalled());

      // Wait for content to appear - wait for version_1 label to show
      await waitFor(() => {
        expect(screen.getByText(/version_1/)).toBeInTheDocument();
      });

      // Expand advanced settings first
      const advancedToggle = screen.getByRole('button', { name: /更多设置/ });
      fireEvent.click(advancedToggle);

      // Change Twitter to Chinese
      const zhButton = screen.getByRole('button', { name: '中文' });
      fireEvent.click(zhButton);

      // Wait for Chinese reload
      await waitFor(() => {
        const twitterZhCalls = fetchMock.mock.calls.filter((call: [string, { body: string }]) => {
          const body = JSON.parse(call[1].body);
          return body.platform === 'twitter' && body.language === 'zh' && body.stream === true;
        });
        return expect(twitterZhCalls.length).toBeGreaterThanOrEqual(1);
      });

      // Switch to 小红书
      const xiaohongshuTab = screen.getByRole('button', { name: /小红书/ });
      fireEvent.click(xiaohongshuTab);

      // Wait for xiaohongshu to load
      await waitFor(() => {
        const xhsCalls = fetchMock.mock.calls.filter((call: [string, { body: string }]) => {
          const body = JSON.parse(call[1].body);
          return body.platform === 'xiaohongshu' && body.stream === true;
        });
        return expect(xhsCalls.length).toBeGreaterThanOrEqual(1);
      });

      // Count Twitter streaming calls before switching back
      const twitterCallsBefore = fetchMock.mock.calls.filter((call: [string, { body: string }]) => {
        const body = JSON.parse(call[1].body);
        return body.platform === 'twitter' && body.stream === true;
      }).length;

      // Switch back to Twitter - should NOT reload since it already has content
      const twitterTab = screen.getByRole('button', { name: /Twitter/ });
      fireEvent.click(twitterTab);

      // Verify Chinese button is still active for Twitter
      await waitFor(() => {
        const zhButtonAfter = screen.getByRole('button', { name: '中文' });
        expect(zhButtonAfter).toHaveClass('bg-[#2a2a2a]');
      });

      // No new Twitter streaming calls should have been made
      const twitterCallsAfter = fetchMock.mock.calls.filter((call: [string, { body: string }]) => {
        const body = JSON.parse(call[1].body);
        return body.platform === 'twitter' && body.stream === true;
      }).length;
      expect(twitterCallsAfter).toBe(twitterCallsBefore);
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
        'Regenerated Chinese Detailed',
        'extra', 'extra', 'extra', 'extra', 'extra'
      ]);
      global.fetch = fetchMock;

      render(<TransformResult {...defaultProps} />);

      // Wait for initial load
      await waitFor(() => expect(fetchMock).toHaveBeenCalled());

      // Wait for content to appear and streaming to complete
      await waitFor(() => {
        expect(screen.getByText(/Version 1/)).toBeInTheDocument();
      });

      // Expand advanced settings first
      const advancedToggle = screen.getByRole('button', { name: /更多设置/ });
      fireEvent.click(advancedToggle);

      // Change to Chinese
      const zhButton = screen.getByRole('button', { name: '中文' });
      fireEvent.click(zhButton);

      // Wait for Chinese call
      await waitFor(() => {
        const zhCalls = fetchMock.mock.calls.filter((call: [string, { body: string }]) => {
          const body = JSON.parse(call[1].body);
          return body.platform === 'twitter' && body.language === 'zh';
        });
        return expect(zhCalls.length).toBeGreaterThanOrEqual(1);
      });

      // Change to detailed
      const detailedButton = screen.getByRole('button', { name: '详细' });
      fireEvent.click(detailedButton);

      // Wait for detailed call
      await waitFor(() => {
        const detailedCalls = fetchMock.mock.calls.filter((call: [string, { body: string }]) => {
          const body = JSON.parse(call[1].body);
          return body.platform === 'twitter' && body.length === 'detailed';
        });
        return expect(detailedCalls.length).toBeGreaterThanOrEqual(1);
      });

      // Wait for REGENERATE button to appear (streaming must be complete)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'REGENERATE' })).toBeInTheDocument();
      });

      // Click regenerate
      const regenerateButton = screen.getByRole('button', { name: 'REGENERATE' });
      const callCountBefore = fetchMock.mock.calls.filter((call: [string, { body: string }]) => {
        const body = JSON.parse(call[1].body);
        return body.platform === 'twitter' && body.stream === true;
      }).length;

      fireEvent.click(regenerateButton);

      // Wait for at least one more twitter streaming call after clicking regenerate
      await waitFor(() => {
        const twitterCalls = fetchMock.mock.calls.filter((call: [string, { body: string }]) => {
          const body = JSON.parse(call[1].body);
          return body.platform === 'twitter' && body.stream === true;
        });
        return expect(twitterCalls.length).toBeGreaterThan(callCountBefore);
      });

      // Find the last streaming call (the regenerate call)
      const streamingCalls = fetchMock.mock.calls.filter((call: [string, { body: string }]) => {
        const body = JSON.parse(call[1].body);
        return body.stream === true && body.platform === 'twitter';
      });
      const lastCallBody = JSON.parse(streamingCalls[streamingCalls.length - 1][1].body);
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
      expect(body).toHaveProperty('audience', 'peers');
      expect(body).toHaveProperty('angle', 'sharing');
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
