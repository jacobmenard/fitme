import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../config', () => ({ API_URL: 'http://api.test' }));

// Stand-in for expo-file-system's File: a Blob-like object backed by a local URI.
jest.mock('expo-file-system', () => ({
  File: class MockFsFile {
    uri: string;
    constructor(mockUri: string) {
      this.uri = mockUri;
    }
  },
}));

import { File as FsFile } from 'expo-file-system';

import { apiRequest } from '../api/client';
import { ApiError } from '../api/errors';

const okResponse = () => ({ ok: true, status: 200, text: async () => '' }) as unknown as Response;

describe('apiRequest multipart uploads', () => {
  const realFetch = globalThis.fetch;
  let appended: unknown[][];

  beforeEach(() => {
    appended = [];
    jest.spyOn(FormData.prototype, 'append').mockImplementation(function (...args: unknown[]) {
      appended.push(args);
    });
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
    jest.restoreAllMocks();
  });

  // Regression: expo/fetch throws on legacy { uri, name, type } parts, which surfaced as "No connection".
  it('sends picked photos as file objects, not legacy { uri } parts', async () => {
    globalThis.fetch = jest.fn(async () => okResponse()) as unknown as typeof fetch;

    await apiRequest('/me/body-photos/front', {
      method: 'POST',
      form: { photo: { uri: 'file:///cache/front.jpg', name: 'front.jpg', type: 'image/jpeg' }, consent: '1', skip: undefined },
    });

    const photo = appended.find(([key]) => key === 'photo');
    expect(photo?.[1]).toBeInstanceOf(FsFile);
    expect((photo?.[1] as { uri: string }).uri).toBe('file:///cache/front.jpg');
    expect(photo?.[2]).toBe('front.jpg');
    expect(appended.find(([key]) => key === 'consent')?.[1]).toBe('1');
    expect(appended.some(([key]) => key === 'skip')).toBe(false);
  });

  it('reports an aborted request as a timeout, even when fetch throws a non-AbortError', async () => {
    jest.useFakeTimers();
    globalThis.fetch = jest.fn(
      (_url: unknown, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          // expo/fetch rejects aborts with a plain FetchError whose name is "Error".
          init?.signal?.addEventListener('abort', () => reject(new Error('fetch failed: The operation was aborted.')));
        }),
    ) as unknown as typeof fetch;

    const pending = apiRequest('/me', { timeoutMs: 1000 });
    jest.advanceTimersByTime(1000);

    await expect(pending).rejects.toMatchObject({ code: 'timeout' });
    jest.useRealTimers();
  });

  it('reports a failed connection as a network error', async () => {
    globalThis.fetch = jest.fn(async () => {
      throw new Error('fetch failed: Unable to resolve host');
    }) as unknown as typeof fetch;
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    const error = await apiRequest('/me').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: 'network', status: 0 });
  });
});
