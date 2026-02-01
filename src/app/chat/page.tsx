'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { ChatInterface } from '@/components/ChatInterface';
import { TransformResult } from '@/components/TransformResult';

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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
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

      <main className="max-w-4xl mx-auto px-4 py-6 h-[calc(100vh-73px)]">
        <ChatInterface
          initialText={initialText}
          initialImage={initialImage}
          onTransform={handleTransform}
        />
      </main>

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
