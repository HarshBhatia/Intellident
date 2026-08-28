import { useEffect } from 'react';

export const AI_REFRESH_EVENT = 'intellident:ai-write';

export function useRefreshOnAiWrite(...callbacks: (() => void)[]) {
  useEffect(() => {
    const handler = () => callbacks.forEach(fn => fn());
    window.addEventListener(AI_REFRESH_EVENT, handler);
    return () => window.removeEventListener(AI_REFRESH_EVENT, handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, callbacks);
}
