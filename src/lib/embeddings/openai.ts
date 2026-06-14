import type { EmbeddingProvider, EmbedOptions } from '@/lib/embeddings/types';

/**
 * OpenAI embeddings via `/v1/embeddings`. Uses the API key stored under the
 * `openai` slot in secure storage (the same key works for chat + embeddings).
 * `text-embedding-3-small` → 1536 dims, cheap, strong quality.
 */
const BASE_URL = 'https://api.openai.com/v1';
const MODEL = 'text-embedding-3-small';
const DIM = 1536;

async function embed(texts: string[], { apiKey, signal }: EmbedOptions): Promise<Float32Array[]> {
  if (!apiKey) {
    throw new Error('No OpenAI API key set (used for embeddings). Add one in Settings.');
  }
  if (texts.length === 0) return [];

  const res = await fetch(`${BASE_URL}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: MODEL, input: texts }),
    signal,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Embedding request failed (${res.status}). ${detail}`.trim());
  }

  const data = (await res.json()) as { data?: { embedding?: number[] }[] };
  const rows = data.data;
  if (!Array.isArray(rows) || rows.length !== texts.length) {
    throw new Error('Embedding response shape was unexpected.');
  }
  return rows.map((r) => Float32Array.from(r.embedding ?? []));
}

export const openaiEmbeddingProvider: EmbeddingProvider = {
  id: 'openai',
  label: 'OpenAI text-embedding-3-small',
  model: MODEL,
  dim: DIM,
  embed,
};
