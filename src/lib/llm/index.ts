import type { ProviderId } from '@/lib/types';
import type { LLMProvider } from '@/lib/llm/types';
import { deepseekProvider } from '@/lib/llm/providers/deepseek';
import { claudeProvider } from '@/lib/llm/providers/claude';
import { openaiProvider } from '@/lib/llm/providers/openai';
import { geminiProvider } from '@/lib/llm/providers/gemini';

export type { LLMProvider, SendOptions } from '@/lib/llm/types';
export { AWAITING_INTEGRATION } from '@/lib/llm/providers/mock';

/** Registry of every available backend, keyed by provider id. */
export const PROVIDERS: Record<ProviderId, LLMProvider> = {
  deepseek: deepseekProvider,
  claude: claudeProvider,
  openai: openaiProvider,
  gemini: geminiProvider,
};

/** Ordered list for rendering pickers. */
export const PROVIDER_LIST: LLMProvider[] = [
  deepseekProvider,
  claudeProvider,
  openaiProvider,
  geminiProvider,
];

/** DeepSeek is the first real integration, so it's the default. */
export const DEFAULT_PROVIDER: ProviderId = 'deepseek';

export function getProvider(id: ProviderId): LLMProvider {
  return PROVIDERS[id];
}
