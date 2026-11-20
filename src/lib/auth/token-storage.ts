import * as SecureStore from 'expo-secure-store';

// Keychain (iOS) / Keystore-backed (Android) storage. Never AsyncStorage for tokens.
const KEY = 'online-fitting.api-token';

export const tokenStorage = {
  get: () => SecureStore.getItemAsync(KEY),
  set: (token: string) => SecureStore.setItemAsync(KEY, token),
  clear: () => SecureStore.deleteItemAsync(KEY),
};
