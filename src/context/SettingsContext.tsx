import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { ProviderId } from '@/lib/types';
import { DEFAULT_PROVIDER, getProvider } from '@/lib/llm';
import { loadSettings, saveSettings } from '@/lib/storage';
import { deleteApiKey, getApiKey, setApiKey } from '@/lib/secure';

interface SettingsContextValue {
  ready: boolean;
  provider: ProviderId;
  /** Resolved model id (selected, or the provider's default). */
  model: string;
  /** Which providers currently have an API key saved. */
  hasKey: Record<ProviderId, boolean>;
  setProvider: (id: ProviderId) => void;
  setModel: (model: string) => void;
  /** Save (or clear, if empty) the API key for a provider. */
  saveKey: (id: ProviderId, value: string) => Promise<void>;
  clearKey: (id: ProviderId) => Promise<void>;
  /** Read the raw key for use when sending (not exposed in UI). */
  readKey: (id: ProviderId) => Promise<string | null>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

const emptyKeyMap: Record<ProviderId, boolean> = {
  deepseek: false,
  claude: false,
  openai: false,
  gemini: false,
};

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [provider, setProviderState] = useState<ProviderId>(DEFAULT_PROVIDER);
  const [modelByProvider, setModelByProvider] = useState<Partial<Record<ProviderId, string>>>({});
  const [hasKey, setHasKey] = useState<Record<ProviderId, boolean>>(emptyKeyMap);

  // Hydrate persisted settings + key presence on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const persisted = await loadSettings();
      const keyChecks = await Promise.all(
        (Object.keys(emptyKeyMap) as ProviderId[]).map(
          async (id) => [id, !!(await getApiKey(id))] as const,
        ),
      );
      if (cancelled) return;
      if (persisted) {
        setProviderState(persisted.provider);
        if (persisted.model) {
          setModelByProvider((m) => ({ ...m, [persisted.provider]: persisted.model }));
        }
      }
      setHasKey(Object.fromEntries(keyChecks) as Record<ProviderId, boolean>);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const model = modelByProvider[provider] ?? getProvider(provider).defaultModel;

  // Persist provider + model whenever they change (after hydration).
  useEffect(() => {
    if (!ready) return;
    void saveSettings({ provider, model: modelByProvider[provider] });
  }, [ready, provider, modelByProvider]);

  const value = useMemo<SettingsContextValue>(
    () => ({
      ready,
      provider,
      model,
      hasKey,
      setProvider: (id) => setProviderState(id),
      setModel: (m) => setModelByProvider((prev) => ({ ...prev, [provider]: m })),
      saveKey: async (id, raw) => {
        await setApiKey(id, raw);
        setHasKey((prev) => ({ ...prev, [id]: !!raw.trim() }));
      },
      clearKey: async (id) => {
        await deleteApiKey(id);
        setHasKey((prev) => ({ ...prev, [id]: false }));
      },
      readKey: (id) => getApiKey(id),
    }),
    [ready, provider, model, hasKey],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
}
