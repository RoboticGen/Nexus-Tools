/**
 * Skulpt Loader - Load and configure Skulpt library
 */

import type { SkulptAPI, SkulptConfigureOptions } from './types';

// Extend window interface
declare global {
  interface Window {
    Sk?: SkulptAPI;
  }
}

/**
 * Load Skulpt library from CDN
 */
export async function loadSkulptLibrary(): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('Skulpt can only be loaded in browser environment');
  }

  // Check if already loaded
  if (window.Sk) {
    return;
  }

  return new Promise((resolve, reject) => {
    // Load main Skulpt library
    const skulptScript = document.createElement("script");
    skulptScript.src = "https://skulpt.org/js/skulpt.min.js";
    skulptScript.async = true;

    skulptScript.onload = () => {
      // Load Skulpt stdlib
      const stdlibScript = document.createElement("script");
      stdlibScript.src = "https://skulpt.org/js/skulpt-stdlib.js";
      stdlibScript.async = true;

      stdlibScript.onload = () => {
        resolve();
      };

      stdlibScript.onerror = () => {
        reject(new Error('Failed to load Skulpt stdlib'));
      };

      document.body.appendChild(stdlibScript);
    };

    skulptScript.onerror = () => {
      reject(new Error('Failed to load Skulpt'));
    };

    document.body.appendChild(skulptScript);
  });
}

/**
 * Configure Skulpt with options
 */
export function configureSkulpt(options: SkulptConfigureOptions): void {
  if (typeof window === 'undefined' || !window.Sk) {
    throw new Error('Skulpt is not loaded');
  }

  window.Sk.configure(options);
}

/**
 * Configure turtle graphics target
 */
export function configureTurtleGraphics(canvasId: string = 'turtle-canvas'): void {
  if (typeof window === 'undefined' || !window.Sk) {
    return;
  }

  if (!window.Sk.TurtleGraphics) {
    (window.Sk as any).TurtleGraphics = {
      target: canvasId,
    };
  } else {
    window.Sk.TurtleGraphics.target = canvasId;
  }
}

/**
 * Get the Skulpt API instance
 */
export function getSkulpt(): SkulptAPI | undefined {
  return typeof window !== 'undefined' ? window.Sk : undefined;
}
