import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { configureApiSession } from '../api/client';
import { api } from '../api/endpoints';
import type { User } from '../api/schemas';
import { queryKeys } from '../queryKeys';
import { tokenStorage } from './token-storage';

type AuthState =
  | { status: 'loading'; token: null }
  | { status: 'signedOut'; token: null }
  | { status: 'signedIn'; token: string };

type AuthContextValue = AuthState & {
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({ status: 'loading', token: null });
  const tokenRef = useRef<string | null>(null);

  const clearSession = useCallback(async () => {
    tokenRef.current = null;
    await tokenStorage.clear();
    queryClient.clear(); // never show the previous user's data to the next one
    setState({ status: 'signedOut', token: null });
  }, [queryClient]);

  useEffect(() => {
    configureApiSession({
      getToken: () => tokenRef.current,
      onUnauthorized: () => {
        if (tokenRef.current) void clearSession();
      },
    });

    let cancelled = false;
    tokenStorage
      .get()
      .then((token) => {
        if (cancelled) return;
        tokenRef.current = token;
        setState(token ? { status: 'signedIn', token } : { status: 'signedOut', token: null });
      })
      .catch(() => !cancelled && setState({ status: 'signedOut', token: null }));

    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  const signIn = useCallback(
    async (token: string, user: User) => {
      await tokenStorage.set(token);
      tokenRef.current = token;
      queryClient.setQueryData(queryKeys.me, user);
      setState({ status: 'signedIn', token });
    },
    [queryClient],
  );

  const signOut = useCallback(async () => {
    try {
      await api.logout(); // revoke the token server-side too
    } catch {
      // Offline or already revoked: still clear locally.
    }
    await clearSession();
  }, [clearSession]);

  const value = useMemo(() => ({ ...state, signIn, signOut }), [state, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
