import { z } from 'zod';

// Response contracts for the Laravel API. Parsing at the boundary means a backend
// change shows up as a clear error instead of a crash deep inside a screen.

const photoSchema = z.object({ url: z.string(), updated_at: z.string().nullable() }).nullable();

export const setupStepSchema = z.enum(['profile', 'front_photo', 'back_photo', 'photo_consent']);

export const userSchema = z.object({
  id: z.number(),
  email: z.string(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  age: z.number().nullable(),
  height_cm: z.number().nullable(),
  photo_consent_at: z.string().nullable(),
  body_photos: z.object({ front: photoSchema, back: photoSchema }),
  setup: z.object({
    // Unknown future steps are kept as strings rather than failing the whole parse.
    missing: z.array(z.string()),
    can_try_on: z.boolean(),
  }),
});

export const garmentTypes = ['dress', 'top', 'skirt', 'pants', 'jacket'] as const;
export const garmentTypeSchema = z.enum(garmentTypes);

export const tryOnStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed']);

export const tryOnSchema = z.object({
  id: z.string(),
  status: tryOnStatusSchema,
  garment_type: garmentTypeSchema,
  garment_length_cm: z.number().nullable(),
  height_cm: z.number(),
  hem_position: z.string().nullable(),
  error_message: z.string().nullable(),
  images: z.object({ front: z.string().nullable(), back: z.string().nullable() }),
  can_regenerate: z.boolean(),
  saved: z.boolean(),
  created_at: z.string().nullable(),
  completed_at: z.string().nullable(),
});

export const authResponseSchema = z.object({ token: z.string(), user: userSchema });
export const userEnvelope = z.object({ data: userSchema });
export const tryOnEnvelope = z.object({ data: tryOnSchema });
export const tryOnPageSchema = z.object({
  data: z.array(tryOnSchema),
  meta: z.object({ current_page: z.number(), last_page: z.number() }),
});

export type User = z.infer<typeof userSchema>;
export type SetupStep = z.infer<typeof setupStepSchema>;
export type GarmentType = z.infer<typeof garmentTypeSchema>;
export type TryOn = z.infer<typeof tryOnSchema>;
export type TryOnStatus = z.infer<typeof tryOnStatusSchema>;
export type TryOnPage = z.infer<typeof tryOnPageSchema>;
