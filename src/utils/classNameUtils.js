/**
 * Class Name Utilities
 * Helper functions for managing CSS class names
 */

import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines and merges Tailwind CSS classes, removing duplicates and conflicts
 * @param {...any} inputs - Class names, objects, or arrays to merge
 * @returns {string} Merged class string
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default cn;
