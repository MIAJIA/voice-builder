'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false);

  // Simple client-side check - Zustand persist auto-hydrates when skipHydration is not set
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Wait for client-side to ensure localStorage is available and hydrated
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full" />
      </div>
    );
  }

  return <>{children}</>;
}
