import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import type { ProviderId } from '@/lib/types';

/**
 * API-key storage.
 *
 * On native we use `expo-secure-store` (iOS Keychain / Android Keystore) so
 * keys never sit in plaintext AsyncStorage. `expo-secure-store` is unavailable
 * on web, so there we fall back to `localStorage` — adequate for a personal
 * app, but note web keys are not hardware-encrypted.
 */

const keyFor = (provider: ProviderId) => `madad.apikey.${provider}`;
const isWeb = Platform.OS === 'web';

export async function getApiKey(provider: ProviderId): Promise<string | null> {
  try {
    if (isWeb) return globalThis.localStorage?.getItem(keyFor(provider)) ?? null;
    return await SecureStore.getItemAsync(keyFor(provider));
  } catch {
    return null;
  }
}

export async function setApiKey(provider: ProviderId, value: string): Promise<void> {
  const trimmed = value.trim();
  if (!trimmed) {
    await deleteApiKey(provider);
    return;
  }
  if (isWeb) {
    globalThis.localStorage?.setItem(keyFor(provider), trimmed);
    return;
  }
  await SecureStore.setItemAsync(keyFor(provider), trimmed);
}

export async function deleteApiKey(provider: ProviderId): Promise<void> {
  try {
    if (isWeb) {
      globalThis.localStorage?.removeItem(keyFor(provider));
      return;
    }
    await SecureStore.deleteItemAsync(keyFor(provider));
  } catch {
    // Nothing stored / already gone.
  }
}
