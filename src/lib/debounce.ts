/**
 * Creates a debounced version of a function that delays execution
 * until after the specified delay has elapsed since the last call.
 * (Trailing edge debounce)
 *
 * Returns a debounced function with:
 * - cancel(): cancels any pending execution
 * - flush(): immediately executes any pending call
 */
export function debounce<T extends (...args: unknown[]) => void | Promise<void>>(
  fn: T,
  delay: number
): T & { cancel: () => void; flush: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let pendingArgs: Parameters<T> | null = null;

  const execute = () => {
    if (pendingArgs !== null) {
      const args = pendingArgs;
      pendingArgs = null;
      timeoutId = null;
      fn(...args);
    }
  };

  const debounced = (...args: Parameters<T>) => {
    pendingArgs = args;
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(execute, delay);
  };

  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    pendingArgs = null;
  };

  debounced.flush = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      execute();
    }
  };

  return debounced as T & { cancel: () => void; flush: () => void };
}
