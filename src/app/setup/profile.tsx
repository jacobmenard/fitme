import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { Button, ErrorBanner, Screen, Segmented, StepHeader, TextField } from '@/components/ui';
import { useMe, useUserMutation } from '@/hooks/queries';
import { api } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/errors';
import {
  cmToInches,
  displayValue,
  formatFeetInches,
  inchesToCm,
  MAX_HEIGHT_CM,
  MIN_HEIGHT_CM,
  stepHeight,
  type HeightUnit,
} from '@/lib/height';
import { colors, radius, space, type } from '@/theme';

const UNITS = [
  { value: 'cm', label: 'cm' },
  { value: 'in', label: 'in' },
] as const;

export default function ProfileSetupScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const editing = mode === 'edit';
  const me = useMe();
  const save = useUserMutation(api.updateProfile);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [unit, setUnit] = useState<HeightUnit>('cm');
  const [heightCm, setHeightCm] = useState(165);
  const [heightText, setHeightText] = useState('165');
  const [prefilled, setPrefilled] = useState(false);

  // Prefill once from the server (editing, or returning to an unfinished setup).
  useEffect(() => {
    const u = me.data;
    if (!u || prefilled) return;
    setFirstName(u.first_name ?? '');
    setLastName(u.last_name ?? '');
    setAge(u.age ? String(u.age) : '');
    if (u.height_cm) {
      setHeightCm(u.height_cm);
      setHeightText(String(displayValue(u.height_cm, 'cm')));
    }
    setPrefilled(true);
  }, [me.data, prefilled]);

  const applyHeight = (cm: number, nextUnit: HeightUnit = unit) => {
    setHeightCm(cm);
    setHeightText(String(displayValue(cm, nextUnit)));
  };

  const onTypeHeight = (text: string) => {
    const clean = text.replace(/[^0-9.]/g, '');
    setHeightText(clean);
    const n = Number(clean);
    if (clean && Number.isFinite(n)) setHeightCm(unit === 'cm' ? n : inchesToCm(n));
  };

  const heightValid = heightCm >= MIN_HEIGHT_CM && heightCm <= MAX_HEIGHT_CM;
  const ageNum = Number(age);
  const canSubmit =
    firstName.trim().length > 0 && lastName.trim().length > 0 && Number.isInteger(ageNum) && ageNum >= 13 && ageNum <= 100 && heightValid;

  const fieldErrors = save.error instanceof ApiError ? save.error.fieldErrors : {};
  const generalError = save.error && Object.keys(fieldErrors).length === 0 ? (save.error as Error).message : null;

  const submit = () =>
    save.mutate(
      {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        age: ageNum,
        height_value: displayValue(heightCm, unit),
        height_unit: unit,
      },
      {
        onSuccess: (user) => {
          if (editing) router.back();
          else if (user.setup.can_try_on) router.replace('/');
          else router.push('/setup/body-photos');
        },
      },
    );

  if (me.isPending) {
    return <ActivityIndicator style={{ flex: 1 }} color={colors.accent} />;
  }

  const secondary =
    unit === 'cm'
      ? `= ${formatFeetInches(heightCm)}`
      : `= ${formatFeetInches(heightCm)} · ${Math.round(heightCm)} cm`;

  return (
    <Screen footer={<Button label={editing ? 'Save' : 'Continue'} onPress={submit} loading={save.isPending} disabled={!canSubmit} />}>
      {editing ? null : <StepHeader step={1} total={2} />}

      <View style={{ gap: space.xs }}>
        <Text style={type.title} accessibilityRole="header">
          About you
        </Text>
        <Text style={type.body}>Your height is used to show where garments fall on your body.</Text>
      </View>

      <ErrorBanner message={generalError} />

      <View style={{ flexDirection: 'row', gap: space.md }}>
        <TextField
          style={{ flex: 1 }}
          label="First name"
          value={firstName}
          onChangeText={setFirstName}
          placeholder="Maria"
          autoComplete="given-name"
          textContentType="givenName"
          error={fieldErrors.first_name}
        />
        <TextField
          style={{ flex: 1 }}
          label="Last name"
          value={lastName}
          onChangeText={setLastName}
          placeholder="Santos"
          autoComplete="family-name"
          textContentType="familyName"
          error={fieldErrors.last_name}
        />
      </View>
      <TextField
        style={{ width: '48%' }}
        label="Age"
        value={age}
        onChangeText={(t) => setAge(t.replace(/[^0-9]/g, ''))}
        placeholder="24"
        keyboardType="number-pad"
        maxLength={3}
        error={fieldErrors.age}
      />

      <View style={{ borderWidth: 1, borderColor: colors.divider, borderRadius: radius.xl, padding: space.lg, gap: 14, backgroundColor: colors.field }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={[type.label, { fontSize: 15 }]}>Height</Text>
          <Segmented
            label="Height unit"
            options={UNITS}
            value={unit}
            onChange={(u) => {
              // Snap to a whole number in the new unit so the stepper stays tidy.
              const snapped = u === 'in' ? inchesToCm(Math.round(cmToInches(heightCm))) : Math.round(heightCm);
              setUnit(u);
              applyHeight(snapped, u);
            }}
          />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <StepButton label="Decrease height" symbol="−" onPress={() => applyHeight(stepHeight(heightCm, unit, -1))} />
          <View style={{ alignItems: 'center', gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <TextInput
                accessibilityLabel={`Height in ${unit === 'cm' ? 'centimetres' : 'inches'}`}
                value={heightText}
                onChangeText={onTypeHeight}
                onBlur={() => heightValid && applyHeight(heightCm)}
                keyboardType="decimal-pad"
                maxLength={5}
                style={{ fontSize: 44, fontWeight: '700', color: colors.ink, minWidth: 80, textAlign: 'center', padding: 0 }}
              />
              <Text style={{ fontSize: 18, fontWeight: '600', color: colors.muted }}>{unit}</Text>
            </View>
            <Text style={{ fontSize: 14, color: heightValid ? colors.muted : colors.danger }} accessibilityLiveRegion="polite">
              {heightValid ? secondary : 'Enter 100–250 cm (39–98 in)'}
            </Text>
          </View>
          <StepButton label="Increase height" symbol="+" onPress={() => applyHeight(stepHeight(heightCm, unit, 1))} />
        </View>
        {fieldErrors.height_value ? <Text style={{ color: colors.danger, fontSize: 13 }}>{fieldErrors.height_value}</Text> : null}
      </View>
    </Screen>
  );
}

function StepButton({ label, symbol, onPress }: { label: string; symbol: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 52,
        height: 52,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: pressed ? colors.surface : colors.white,
        alignItems: 'center',
        justifyContent: 'center',
      })}
    >
      <Text style={{ fontSize: 24, color: colors.ink, marginTop: -2 }}>{symbol}</Text>
    </Pressable>
  );
}
