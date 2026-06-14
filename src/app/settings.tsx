import { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useSettings } from '@/context/SettingsContext';
import { PROVIDER_LIST, getProvider } from '@/lib/llm';
import type { ProviderId } from '@/lib/types';
import { Colors, Font, Radius, Spacing } from '@/constants/theme';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { provider, model, hasKey, setProvider, setModel } = useSettings();
  const activeProvider = getProvider(provider);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxl }]}>
      <Section title="Provider">
        {PROVIDER_LIST.map((p) => (
          <SelectRow
            key={p.id}
            label={p.label}
            selected={p.id === provider}
            onPress={() => setProvider(p.id)}
          />
        ))}
      </Section>

      <Section title="Model" subtitle={activeProvider.label}>
        <View style={styles.chips}>
          {activeProvider.models.map((m) => {
            const selected = m === model;
            return (
              <Pressable
                key={m}
                onPress={() => setModel(m)}
                style={[styles.chip, selected && styles.chipSelected]}>
                <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{m}</Text>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section title="API keys" subtitle="Stored securely on this device.">
        {PROVIDER_LIST.map((p) => (
          <ApiKeyField key={p.id} providerId={p.id} label={p.label} saved={hasKey[p.id]} />
        ))}
        <Text style={styles.note}>
          DeepSeek powers chat. The OpenAI key powers the embedding index
          (text-embedding-3-small). Claude and Gemini are still mocked.
          {'\n'}
          {Platform.OS === 'web'
            ? 'On web, keys are kept in browser storage (not hardware-encrypted).'
            : 'Keys are kept in the device keychain.'}
        </Text>
      </Section>
    </ScrollView>
  );
}

function ApiKeyField({
  providerId,
  label,
  saved,
}: {
  providerId: ProviderId;
  label: string;
  saved: boolean;
}) {
  const { saveKey, clearKey } = useSettings();
  const [value, setValue] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving'>('idle');

  const onSave = async () => {
    setStatus('saving');
    await saveKey(providerId, value);
    setValue('');
    setStatus('idle');
  };

  const onClear = async () => {
    setValue('');
    await clearKey(providerId);
  };

  return (
    <View style={styles.keyBlock}>
      <View style={styles.keyHeader}>
        <Text style={styles.keyLabel}>{label}</Text>
        {saved && (
          <View style={styles.savedBadge}>
            <Ionicons name="checkmark-circle" size={14} color={Colors.text} />
            <Text style={styles.savedText}>Saved</Text>
          </View>
        )}
      </View>
      <View style={styles.keyRow}>
        <TextInput
          style={styles.keyInput}
          placeholder={saved ? 'Replace key…' : 'Paste API key'}
          placeholderTextColor={Colors.textMuted}
          value={value}
          onChangeText={setValue}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable
          onPress={onSave}
          disabled={!value.trim() || status === 'saving'}
          style={[styles.keyButton, !value.trim() && styles.keyButtonDisabled]}>
          <Text style={[styles.keyButtonLabel, !value.trim() && styles.keyButtonLabelDisabled]}>
            Save
          </Text>
        </Pressable>
      </View>
      {saved && (
        <Pressable onPress={onClear} hitSlop={6}>
          <Text style={styles.clearLink}>Remove saved key</Text>
        </Pressable>
      )}
    </View>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function SelectRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.selectRow} onPress={onPress}>
      <Text style={[styles.selectLabel, selected && styles.selectLabelActive]}>{label}</Text>
      <Ionicons
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={20}
        color={selected ? Colors.text : Colors.textMuted}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.xl },
  section: { gap: Spacing.sm },
  sectionTitle: { fontFamily: Font.bold, fontSize: 14, color: Colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase' },
  sectionSubtitle: { fontFamily: Font.regular, fontSize: 13, color: Colors.textMuted, marginTop: -Spacing.xs },
  sectionBody: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  selectLabel: { fontFamily: Font.regular, fontSize: 16, color: Colors.textMuted },
  selectLabelActive: { fontFamily: Font.semibold, color: Colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, padding: Spacing.md },
  chip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipSelected: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  chipLabel: { fontFamily: Font.regular, fontSize: 14, color: Colors.text },
  chipLabelSelected: { fontFamily: Font.semibold, color: Colors.textInverse },
  keyBlock: {
    padding: Spacing.md,
    gap: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  keyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  keyLabel: { fontFamily: Font.semibold, fontSize: 15, color: Colors.text },
  savedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  savedText: { fontFamily: Font.semibold, fontSize: 12, color: Colors.text },
  keyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  keyInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontFamily: Font.regular,
    fontSize: 15,
    color: Colors.text,
  },
  keyButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.sm,
    backgroundColor: Colors.accent,
  },
  keyButtonDisabled: { backgroundColor: Colors.highlight },
  keyButtonLabel: { fontFamily: Font.semibold, fontSize: 14, color: Colors.textInverse },
  keyButtonLabelDisabled: { color: Colors.textMuted },
  clearLink: { fontFamily: Font.regular, fontSize: 13, color: Colors.danger },
  note: {
    fontFamily: Font.regular,
    fontSize: 12,
    color: Colors.textMuted,
    padding: Spacing.md,
    lineHeight: 17,
  },
});
