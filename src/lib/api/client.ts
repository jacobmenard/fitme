import { File as FsFile } from 'expo-file-system';
import type { z } from 'zod';

import { API_URL } from '../config';
import { ApiError, toApiError } from './errors';

type Session = {
  getToken: () => string | null;
  onUnauthorized: () => void;
};

let session: Session = { getToken: () => null, onUnauthorized: () => {} };

/** Called once by AuthProvider so every request carries the current token. */
export function configureApiSession(next: Session): void {
  session = next;
}

export function authHeaders(): Record<string, string> {
  const token = session.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export type FileUpload = { uri: string; name: string; type: string };

/**
 * Expo replaces the global `fetch` with `expo/fetch`, which cannot encode React Native's
 * legacy `{ uri, name, type }` FormData parts (it throws "Unsupported FormDataPart
 * implementation" before any bytes are sent). An expo-file-system `File` implements the
 * Blob interface that `expo/fetch` reads, so the image bytes are streamed from disk.
 */
function toFormFile(upload: FileUpload): Blob {
  return new FsFile(upload.uri);
}

type RequestOptions<S extends z.ZodType | undefined> = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  json?: unknown;
  form?: Record<string, string | number | boolean | FileUpload | null | undefined>;
  schema?: S;
  timeoutMs?: number;
};

type Result<S> = S extends z.ZodType ? z.infer<S> : void;

export async function apiRequest<S extends z.ZodType | undefined = undefined>(
  path: string,
  { method = 'GET', json, form, schema, timeoutMs = 30_000 }: RequestOptions<S> = {},
): Promise<Result<S>> {
  const headers: Record<string, string> = { Accept: 'application/json', ...authHeaders() };
  let body: string | FormData | undefined;

  if (form) {
    const data = new FormData();
    for (const [key, value] of Object.entries(form)) {
      if (value === null || value === undefined) continue;
      if (typeof value === 'object') {
        data.append(key, toFormFile(value), value.name);
      } else {
        data.append(key, String(value));
      }
    }
    body = data; // fetch sets the multipart boundary itself
  } else if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/v1${path}`, { method, headers, body, signal: controller.signal });
  } catch (cause) {
    // expo/fetch reports an abort as a generic FetchError (not 'AbortError'), so ask the signal.
    const timedOut = controller.signal.aborted;
    // Anything thrown here is shown as "No connection"; keep the real cause visible in dev.
    if (__DEV__) console.warn(`Request failed: ${method} ${path}`, cause);
    throw new ApiError(
      timedOut ? 'The server took too long to respond. Please try again.' : 'No connection. Check your internet and try again.',
      0,
      timedOut ? 'timeout' : 'network',
    );
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401) session.onUnauthorized();
    throw toApiError(response.status, parsed);
  }

  if (!schema) return undefined as Result<S>;

  const result = schema.safeParse(parsed);
  if (!result.success) {
    if (__DEV__) console.warn(`Unexpected response for ${method} ${path}`, result.error.issues);
    throw new ApiError('The app received an unexpected response. Please update the app or try again.', response.status, 'bad_response');
  }
  return result.data as Result<S>;
}
