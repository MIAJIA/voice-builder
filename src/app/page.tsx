'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChatInterface } from '@/components/ChatInterface';
import { TransformResult } from '@/components/TransformResult';
import { ConversationSidebar } from '@/components/ConversationSidebar';
import { useStore } from '@/lib/store';

export default function Home() {
  const router = useRouter();
  const { hasCompletedOnboarding } = useStore();
  const [transformContent, setTransformContent] = useState<string | null>(null);
  const [transformImages, setTransformImages] = useState<string[]>([]);

  // Redirect to onboarding if not completed
  useEffect(() => {
    if (!hasCompletedOnboarding) {
      router.push('/onboarding');
    }
  }, [hasCompletedOnboarding, router]);

  const handleTransform = (content: string, images: string[]) => {
    setTransformContent(content);
    setTransformImages(images);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b shrink-0">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">Voice Builder</h1>
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
            <ChatInterface onTransform={handleTransform} />
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
