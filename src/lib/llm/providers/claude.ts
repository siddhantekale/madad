import type { LLMProvider } from '@/lib/llm/types';
import { mockSend } from '@/lib/llm/providers/mock';

/**
 * Anthropic Claude.
 *
 * Model ids below are current as of this scaffold. When integrating, call the
 * Messages API (`@anthropic-ai/sdk`) inside `send()` — default to
 * `claude-opus-4-8`, stream the response, and map `messages` 1:1 to the
 * Anthropic `messages` array (role: 'user' | 'assistant').
 */
export const claudeProvider: LLMProvider = {
  id: 'claude',
  label: 'Claude (Anthropic)',
  models: ['claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5'],
  defaultModel: 'claude-opus-4-8',
  requiresApiKey: true,
  send: (options) => mockSend(options),
};
