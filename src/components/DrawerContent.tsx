import React from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useSessions } from '@/context/SessionsContext';
import { Colors, Font, Radius, Spacing } from '@/constants/theme';

/** Only the slice of the drawer navigation API this component uses. */
interface DrawerContentProps {
  navigation: { closeDrawer: () => void };
}

export function DrawerContent({ navigation }: DrawerContentProps) {
  const insets = useSafeAreaInsets();
  const { sessions, currentId, newChat, selectSession, deleteSession } = useSessions();

  const close = () => navigation.closeDrawer();

  const confirmDelete = (id: string, title: string) => {
    if (Platform.OS === 'web') {
      // Alert has no buttons on web; delete directly.
      deleteSession(id);
      return;
    }
    Alert.alert('Delete chat', `Delete “${title}”?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteSession(id) },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.brand}>Madad</Text>
      </View>

      <Pressable
        style={styles.newChat}
        onPress={() => {
          newChat();
          close();
        }}>
        <Ionicons name="add" size={20} color={Colors.text} />
        <Text style={styles.newChatLabel}>New chat</Text>
      </Pressable>

      <ScrollView style={styles.flex} contentContainerStyle={styles.list}>
        {sessions.length === 0 ? (
          <Text style={styles.empty}>No conversations yet</Text>
        ) : (
          sessions.map((s) => {
            const active = s.id === currentId;
            return (
              <Pressable
                key={s.id}
                style={[styles.row, active && styles.rowActive]}
                onPress={() => {
                  selectSession(s.id);
                  close();
                }}>
                <Ionicons
                  name="chatbubble-outline"
                  size={16}
                  color={active ? Colors.text : Colors.textMuted}
                  style={styles.rowIcon}
                />
                <Text style={[styles.rowTitle, active && styles.rowTitleActive]} numberOfLines={1}>
                  {s.title}
                </Text>
                <Pressable
                  hitSlop={8}
                  accessibilityLabel="Delete chat"
                  onPress={() => confirmDelete(s.id, s.title)}>
                  <Ionicons name="trash-outline" size={16} color={Colors.textMuted} />
                </Pressable>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <Pressable
        style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}
        onPress={() => {
          close();
          router.push('/settings');
        }}>
        <Ionicons name="settings-outline" size={18} color={Colors.text} />
        <Text style={styles.footerLabel}>Settings</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  brand: { fontFamily: Font.bold, fontSize: 22, color: Colors.text },
  newChat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  newChatLabel: { fontFamily: Font.semibold, fontSize: 15, color: Colors.text },
  list: { paddingHorizontal: Spacing.sm, paddingTop: Spacing.xs },
  empty: {
    fontFamily: Font.regular,
    fontSize: 14,
    color: Colors.textMuted,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
  },
  rowActive: { backgroundColor: Colors.highlight },
  rowIcon: { width: 18 },
  rowTitle: { flex: 1, fontFamily: Font.regular, fontSize: 15, color: Colors.textMuted },
  rowTitleActive: { fontFamily: Font.semibold, color: Colors.text },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  footerLabel: { fontFamily: Font.semibold, fontSize: 15, color: Colors.text },
});
