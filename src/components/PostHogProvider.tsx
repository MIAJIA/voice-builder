'use client';

/**
 * PostHog Provider
 *
 * Initializes PostHog analytics on the client side.
 * Wrap your app with this component to enable tracking.
 */

import { useEffect } from 'react';
import { analytics } from '@/lib/posthog';

interface PostHogProviderProps {
  children: React.ReactNode;
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  useEffect(() => {
    analytics.init({
      debug: process.env.NODE_ENV === 'development',
    });
  }, []);

  return <>{children}</>;
}
