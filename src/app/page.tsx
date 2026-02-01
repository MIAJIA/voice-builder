'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CaptureInput } from '@/components/CaptureInput';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useStore, generateId } from '@/lib/store';

export default function Home() {
  const router = useRouter();
  const { captures, deleteCapture, addConversation, setCurrentConversationId, hasCompletedOnboarding } =
    useStore();

  // Redirect to onboarding if not completed
  useEffect(() => {
    if (!hasCompletedOnboarding) {
      router.push('/onboarding');
    }
  }, [hasCompletedOnboarding, router]);

  const handleStartChat = (text: string, image?: string) => {
    const newConversation = {
      id: generateId(),
      messages: [],
      timestamp: Date.now(),
    };
    addConversation(newConversation);
    setCurrentConversationId(newConversation.id);

    // Store text and image in sessionStorage (avoid URL length limits)
    if (text) {
      sessionStorage.setItem('chat-initial-text', text);
    } else {
      sessionStorage.removeItem('chat-initial-text');
    }
    if (image) {
      sessionStorage.setItem('chat-initial-image', image);
    } else {
      sessionStorage.removeItem('chat-initial-image');
    }

    const params = new URLSearchParams();
    if (text) params.set('hasText', '1');
    if (image) params.set('hasImage', '1');

    router.push(`/chat?${params.toString()}`);
  };

  const handleCaptureToChat = (
    captureId: string,
    text: string,
    image?: string
  ) => {
    const newConversation = {
      id: generateId(),
      captureId,
      messages: [],
      timestamp: Date.now(),
    };
    addConversation(newConversation);
    setCurrentConversationId(newConversation.id);

    // Store text and image in sessionStorage (avoid URL length limits)
    if (text) {
      sessionStorage.setItem('chat-initial-text', text);
    } else {
      sessionStorage.removeItem('chat-initial-text');
    }
    if (image) {
      sessionStorage.setItem('chat-initial-image', image);
    } else {
      sessionStorage.removeItem('chat-initial-image');
    }

    const params = new URLSearchParams();
    if (text) params.set('hasText', '1');
    if (image) params.set('hasImage', '1');

    router.push(`/chat?${params.toString()}`);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Voice Builder</h1>
          <div className="flex gap-4">
            <Link
              href="/chat"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Co-think
            </Link>
            <Link
              href="/profile"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Profile
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero section */}
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            帮你找到自己的 Voice
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            不需要 100% 确定才能分享。你的学习过程本身就有价值。
          </p>
        </div>

        {/* Capture Input */}
        <div className="mb-10">
          <CaptureInput onStartChat={handleStartChat} />
        </div>

        {/* Saved Captures */}
        {captures.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              保存的想法草稿
            </h3>
            <div className="grid gap-4">
              {captures.map((capture) => (
                <Card key={capture.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-gray-800 whitespace-pre-wrap line-clamp-3">
                        {capture.text || '(图片)'}
                      </p>
                      {capture.image && (
                        <img
                          src={capture.image}
                          alt="Captured"
                          className="mt-2 max-w-[200px] max-h-24 rounded border"
                        />
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {formatDate(capture.timestamp)}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() =>
                          handleCaptureToChat(
                            capture.id,
                            capture.text,
                            capture.image
                          )
                        }
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Co-think →
                      </button>
                      <button
                        onClick={() => deleteCapture(capture.id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {captures.length === 0 && (
          <div className="text-center py-10 text-gray-500">
            <p className="mb-2">还没有保存的想法</p>
            <p className="text-sm">
              在上方输入框中捕捉你的想法，或直接开始 Co-think
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center text-sm text-gray-500">
          <p>Voice Builder MVP v0.2</p>
          <p className="mt-1">输出倒逼输入，分享学习过程</p>
        </div>
      </footer>
    </div>
  );
}
