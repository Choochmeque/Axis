/**
 * Type for a debounced function with cancel and flush methods.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DebouncedFn = ((...args: any[]) => void) & {
  cancel: () => void;
  flush: () => void;
};

/**
 * Creates a debounced version of a function that delays execution
 * until after the specified delay has elapsed since the last call.
 * (Trailing edge debounce)
 *
 * Returns a debounced function with:
 * - cancel(): cancels any pending execution
 * - flush(): immediately executes any pending call
 */
export function debounce<Args extends unknown[], R extends void | Promise<void>>(
  fn: (...args: Args) => R,
  delay: number
): ((...args: Args) => void) & { cancel: () => void; flush: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let pendingArgs: Args | null = null;

  const execute = () => {
    if (pendingArgs !== null) {
      const args = pendingArgs;
      pendingArgs = null;
      timeoutId = null;
      fn(...args);
    }
  };

  const debounced = (...args: Args) => {
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

  return debounced as ((...args: Args) => void) & { cancel: () => void; flush: () => void };
}
