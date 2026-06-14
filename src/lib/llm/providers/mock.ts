import type { SendOptions } from '@/lib/llm/types';

/** Placeholder reply returned by every provider until a real backend is wired. */
export const AWAITING_INTEGRATION = 'Awaiting Integration';

/**
 * Simulates a network round-trip so the UI exercises its real loading/typing
 * states. Honors `signal` so the chat's "stop" affordance works today.
 */
export function mockSend({ signal }: SendOptions, delayMs = 600): Promise<string> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve(AWAITING_INTEGRATION);
    }, delayMs);

    function onAbort() {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    }
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
