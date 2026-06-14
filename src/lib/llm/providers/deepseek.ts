import type { LLMProvider, SendOptions } from '@/lib/llm/types';

/**
 * DeepSeek chat — the first real (non-mock) backend.
 *
 * DeepSeek's API is OpenAI-compatible, so this is a plain `fetch` to
 * `/chat/completions`. Non-streaming for now (one request → full reply);
 * streaming is an easy follow-up via `expo/fetch` once we want token-by-token
 * rendering. The same `send()` powers both chat replies and the summarize step
 * used by the indexer.
 */
const BASE_URL = 'https://api.deepseek.com';

async function send({ messages, model, apiKey, signal }: SendOptions): Promise<string> {
  if (!apiKey) {
    throw new Error('No DeepSeek API key set. Add one in Settings.');
  }

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: false,
    }),
    signal,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`DeepSeek request failed (${res.status}). ${detail}`.trim());
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error('DeepSeek returned an unexpected response shape.');
  }
  return content;
}

export const deepseekProvider: LLMProvider = {
  id: 'deepseek',
  label: 'DeepSeek',
  // deepseek-chat = V3, deepseek-reasoner = R1.
  models: ['deepseek-chat', 'deepseek-reasoner'],
  defaultModel: 'deepseek-chat',
  requiresApiKey: true,
  send,
};
