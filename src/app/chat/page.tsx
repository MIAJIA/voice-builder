'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Redirect /chat to homepage since they're now merged
export default function ChatPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      跳转中...
    </div>
  );
}
