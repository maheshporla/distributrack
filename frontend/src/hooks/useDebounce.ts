import { useEffect, useState } from "react";

/**
 * Debounces a value by `delay` milliseconds. The returned value only
 * updates after the input has been still for the specified delay.
 * Useful for throttling search-as-you-type requests.
 *
 * @example
 * const [query, setQuery] = useState("");
 * const debouncedQuery = useDebounce(query, 400);
 * // debouncedQuery updates 400ms after the user stops typing
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
