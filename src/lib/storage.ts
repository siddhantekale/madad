import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ProviderId, Session } from '@/lib/types';

const SESSIONS_KEY = 'madad.sessions.v1';
const SETTINGS_KEY = 'madad.settings.v1';

export interface PersistedSettings {
  provider: ProviderId;
  /** Selected model id, or undefined to use the provider's default. */
  model?: string;
}

/** Load all saved chat sessions (newest activity first). */
export async function loadSessions(): Promise<Session[]> {
  try {
    const raw = await AsyncStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Session[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveSessions(sessions: Session[]): Promise<void> {
  try {
    await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch {
    // Best-effort: a failed write shouldn't crash the chat.
  }
}

export async function loadSettings(): Promise<PersistedSettings | null> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    return raw ? (JSON.parse(raw) as PersistedSettings) : null;
  } catch {
    return null;
  }
}

export async function saveSettings(settings: PersistedSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Best-effort.
  }
}
