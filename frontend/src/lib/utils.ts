import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind class names safely, resolving conflicting utility
 * classes (e.g. "px-2" vs "px-4") in favor of the later one.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
