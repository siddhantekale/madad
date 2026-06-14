import React, { useCallback, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Markdown from 'react-native-markdown-display';
import * as Clipboard from 'expo-clipboard';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { Message } from '@/lib/types';
import { Colors, Font, Radius, Spacing } from '@/constants/theme';

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(message.content);
    setCopied(true);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopied(false), 1500);
  }, [message.content]);

  if (isUser) {
    return (
      <View style={[styles.row, styles.rowUser]}>
        <View style={[styles.bubble, styles.bubbleUser]}>
          <Text style={styles.userText}>{message.content}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.row, styles.rowAssistant]}>
      <View style={styles.assistantWrap}>
        <View style={[styles.bubble, styles.bubbleAssistant]}>
          {/* Models return Markdown — render it (headings, lists, code, bold, links). */}
          <Markdown style={markdownStyles}>{message.content}</Markdown>
        </View>
        <Pressable
          onPress={handleCopy}
          hitSlop={10}
          accessibilityLabel="Copy message"
          style={styles.copyBtn}>
          <Ionicons
            name={copied ? 'checkmark' : 'copy-outline'}
            size={15}
            color={copied ? Colors.text : Colors.textMuted}
          />
          {copied ? <Text style={styles.copiedLabel}>Copied</Text> : null}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { width: '100%', flexDirection: 'row', marginVertical: Spacing.xs },
  rowUser: { justifyContent: 'flex-end' },
  rowAssistant: { justifyContent: 'flex-start' },
  assistantWrap: { maxWidth: '88%' },
  bubble: {
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md + 2,
    borderRadius: Radius.lg,
  },
  bubbleUser: { maxWidth: '88%', backgroundColor: Colors.bubbleUser, borderBottomRightRadius: Radius.sm },
  bubbleAssistant: { backgroundColor: Colors.bubbleAssistant, borderBottomLeftRadius: Radius.sm },
  userText: { fontFamily: Font.regular, fontSize: 16, lineHeight: 23, color: Colors.textInverse },
  copyBtn: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  copiedLabel: { fontFamily: Font.regular, fontSize: 12, color: Colors.textMuted },
});

// Maps react-native-markdown-display rule names → styles, in our type/colour system.
const markdownStyles = StyleSheet.create({
  body: { fontFamily: Font.regular, fontSize: 16, lineHeight: 23, color: Colors.text },
  paragraph: { marginTop: 0, marginBottom: Spacing.sm },
  heading1: { fontFamily: Font.bold, fontSize: 22, lineHeight: 28, color: Colors.text, marginTop: Spacing.sm, marginBottom: Spacing.xs },
  heading2: { fontFamily: Font.bold, fontSize: 19, lineHeight: 25, color: Colors.text, marginTop: Spacing.sm, marginBottom: Spacing.xs },
  heading3: { fontFamily: Font.semibold, fontSize: 17, lineHeight: 23, color: Colors.text, marginTop: Spacing.sm, marginBottom: Spacing.xs },
  heading4: { fontFamily: Font.semibold, fontSize: 16, color: Colors.text, marginTop: Spacing.xs },
  strong: { fontFamily: Font.semibold, color: Colors.text },
  em: { fontStyle: 'italic' },
  link: { color: '#2563EB', textDecorationLine: 'underline' },
  bullet_list: { marginVertical: Spacing.xs },
  ordered_list: { marginVertical: Spacing.xs },
  list_item: { marginVertical: 1 },
  code_inline: {
    fontFamily: MONO,
    fontSize: 14,
    backgroundColor: '#E4E4E7',
    color: '#1A1A1A',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  code_block: {
    fontFamily: MONO,
    fontSize: 13,
    lineHeight: 19,
    backgroundColor: '#1E1E1E',
    color: '#F5F5F5',
    padding: Spacing.md,
    borderRadius: Radius.sm,
  },
  fence: {
    fontFamily: MONO,
    fontSize: 13,
    lineHeight: 19,
    backgroundColor: '#1E1E1E',
    color: '#F5F5F5',
    padding: Spacing.md,
    borderRadius: Radius.sm,
  },
  blockquote: {
    backgroundColor: '#F0F0F0',
    borderLeftColor: '#C8C8C8',
    borderLeftWidth: 3,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    marginVertical: Spacing.xs,
  },
  hr: { backgroundColor: Colors.border, height: StyleSheet.hairlineWidth, marginVertical: Spacing.sm },
  table: { borderColor: Colors.border, borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.sm, marginVertical: Spacing.xs },
  th: { fontFamily: Font.semibold, padding: Spacing.xs, color: Colors.text },
  td: { padding: Spacing.xs },
});
