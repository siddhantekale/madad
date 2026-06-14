import * as SQLite from 'expo-sqlite';

/**
 * On-device embedding index (expo-sqlite, works in Expo Go).
 *
 * Append-only: each manual re-index of a session inserts a new row with the
 * same `session_id` and an incremented `index_id`, giving a version history of
 * that conversation's embedding over time. The vector is stored as a Float32
 * BLOB. KNN search is a later phase — this module just persists the index.
 */

export interface NewIndexRow {
  sessionId: string;
  sessionText: string; // full transcript snapshot
  embeddedText: string; // exact text sent to the embedder (transcript or summary)
  summarized: boolean;
  embedding: Float32Array;
  dim: number;
  embedModel: string;
  createdAt: number;
}

export interface IndexRow {
  session_id: string;
  index_id: number;
  session_text: string;
  embedded_text: string;
  summarized: number;
  embedding: Uint8Array;
  dim: number;
  embed_model: string;
  created_at: number;
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('madad.db');
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS session_index (
          session_id    TEXT    NOT NULL,
          index_id      INTEGER NOT NULL,
          session_text  TEXT    NOT NULL,
          embedded_text TEXT    NOT NULL,
          summarized    INTEGER NOT NULL DEFAULT 0,
          embedding     BLOB    NOT NULL,
          dim           INTEGER NOT NULL,
          embed_model   TEXT    NOT NULL,
          created_at    INTEGER NOT NULL,
          PRIMARY KEY (session_id, index_id)
        );
      `);
      return db;
    })();
  }
  return dbPromise;
}

/** Bytes view over a Float32Array, for BLOB storage. */
function toBytes(v: Float32Array): Uint8Array {
  return new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
}

/** Reconstruct a Float32Array from a stored BLOB. */
export function bytesToFloat32(bytes: Uint8Array): Float32Array {
  // Copy to guarantee a clean, aligned buffer.
  return new Float32Array(bytes.slice().buffer);
}

/** Next index_id for a session (1-based; increments per re-index). */
export async function nextIndexId(sessionId: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ max_id: number | null }>(
    'SELECT MAX(index_id) AS max_id FROM session_index WHERE session_id = ?',
    [sessionId],
  );
  return (row?.max_id ?? 0) + 1;
}

/** Insert one snapshot row. Returns the assigned index_id. */
export async function insertIndexRow(row: NewIndexRow): Promise<number> {
  const db = await getDb();
  const indexId = await nextIndexId(row.sessionId);
  await db.runAsync(
    `INSERT INTO session_index
       (session_id, index_id, session_text, embedded_text, summarized, embedding, dim, embed_model, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.sessionId,
      indexId,
      row.sessionText,
      row.embeddedText,
      row.summarized ? 1 : 0,
      toBytes(row.embedding),
      row.dim,
      row.embedModel,
      row.createdAt,
    ],
  );
  return indexId;
}

/** How many snapshots exist for a session (for UI feedback). */
export async function countIndexRows(sessionId: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM session_index WHERE session_id = ?',
    [sessionId],
  );
  return row?.n ?? 0;
}

/** All rows (newest first) — used later by search; handy for debugging now. */
export async function getAllIndexRows(): Promise<IndexRow[]> {
  const db = await getDb();
  return db.getAllAsync<IndexRow>(
    'SELECT * FROM session_index ORDER BY created_at DESC',
  );
}
