'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { ChatInterface } from '@/components/ChatInterface';
import { TransformResult } from '@/components/TransformResult';
import { ConversationSidebar } from '@/components/ConversationSidebar';

function ChatContent() {
  const searchParams = useSearchParams();
  const hasText = searchParams.get('hasText') === '1';
  const hasImage = searchParams.get('hasImage') === '1';

  const [initialText, setInitialText] = useState<string | undefined>(undefined);
  const [initialImage, setInitialImage] = useState<string | undefined>(
    undefined
  );
  const [transformContent, setTransformContent] = useState<string | null>(null);
  const [transformImages, setTransformImages] = useState<string[]>([]);

  // Read text and image from sessionStorage on mount
  useEffect(() => {
    if (hasText) {
      const text = sessionStorage.getItem('chat-initial-text');
      if (text) {
        setInitialText(text);
        sessionStorage.removeItem('chat-initial-text');
      }
    }
    if (hasImage) {
      const image = sessionStorage.getItem('chat-initial-image');
      if (image) {
        setInitialImage(image);
        sessionStorage.removeItem('chat-initial-image');
      }
    }
  }, [hasText, hasImage]);

  const handleTransform = (content: string, images: string[]) => {
    setTransformContent(content);
    setTransformImages(images);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b shrink-0">
        <div className="px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold text-gray-900">
            ← Voice Builder
          </Link>
          <Link
            href="/profile"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            设置 Profile
          </Link>
        </div>
      </header>

      {/* Main content with sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <ConversationSidebar />

        {/* Chat area */}
        <main className="flex-1 p-4 overflow-hidden">
          <div className="max-w-3xl mx-auto h-full">
            <ChatInterface
              initialText={initialText}
              initialImage={initialImage}
              onTransform={handleTransform}
            />
          </div>
        </main>
      </div>

      {transformContent && (
        <TransformResult
          content={transformContent}
          images={transformImages}
          onClose={() => {
            setTransformContent(null);
            setTransformImages([]);
          }}
        />
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          加载中...
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
