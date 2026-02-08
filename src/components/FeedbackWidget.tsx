'use client';

/**
 * Feedback Widget
 *
 * A floating feedback button that opens a modal for users to submit feedback.
 * Supports bug reports, feature requests, and general feedback.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import type { FeedbackType } from '@/lib/notion-feedback';
import { analytics } from '@/lib/posthog';

interface FeedbackWidgetProps {
  /** Position of the floating button */
  position?: 'bottom-right' | 'bottom-left';
  /** Page context for tracking */
  page?: string;
}

const FEEDBACK_TYPES: { value: FeedbackType; label: string; emoji: string; placeholder: string }[] = [
  {
    value: 'bug',
    label: 'Bug',
    emoji: '🐛',
    placeholder: '描述一下你遇到的问题...\n\n什么操作导致了这个问题？\n预期的结果是什么？',
  },
  {
    value: 'feature',
    label: '建议',
    emoji: '💡',
    placeholder: '你希望 Voice Builder 添加什么功能？\n\n这个功能会帮你解决什么问题？',
  },
  {
    value: 'testimonial',
    label: '好评',
    emoji: '⭐',
    placeholder: 'Voice Builder 帮到你了吗？\n\n分享一下你的使用体验！',
  },
  {
    value: 'general',
    label: '其他',
    emoji: '💬',
    placeholder: '有什么想说的？',
  },
];

export function FeedbackWidget({ position = 'bottom-right', page }: FeedbackWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('general');
  const [content, setContent] = useState('');
  const [contact, setContact] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<'success' | 'error' | null>(null);

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;

    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: feedbackType,
          content: content.trim(),
          userContact: contact.trim() || undefined,
          source: 'in-app',
          metadata: {
            page: page || window.location.pathname,
            userAgent: navigator.userAgent,
            screenSize: `${window.innerWidth}x${window.innerHeight}`,
          },
        }),
      });

      if (response.ok) {
        setSubmitResult('success');
        analytics.trackFeedbackSubmitted(feedbackType);
        setTimeout(() => {
          setIsOpen(false);
          setContent('');
          setContact('');
          setSubmitResult(null);
        }, 2000);
      } else {
        setSubmitResult('error');
      }
    } catch {
      setSubmitResult('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedType = FEEDBACK_TYPES.find((t) => t.value === feedbackType)!;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed ${positionClasses[position]} z-50 p-3 bg-[#2a2a2a] text-white rounded-full shadow-lg hover:bg-[#3a3a3a] transition-all hover:scale-110`}
        title="发送反馈"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      {/* Modal overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
        >
          <Card
            className="w-full max-w-md bg-[#fffef9] border-2 border-[#d4cfc4] p-6"
            style={{ boxShadow: '8px 8px 0 #d4cfc4' }}
            onClick={(e) => e.stopPropagation()}
          >
            {submitResult === 'success' ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🎉</div>
                <h3 className="text-lg font-bold text-[#2a2a2a]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  感谢你的反馈！
                </h3>
                <p className="text-gray-500 text-sm mt-2">我们会认真阅读每一条反馈</p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-[#2a2a2a]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                    发送反馈
                  </h3>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                {/* Feedback type selector */}
                <div className="flex gap-2 mb-4">
                  {FEEDBACK_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setFeedbackType(type.value)}
                      className={`flex-1 py-2 px-3 text-sm border-2 transition-all ${
                        feedbackType === type.value
                          ? 'border-[#2a2a2a] bg-[#f4f1ea]'
                          : 'border-[#d4cfc4] hover:border-[#2a2a2a]'
                      }`}
                      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    >
                      <span className="mr-1">{type.emoji}</span>
                      {type.label}
                    </button>
                  ))}
                </div>

                {/* Content textarea */}
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={selectedType.placeholder}
                  className="min-h-[120px] mb-4 border-2 border-[#d4cfc4] bg-[#fffef9]"
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                />

                {/* Contact input (optional) */}
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="联系方式（可选）- 方便我们回复你"
                  className="w-full px-3 py-2 mb-4 text-sm border-2 border-[#d4cfc4] bg-[#fffef9]"
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                />

                {/* Error message */}
                {submitResult === 'error' && (
                  <div className="text-red-500 text-sm mb-4" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                    提交失败，请稍后再试
                  </div>
                )}

                {/* Submit button */}
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                    className="border-[#d4cfc4]"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    取消
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!content.trim() || isSubmitting}
                    className="bg-[#2a2a2a] text-[#f4f1ea]"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    {isSubmitting ? '提交中...' : '提交反馈'}
                  </Button>
                </div>
              </>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
