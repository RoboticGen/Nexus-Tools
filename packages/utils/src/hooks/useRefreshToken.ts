"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

/**
 * Hook to monitor and handle token refresh
 * Alerts when token is about to expire
 */
export function useRefreshToken() {
  const { data: session } = useSession();
  const [timeUntilExpiry, setTimeUntilExpiry] = useState<number | null>(null);
  const [isAboutToExpire, setIsAboutToExpire] = useState(false);

  useEffect(() => {
    if (!session?.expiresAt) return;

    const checkTokenExpiry = () => {
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = session.expiresAt as number;
      const timeRemaining = expiresAt - now;

      setTimeUntilExpiry(timeRemaining);

      // Alert if less than 5 minutes remaining
      if (timeRemaining < 300 && timeRemaining > 0) {
        setIsAboutToExpire(true);
      } else {
        setIsAboutToExpire(false);
      }
    };

    // Check immediately
    checkTokenExpiry();

    // Check every minute
    const interval = setInterval(checkTokenExpiry, 60000);

    return () => clearInterval(interval);
  }, [session?.expiresAt]);

  return {
    timeUntilExpiry,
    isAboutToExpire,
    accessToken: session?.accessToken,
  };
}
