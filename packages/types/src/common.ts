/**
 * Common ID type
 */
export type ID = string | number;

/**
 * Nullable type helper
 */
export type Nullable<T> = T | null;

/**
 * Make all properties optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Extract the type of array elements
 */
export type ArrayElement<T> = T extends readonly (infer E)[] ? E : never;

/**
 * Theme type
 */
export type Theme = "light" | "dark" | "system";

/**
 * Status type for common entities
 */
export type Status = "pending" | "active" | "inactive" | "archived";

/**
 * Base entity with timestamps
 */
export interface BaseEntity {
  id: ID;
  createdAt: Date;
  updatedAt: Date;
}
