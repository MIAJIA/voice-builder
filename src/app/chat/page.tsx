'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { ChatInterface } from '@/components/ChatInterface';
import { TransformResult } from '@/components/TransformResult';

function ChatContent() {
  const searchParams = useSearchParams();
  const initialText = searchParams.get('text') || undefined;
  const [transformContent, setTransformContent] = useState<string | null>(null);

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
          onTransform={(content) => setTransformContent(content)}
        />
      </main>

      {transformContent && (
        <TransformResult
          content={transformContent}
          onClose={() => setTransformContent(null)}
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
