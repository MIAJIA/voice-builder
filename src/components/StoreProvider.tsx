'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Manually rehydrate the store from localStorage
    useStore.persist.rehydrate();
    setIsHydrated(true);
  }, []);

  // Show nothing until hydrated to prevent flash
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full" />
      </div>
    );
  }

  return <>{children}</>;
}
