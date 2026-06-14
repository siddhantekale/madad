import type { LLMProvider } from '@/lib/llm/types';
import { mockSend } from '@/lib/llm/providers/mock';

/** OpenAI GPT. Model list is a placeholder until integration. */
export const openaiProvider: LLMProvider = {
  id: 'openai',
  label: 'GPT (OpenAI)',
  models: ['gpt-5', 'gpt-4o', 'gpt-4o-mini'],
  defaultModel: 'gpt-5',
  requiresApiKey: true,
  send: (options) => mockSend(options),
};
