/**
 * Utility function to concatenate class names
 * Provides backward compatibility for className merging
 */
export function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}
