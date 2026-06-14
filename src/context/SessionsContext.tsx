import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type { Message, Role, Session } from '@/lib/types';
import { makeId } from '@/lib/id';
import { loadSessions, saveSessions } from '@/lib/storage';

interface SessionsContextValue {
  ready: boolean;
  /** All sessions, newest activity first. */
  sessions: Session[];
  /** Active session id, or null for a fresh (not-yet-saved) chat. */
  currentId: string | null;
  currentSession: Session | null;
  /** Switch to an empty, unsaved chat. */
  newChat: () => void;
  selectSession: (id: string) => void;
  deleteSession: (id: string) => void;
  renameSession: (id: string, title: string) => void;
  /**
   * Append a user message, creating + titling the session on the first turn.
   * Returns the session id the message landed in.
   */
  addUserMessage: (text: string) => string;
  /** Append an assistant message to a session. */
  addAssistantMessage: (sessionId: string, content: string) => void;
}

const SessionsContext = createContext<SessionsContextValue | null>(null);

const TITLE_MAX = 40;

function titleFrom(text: string): string {
  const clean = text.trim().replace(/\s+/g, ' ');
  if (!clean) return 'New chat';
  return clean.length > TITLE_MAX ? clean.slice(0, TITLE_MAX).trimEnd() + '…' : clean;
}

function message(role: Role, content: string): Message {
  return { id: makeId(), role, content, createdAt: Date.now() };
}

export function SessionsProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);

  // Hydrate from storage on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await loadSessions();
      if (cancelled) return;
      setSessions(loaded);
      setCurrentId(loaded.length ? loaded[0].id : null);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist on change (after hydration). Debounced via a microtask-ish ref guard.
  const firstWrite = useRef(true);
  useEffect(() => {
    if (!ready) return;
    if (firstWrite.current) {
      firstWrite.current = false;
      return;
    }
    void saveSessions(sessions);
  }, [ready, sessions]);

  const sorted = useMemo(
    () => [...sessions].sort((a, b) => b.updatedAt - a.updatedAt),
    [sessions],
  );

  const currentSession = useMemo(
    () => sessions.find((s) => s.id === currentId) ?? null,
    [sessions, currentId],
  );

  const newChat = useCallback(() => setCurrentId(null), []);
  const selectSession = useCallback((id: string) => setCurrentId(id), []);

  const deleteSession = useCallback(
    (id: string) => {
      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== id);
        setCurrentId((cur) => {
          if (cur !== id) return cur;
          const remaining = [...next].sort((a, b) => b.updatedAt - a.updatedAt);
          return remaining.length ? remaining[0].id : null;
        });
        return next;
      });
    },
    [],
  );

  const renameSession = useCallback((id: string, title: string) => {
    const clean = title.trim();
    if (!clean) return;
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title: clean, updatedAt: Date.now() } : s)),
    );
  }, []);

  const addUserMessage = useCallback(
    (text: string): string => {
      const userMsg = message('user', text);
      const now = userMsg.createdAt;

      if (currentId) {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === currentId
              ? { ...s, messages: [...s.messages, userMsg], updatedAt: now }
              : s,
          ),
        );
        return currentId;
      }

      // First turn of a brand-new chat: create + title the session now.
      const id = makeId();
      const session: Session = {
        id,
        title: titleFrom(text),
        messages: [userMsg],
        createdAt: now,
        updatedAt: now,
      };
      setSessions((prev) => [session, ...prev]);
      setCurrentId(id);
      return id;
    },
    [currentId],
  );

  const addAssistantMessage = useCallback((sessionId: string, content: string) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? { ...s, messages: [...s.messages, message('assistant', content)], updatedAt: Date.now() }
          : s,
      ),
    );
  }, []);

  const value = useMemo<SessionsContextValue>(
    () => ({
      ready,
      sessions: sorted,
      currentId,
      currentSession,
      newChat,
      selectSession,
      deleteSession,
      renameSession,
      addUserMessage,
      addAssistantMessage,
    }),
    [
      ready,
      sorted,
      currentId,
      currentSession,
      newChat,
      selectSession,
      deleteSession,
      renameSession,
      addUserMessage,
      addAssistantMessage,
    ],
  );

  return <SessionsContext.Provider value={value}>{children}</SessionsContext.Provider>;
}

export function useSessions(): SessionsContextValue {
  const ctx = useContext(SessionsContext);
  if (!ctx) throw new Error('useSessions must be used within a SessionsProvider');
  return ctx;
}
