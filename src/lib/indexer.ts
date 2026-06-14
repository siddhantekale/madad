import type { Session } from '@/lib/types';
import type { LLMProvider } from '@/lib/llm';
import { embeddingProvider } from '@/lib/embeddings';
import { insertIndexRow } from '@/lib/db';

/**
 * Roughly the embedding model's input ceiling (~7k tokens ≈ 28k chars, using
 * the ~4-chars-per-token heuristic). Above this we summarize before embedding.
 */
const CHAR_BUDGET = 28_000;

const SUMMARY_PROMPT =
  'Summarize the following conversation into a dense, information-rich paragraph ' +
  'capturing its key topics, questions, answers, decisions, and concrete facts ' +
  '(names, numbers, conclusions). Output only the summary, no preamble.\n\nConversation:\n';

function buildTranscript(session: Session): string {
  return session.messages
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n');
}

export interface IndexDeps {
  /** Active chat provider, used only when a long session needs summarizing. */
  llm: LLMProvider;
  llmModel: string;
  llmApiKey?: string;
  /** API key for the embedding provider. */
  embedApiKey?: string;
  signal?: AbortSignal;
  /** Timestamp to stamp the row with (passed in to keep this pure/testable). */
  now: number;
}

export interface IndexResult {
  indexId: number;
  summarized: boolean;
}

/**
 * Build a single embedding snapshot for a session and append it to the index.
 * Summarizes first if the transcript exceeds the embedder's input budget.
 */
export async function indexSession(session: Session, deps: IndexDeps): Promise<IndexResult> {
  if (session.messages.length === 0) {
    throw new Error('Nothing to index — this chat is empty.');
  }

  const transcript = buildTranscript(session);
  let embeddedText = transcript;
  let summarized = false;

  if (transcript.length > CHAR_BUDGET) {
    const summary = await deps.llm.send({
      messages: [
        { id: 'summary-prompt', role: 'user', content: SUMMARY_PROMPT + transcript, createdAt: deps.now },
      ],
      model: deps.llmModel,
      apiKey: deps.llmApiKey,
      signal: deps.signal,
    });
    embeddedText = summary.trim();
    summarized = true;
  }

  const [vector] = await embeddingProvider.embed([embeddedText], {
    apiKey: deps.embedApiKey,
    signal: deps.signal,
  });
  if (!vector || vector.length === 0) {
    throw new Error('Embedding failed — empty vector returned.');
  }

  const indexId = await insertIndexRow({
    sessionId: session.id,
    sessionText: transcript,
    embeddedText,
    summarized,
    embedding: vector,
    dim: embeddingProvider.dim,
    embedModel: embeddingProvider.model,
    createdAt: deps.now,
  });

  return { indexId, summarized };
}
