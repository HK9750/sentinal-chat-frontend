import { useEffect, useRef } from 'react';

/**
 * Track the previous value of a variable
 * Useful for comparing current vs previous values in effects
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  
  useEffect(() => {
    ref.current = value;
  }, [value]);
  
  return ref.current;
}
