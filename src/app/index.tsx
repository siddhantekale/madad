import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ChatInput } from '@/components/ChatInput';
import { MessageBubble } from '@/components/MessageBubble';
import { useSessions } from '@/context/SessionsContext';
import { useSettings } from '@/context/SettingsContext';
import { getProvider } from '@/lib/llm';
import { indexSession } from '@/lib/indexer';
import { ensureNotificationPermission, makePreview, notifyResponseReady } from '@/lib/notify';
import type { Message } from '@/lib/types';
import { Colors, Font, MaxContentWidth, Spacing } from '@/constants/theme';

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { currentSession, addUserMessage, addAssistantMessage } = useSessions();
  const { provider: providerId, model, readKey } = useSettings();

  const [busy, setBusy] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<FlatList<Message>>(null);

  const messages = currentSession?.messages ?? [];

  // Manual per-chat indexing: summarize-if-long → embed → append a snapshot row.
  const handleIndex = useCallback(async () => {
    if (!currentSession || currentSession.messages.length === 0) return;
    setIndexing(true);
    try {
      const [llmApiKey, embedApiKey] = await Promise.all([readKey(providerId), readKey('openai')]);
      const result = await indexSession(currentSession, {
        llm: getProvider(providerId),
        llmModel: model,
        llmApiKey: llmApiKey ?? undefined,
        embedApiKey: embedApiKey ?? undefined,
        now: Date.now(),
      });
      Alert.alert(
        'Indexed',
        `Saved snapshot #${result.indexId}${result.summarized ? ' (summarized)' : ''}.`,
      );
    } catch (e) {
      Alert.alert('Indexing failed', (e as Error)?.message ?? 'Unknown error');
    } finally {
      setIndexing(false);
    }
  }, [currentSession, providerId, model, readKey]);

  // Index button in the header (spinner while running, disabled on empty chats).
  useLayoutEffect(() => {
    const hasMessages = (currentSession?.messages.length ?? 0) > 0;
    navigation.setOptions({
      headerRight: () =>
        indexing ? (
          <ActivityIndicator style={styles.headerBtn} color={Colors.text} />
        ) : (
          <Pressable
            onPress={handleIndex}
            disabled={!hasMessages}
            hitSlop={12}
            accessibilityLabel="Index this chat"
            style={styles.headerBtn}>
            <Ionicons name="refresh" size={22} color={hasMessages ? Colors.text : Colors.textMuted} />
          </Pressable>
        ),
    });
  }, [navigation, indexing, currentSession?.messages.length, handleIndex]);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const handleSend = useCallback(
    async (text: string) => {
      // Snapshot history before mutating, then append the new turn for the provider call.
      const priorHistory = currentSession?.messages ?? [];
      const sessionId = addUserMessage(text);
      scrollToEnd();
      // Prompt for notification permission early (while we're still foreground).
      void ensureNotificationPermission();

      const provider = getProvider(providerId);
      const apiKey = (await readKey(providerId)) ?? undefined;
      const controller = new AbortController();
      abortRef.current = controller;
      setBusy(true);

      try {
        const history: Message[] = priorHistory.concat({
          id: 'pending',
          role: 'user',
          content: text,
          createdAt: Date.now(),
        });
        const reply = await provider.send({
          messages: history,
          model,
          apiKey,
          signal: controller.signal,
        });
        addAssistantMessage(sessionId, reply);
        scrollToEnd();
        // If the user switched away, ping them that the reply landed.
        if (AppState.currentState !== 'active') {
          void notifyResponseReady(makePreview(reply));
        }
      } catch (err) {
        if ((err as Error)?.name !== 'AbortError') {
          addAssistantMessage(sessionId, 'Something went wrong. Please try again.');
        }
      } finally {
        setBusy(false);
        abortRef.current = null;
      }
    },
    [addUserMessage, addAssistantMessage, currentSession, providerId, model, readKey, scrollToEnd],
  );

  const handleStop = useCallback(() => abortRef.current?.abort(), []);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top + 56}>
      {messages.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={scrollToEnd}
          keyboardDismissMode="interactive"
        />
      )}
      <ChatInput busy={busy} onSend={handleSend} onStop={handleStop} />
    </KeyboardAvoidingView>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>How can I help?</Text>
      <Text style={styles.emptySubtitle}>Start a conversation below.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  headerBtn: { paddingHorizontal: Spacing.lg },
  listContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: { fontFamily: Font.bold, fontSize: 26, color: Colors.text },
  emptySubtitle: {
    fontFamily: Font.regular,
    fontSize: 16,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
});
