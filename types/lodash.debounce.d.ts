declare module 'lodash.debounce' {
  type AnyFn = (...args: any[]) => any;

  interface DebouncedFunction<T extends AnyFn> {
    (...args: Parameters<T>): ReturnType<T> | undefined;
    cancel?: () => void;
    flush?: () => void;
  }

  function debounce<T extends AnyFn>(func: T, wait?: number, options?: { leading?: boolean; trailing?: boolean; maxWait?: number }): DebouncedFunction<T>;

  export default debounce;
}
