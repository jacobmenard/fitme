import { describe, expect, it } from '@jest/globals';

import { toApiError } from '../api/errors';
import { tryOnEnvelope, userEnvelope, type User } from '../api/schemas';
import { nextRouteFor } from '../navigation';

// Contract fixtures: same shape as App\Http\Resources\UserResource / TryOnResource.
const userPayload = {
  data: {
    id: 1,
    email: 'maria@example.com',
    first_name: 'Maria',
    last_name: 'Santos',
    age: 24,
    height_cm: 165.1,
    photo_consent_at: '2026-11-20T10:00:00+00:00',
    body_photos: {
      front: { url: 'http://api.test/api/v1/me/body-photos/front?v=1', updated_at: '2026-11-20T10:00:00+00:00' },
      back: null,
    },
    setup: { missing: ['back_photo'], can_try_on: false },
  },
};

const tryOnPayload = {
  data: {
    id: '01JDZ8X3T7Q8K2M4N6P8R0S2T4',
    status: 'completed',
    garment_type: 'dress',
    garment_length_cm: 95,
    height_cm: 165,
    hem_position: 'just below the knee',
    error_message: null,
    images: { front: 'http://api.test/api/v1/try-ons/x/images/front?v=1', back: null },
    can_regenerate: true,
    saved: false,
    created_at: '2026-11-20T10:00:00+00:00',
    completed_at: '2026-11-20T10:01:00+00:00',
  },
};

describe('API contracts', () => {
  it('parses the user resource', () => {
    const parsed = userEnvelope.parse(userPayload);
    expect(parsed.data.setup.can_try_on).toBe(false);
    expect(parsed.data.body_photos.back).toBeNull();
  });

  it('parses the try-on resource', () => {
    expect(tryOnEnvelope.parse(tryOnPayload).data.hem_position).toBe('just below the knee');
  });

  it('rejects a malformed try-on instead of passing it to screens', () => {
    expect(tryOnEnvelope.safeParse({ data: { ...tryOnPayload.data, status: 'exploded' } }).success).toBe(false);
  });
});

describe('toApiError', () => {
  it('maps Laravel validation errors to the first message per field', () => {
    const err = toApiError(422, {
      message: 'The email has already been taken.',
      errors: { email: ['The email has already been taken.'], password: ['Too short.', 'Needs a number.'] },
    });
    expect(err.fieldErrors).toEqual({ email: 'The email has already been taken.', password: 'Too short.' });
  });

  it('keeps the setup_incomplete code from the try-on gate', () => {
    const err = toApiError(409, { message: 'Finish your profile first.', code: 'setup_incomplete', missing: ['back_photo'] });
    expect(err.code).toBe('setup_incomplete');
    expect(err.message).toBe('Finish your profile first.');
  });

  it('never shows raw server error text for 5xx', () => {
    const err = toApiError(500, { message: 'SQLSTATE[42S02]: Base table not found' });
    expect(err.message).not.toContain('SQLSTATE');
  });

  it('handles non-JSON bodies', () => {
    expect(toApiError(429, null).message).toMatch(/too many/i);
  });
});

describe('nextRouteFor', () => {
  const base = userEnvelope.parse(userPayload).data;
  const withSetup = (missing: string[]): User => ({ ...base, setup: { missing, can_try_on: missing.length === 0 } });

  it('sends users to the first unfinished step', () => {
    expect(nextRouteFor(withSetup(['profile', 'front_photo']))).toBe('/setup/profile');
    expect(nextRouteFor(withSetup(['back_photo']))).toBe('/setup/body-photos');
    expect(nextRouteFor(withSetup(['photo_consent']))).toBe('/setup/body-photos');
    expect(nextRouteFor(withSetup([]))).toBe('/');
  });
});
