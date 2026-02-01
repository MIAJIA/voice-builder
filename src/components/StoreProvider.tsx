'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Check if already hydrated (Zustand persist has an internal flag)
    const unsubFinishHydration = useStore.persist.onFinishHydration(() => {
      setIsHydrated(true);
    });

    // Manually trigger rehydration
    useStore.persist.rehydrate();

    // If already hydrated synchronously, set state
    if (useStore.persist.hasHydrated()) {
      setIsHydrated(true);
    }

    return () => {
      unsubFinishHydration();
    };
  }, []);

  // Show loading until hydrated to prevent flash
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full" />
      </div>
    );
  }

  return <>{children}</>;
}
