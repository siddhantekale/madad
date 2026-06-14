import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Colors, Font, Radius, Spacing } from '@/constants/theme';

interface ChatInputProps {
  /** True while a response is being generated. */
  busy: boolean;
  onSend: (text: string) => void;
  /** Cancel the in-flight response. */
  onStop?: () => void;
}

const MAX_INPUT_HEIGHT = 140;

export function ChatInput({ busy, onSend, onStop }: ChatInputProps) {
  const [text, setText] = useState('');
  const [height, setHeight] = useState(0);

  const canSend = text.trim().length > 0 && !busy;

  const handleSend = () => {
    if (!canSend) return;
    onSend(text.trim());
    setText('');
    setHeight(0);
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, { height: Math.min(Math.max(40, height), MAX_INPUT_HEIGHT) }]}
          placeholder="Message"
          placeholderTextColor={Colors.textMuted}
          value={text}
          onChangeText={setText}
          multiline
          onContentSizeChange={(e) => setHeight(e.nativeEvent.contentSize.height)}
          // Enter sends on web; on native Enter inserts a newline.
          {...(Platform.OS === 'web'
            ? {
                onKeyPress: (e: any) => {
                  if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
                    e.preventDefault?.();
                    handleSend();
                  }
                },
              }
            : {})}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={busy ? 'Stop' : 'Send'}
          onPress={busy ? onStop : handleSend}
          disabled={busy ? !onStop : !canSend}
          style={[
            styles.button,
            busy ? styles.buttonStop : canSend ? styles.buttonActive : styles.buttonDisabled,
          ]}>
          <Ionicons
            name={busy ? 'stop' : 'arrow-up'}
            size={20}
            color={busy || canSend ? Colors.textInverse : Colors.textMuted}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    fontFamily: Font.regular,
    fontSize: 16,
    color: Colors.text,
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonActive: { backgroundColor: Colors.accent },
  buttonDisabled: { backgroundColor: Colors.highlight },
  buttonStop: { backgroundColor: Colors.danger },
});
