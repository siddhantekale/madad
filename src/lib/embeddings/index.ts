import type { EmbeddingProvider } from '@/lib/embeddings/types';
import { openaiEmbeddingProvider } from '@/lib/embeddings/openai';

export type { EmbeddingProvider, EmbedOptions } from '@/lib/embeddings/types';

/** The embedding backend used by the indexer. Swap here for a custom endpoint later. */
export const embeddingProvider: EmbeddingProvider = openaiEmbeddingProvider;
