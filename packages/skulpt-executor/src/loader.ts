/** Skulpt Loader - Load and configure Skulpt library */

import type { SkulptAPI, SkulptConfigureOptions } from './types';

// Extend window interface
declare global {
  interface Window {
    Sk?: SkulptAPI;
  }
}

/** Load Skulpt library from CDN */
export async function loadSkulptLibrary(): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('Skulpt can only be loaded in browser environment');
  }

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

/** Configure Skulpt with options */
export function configureSkulpt(options: SkulptConfigureOptions): void {
  if (typeof window === 'undefined' || !window.Sk) {
    throw new Error('Skulpt is not loaded');
  }

  window.Sk.configure(options);
}

/**
 * Configure turtle graphics target.
 *
 * Skulpt draws its trail canvas at a fixed size (400x400 unless told
 * otherwise) and never re-measures it, so left alone it renders small and
 * adrift inside whatever panel hosts it. Reading the target element's own
 * box here and passing that through as `width`/`height` makes Skulpt size
 * the canvas to fill the space the panel actually reserved for it. Call
 * this again before each run — the panel is resizable, so the reserved
 * space isn't fixed either.
 */
export function configureTurtleGraphics(canvasId: string = 'turtle-canvas'): void {
  if (typeof window === 'undefined' || !window.Sk) {
    return;
  }

  const target = document.getElementById(canvasId);
  const width = target?.clientWidth;
  const height = target?.clientHeight;

  if (!window.Sk.TurtleGraphics) {
    (window.Sk as any).TurtleGraphics = { target: canvasId };
  } else {
    window.Sk.TurtleGraphics.target = canvasId;
  }

  if (width) window.Sk.TurtleGraphics.width = width;
  if (height) window.Sk.TurtleGraphics.height = height;
}

/** Get the Skulpt API instance */
export function getSkulpt(): SkulptAPI | undefined {
  return typeof window !== 'undefined' ? window.Sk : undefined;
}
