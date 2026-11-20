import type { User } from './api/schemas';

/** Where to send a signed-in user: the first unfinished setup step, or the app. */
export function nextRouteFor(user: User): '/setup/profile' | '/setup/body-photos' | '/' {
  const missing = user.setup.missing;
  if (missing.includes('profile')) return '/setup/profile';
  if (!user.setup.can_try_on) return '/setup/body-photos';
  return '/';
}
