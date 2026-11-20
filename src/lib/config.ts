// EXPO_PUBLIC_* values are inlined into the app bundle at build time, so only put
// public values here. The OpenAI key lives on the Laravel server, never in the app.
const raw = process.env.EXPO_PUBLIC_API_URL;

if (!raw) {
  throw new Error('EXPO_PUBLIC_API_URL is not set. Copy .env.example to .env and set your Laravel URL.');
}

export const API_URL = raw.replace(/\/+$/, '');
