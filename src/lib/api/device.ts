import { Platform } from 'react-native';

/** Label for the Sanctum token, so users can tell sessions apart later. */
export function name(): string {
  return `${Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : Platform.OS} app`;
}
