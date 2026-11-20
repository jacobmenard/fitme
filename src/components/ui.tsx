import { Image, type ImageStyle } from 'expo-image';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authHeaders } from '@/lib/api/client';
import { colors, radius, space, type } from '@/theme';

export function Screen({ children, footer, dark = false }: { children: ReactNode; footer?: ReactNode; dark?: boolean }) {
  const bg = dark ? colors.dark : colors.white;
  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'light';
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, variant = 'primary', loading, disabled, accessibilityHint, style }: ButtonProps) {
  const inactive = disabled || loading;
  const v = buttonVariants[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        v.container,
        disabled && styles.buttonDisabled,
        pressed && !inactive && { opacity: 0.85 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text.color} />
      ) : (
        <Text style={[styles.buttonText, v.text, disabled && { color: colors.muted }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const buttonVariants = {
  primary: { container: { backgroundColor: colors.accent }, text: { color: colors.white } },
  secondary: { container: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border }, text: { color: colors.ink } },
  light: { container: { backgroundColor: colors.white }, text: { color: colors.ink } },
} as const;

type FieldProps = TextInputProps & { label: string; error?: string; suffix?: string; optional?: boolean };

export function TextField({ label, error, suffix, optional, style, ...input }: FieldProps) {
  return (
    <View style={[{ gap: space.xs }, style as StyleProp<ViewStyle>]}>
      <Text style={type.label}>
        {label}
        {optional ? <Text style={{ fontWeight: '400', color: colors.muted }}> (optional)</Text> : null}
      </Text>
      <View style={[styles.field, error ? { borderColor: colors.danger } : null]}>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.placeholder}
          style={styles.input}
          {...input}
        />
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
      {error ? (
        <Text style={styles.fieldError} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function ErrorBanner({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <View style={styles.errorBanner} accessibilityRole="alert">
      <Text style={{ color: colors.danger, fontSize: 14, lineHeight: 20 }}>{message}</Text>
    </View>
  );
}

export function StepHeader({ step, total, onBack }: { step: number; total: number; onBack?: () => void }) {
  return (
    <View style={{ gap: space.sm }}>
      <View style={styles.headerRow}>
        <BackButton onPress={onBack} />
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.muted }}>
          Step {step} of {total}
        </Text>
        <View style={{ width: 44 }} />
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={[styles.progress, { backgroundColor: i < step ? colors.accent : colors.divider }]} />
        ))}
      </View>
    </View>
  );
}

export function BackButton({ onPress, label = 'Back' }: { onPress?: () => void; label?: string }) {
  if (!onPress && !router.canGoBack()) return <View style={{ width: 44 }} />;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress ?? (() => router.back())}
      hitSlop={8}
      style={styles.iconButton}
    >
      <Text style={{ fontSize: 26, color: colors.ink, marginTop: -2 }}>‹</Text>
    </Pressable>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.segmented}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, selected && styles.segmentOn]}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: selected ? colors.ink : colors.muted }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Private images from the API need the bearer token; expo-image sends it as a header. */
export function AuthImage({ uri, style, label }: { uri: string; style: StyleProp<ImageStyle>; label: string }) {
  return (
    <Image
      source={{ uri, headers: authHeaders() }}
      style={style}
      contentFit="cover"
      transition={150}
      accessibilityLabel={label}
      cachePolicy="disk"
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: space.xl, paddingTop: space.lg, gap: space.lg },
  footer: { paddingHorizontal: space.xl, paddingBottom: space.lg, paddingTop: space.sm, gap: space.md },
  button: { height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg },
  buttonDisabled: { backgroundColor: colors.divider, borderWidth: 0 },
  buttonText: { fontSize: 16, fontWeight: '600' },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.field,
    paddingHorizontal: 14,
  },
  input: { flex: 1, fontSize: 16, color: colors.ink, paddingVertical: 12 },
  suffix: { fontSize: 15, fontWeight: '500', color: colors.muted, marginLeft: space.sm },
  fieldError: { fontSize: 13, color: colors.danger },
  errorBanner: { backgroundColor: colors.dangerSoft, borderRadius: radius.md, padding: space.md },
  headerRow: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -10 },
  progress: { flex: 1, height: 4, borderRadius: 2 },
  segmented: { flexDirection: 'row', backgroundColor: '#ECECF1', borderRadius: radius.sm, padding: 3, gap: 2 },
  segment: { minWidth: 56, height: 38, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.md },
  segmentOn: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
});
