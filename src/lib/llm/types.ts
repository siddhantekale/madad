import type { Message, ProviderId } from '@/lib/types';

/** What the UI hands a provider when it wants a completion. */
export interface SendOptions {
  /** Full conversation history, oldest first. */
  messages: Message[];
  /** Model id selected in Settings (one of `LLMProvider.models`). */
  model: string;
  /** API key for this provider, if one has been saved. */
  apiKey?: string;
  /** Lets the UI cancel an in-flight request. */
  signal?: AbortSignal;
}

/**
 * A chat backend. Every provider (Claude / OpenAI / Gemini) implements this
 * one interface, so swapping backends is a single line in the chat code.
 *
 * Right now `send()` is mocked everywhere and returns "Awaiting Integration".
 * Wiring a real endpoint later means filling in the body of `send()` — the
 * rest of the app does not change.
 */
export interface LLMProvider {
  id: ProviderId;
  /** Human label for the Settings picker. */
  label: string;
  /** Selectable model ids for this provider. */
  models: string[];
  /** Default model when none is chosen. */
  defaultModel: string;
  /** Whether this provider needs an API key to function (once integrated). */
  requiresApiKey: boolean;
  send(options: SendOptions): Promise<string>;
}
