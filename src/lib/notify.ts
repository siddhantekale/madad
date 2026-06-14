import * as Notifications from 'expo-notifications';

/**
 * Local notifications for "your reply is ready" while the app is backgrounded.
 *
 * These are *local* notifications (scheduled on-device), which — unlike remote
 * push — don't require the paid Apple push entitlement, so they work on a
 * free-account dev build. Caveat: iOS only keeps a backgrounded app alive for a
 * short grace window (~30s); a reply that lands after iOS suspends the app
 * can't fire this. For unlimited background delivery you'd need a server +
 * remote push (paid account).
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let requested = false;

/** Ask for notification permission once; returns whether it's granted. */
export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (requested && !current.canAskAgain) return false;
    requested = true;
    const result = await Notifications.requestPermissionsAsync();
    return result.granted;
  } catch {
    return false;
  }
}

/** First ~12 words of a reply, with markdown noise stripped, for the preview. */
export function makePreview(text: string, maxWords = 12): string {
  const flat = text
    .replace(/```[\s\S]*?```/g, ' code block ')
    .replace(/[#*`>_~\[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = flat.split(' ');
  const head = words.slice(0, maxWords).join(' ');
  return words.length > maxWords ? `${head}…` : head;
}

/** Fire an immediate local notification announcing a completed reply. */
export async function notifyResponseReady(preview: string): Promise<void> {
  try {
    if (!(await ensureNotificationPermission())) return;
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Madad — reply ready', body: preview || 'Your response is ready.' },
      trigger: null, // deliver now
    });
  } catch {
    // Notifications are best-effort; never break the chat over them.
  }
}
