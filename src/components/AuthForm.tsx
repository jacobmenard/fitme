import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button, ErrorBanner, Screen, TextField } from '@/components/ui';
import { api } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/errors';
import { useAuth } from '@/lib/auth/AuthProvider';
import { nextRouteFor } from '@/lib/navigation';
import { colors, radius, space, type } from '@/theme';

/** Shared by Create account and Log in: same fields, different call and copy. */
export function AuthForm({ mode }: { mode: 'register' | 'login' }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const isRegister = mode === 'register';

  const submit = useMutation({
    mutationFn: () => (isRegister ? api.register(email.trim(), password) : api.login(email.trim(), password)),
    onSuccess: async ({ token, user }) => {
      await signIn(token, user);
      router.replace(isRegister ? '/setup/profile' : nextRouteFor(user));
    },
  });

  const fieldErrors = submit.error instanceof ApiError ? submit.error.fieldErrors : {};
  const generalError =
    submit.error && Object.keys(fieldErrors).length === 0 ? (submit.error as Error).message : null;
  const canSubmit = email.includes('@') && password.length >= (isRegister ? 8 : 1);

  return (
    <Screen
      footer={
        <>
          <Button
            label={isRegister ? 'Create account' : 'Log in'}
            onPress={() => submit.mutate()}
            loading={submit.isPending}
            disabled={!canSubmit}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 15, color: colors.muted }}>
              {isRegister ? 'Already have an account? ' : 'New here? '}
            </Text>
            <Pressable
              accessibilityRole="link"
              hitSlop={12}
              onPress={() => router.replace(isRegister ? '/login' : '/register')}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.accentText }}>
                {isRegister ? 'Log in' : 'Create account'}
              </Text>
            </Pressable>
          </View>
        </>
      }
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: space.xl }}>
        <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: colors.ink }} />
        <Text style={{ fontSize: 17, fontWeight: '600', color: colors.ink }}>Online Fitting</Text>
      </View>

      <View style={{ gap: space.md, marginTop: space.xl }}>
        <Text style={type.hero} accessibilityRole="header">
          {isRegister ? 'See it on you before you buy.' : 'Welcome back.'}
        </Text>
        <Text style={[type.body, { fontSize: 16 }]}>
          {isRegister ? 'Create an account to try any garment on your own photos.' : 'Log in to keep trying on.'}
        </Text>
      </View>

      <ErrorBanner message={generalError} />

      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        error={fieldErrors.email}
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder={isRegister ? 'At least 8 characters, letters and numbers' : 'Your password'}
        secureTextEntry
        autoComplete={isRegister ? 'new-password' : 'current-password'}
        textContentType={isRegister ? 'newPassword' : 'password'}
        error={fieldErrors.password}
      />

      {isRegister ? (
        <View style={{ backgroundColor: colors.accentSoft, borderRadius: radius.lg, padding: space.lg }}>
          <Text style={{ fontSize: 14, lineHeight: 20, color: colors.text }}>
            Setup takes about 2 minutes: your details and height, then a front and back photo.
          </Text>
        </View>
      ) : null}
    </Screen>
  );
}
