import type { ProviderId } from '@/lib/types';

export interface EmbedOptions {
  apiKey?: string;
  signal?: AbortSignal;
}

/**
 * Produces vector embeddings for text. Mirrors `LLMProvider` so that swapping
 * to a custom endpoint later is a one-file change. Vectors are returned as
 * `Float32Array` (compact + ready to store as a BLOB).
 */
export interface EmbeddingProvider {
  /** Which secure-store key slot this provider uses (a ProviderId). */
  id: ProviderId;
  label: string;
  model: string;
  /** Output dimension (for storage + sanity checks). */
  dim: number;
  embed(texts: string[], options: EmbedOptions): Promise<Float32Array[]>;
}
