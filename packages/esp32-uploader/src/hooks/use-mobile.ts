/**
 * Mobile Responsiveness Hook
 * Detects if the current viewport is mobile-sized
 */

import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT = 768; // Ant Design's tablet breakpoint

export function useMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check initial size
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    checkMobile();

    // Listen for window resize
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
}
