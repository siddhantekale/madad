import type { LLMProvider } from '@/lib/llm/types';
import { mockSend } from '@/lib/llm/providers/mock';

/** Google Gemini. Model list is a placeholder until integration. */
export const geminiProvider: LLMProvider = {
  id: 'gemini',
  label: 'Gemini (Google)',
  models: ['gemini-2.5-pro', 'gemini-2.5-flash'],
  defaultModel: 'gemini-2.5-pro',
  requiresApiKey: true,
  send: (options) => mockSend(options),
};
