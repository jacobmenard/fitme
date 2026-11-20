import * as Device from './device';
import { apiRequest, type FileUpload } from './client';
import {
  authResponseSchema,
  tryOnEnvelope,
  tryOnPageSchema,
  userEnvelope,
  type GarmentType,
} from './schemas';
import type { HeightUnit } from '../height';

const UPLOAD_TIMEOUT = 120_000;

export const api = {
  register: (email: string, password: string) =>
    apiRequest('/auth/register', {
      method: 'POST',
      json: { email, password, password_confirmation: password, device_name: Device.name() },
      schema: authResponseSchema,
    }),

  login: (email: string, password: string) =>
    apiRequest('/auth/login', {
      method: 'POST',
      json: { email, password, device_name: Device.name() },
      schema: authResponseSchema,
    }),

  logout: () => apiRequest('/auth/logout', { method: 'POST' }),

  me: () => apiRequest('/me', { schema: userEnvelope }).then((r) => r.data),

  updateProfile: (input: {
    first_name: string;
    last_name: string;
    age: number;
    height_value: number;
    height_unit: HeightUnit;
  }) => apiRequest('/me/profile', { method: 'PUT', json: input, schema: userEnvelope }).then((r) => r.data),

  uploadBodyPhoto: (side: 'front' | 'back', photo: FileUpload, consent: boolean) =>
    apiRequest(`/me/body-photos/${side}`, {
      method: 'POST',
      form: { photo, consent: consent ? '1' : undefined },
      schema: userEnvelope,
      timeoutMs: UPLOAD_TIMEOUT,
    }).then((r) => r.data),

  deleteBodyPhotos: () => apiRequest('/me/body-photos', { method: 'DELETE' }),

  deleteAccount: () => apiRequest('/me', { method: 'DELETE' }),

  createTryOn: (input: { garment: FileUpload; garment_type: GarmentType; garment_length_cm: number | null }) =>
    apiRequest('/try-ons', {
      method: 'POST',
      form: { garment: input.garment, garment_type: input.garment_type, garment_length_cm: input.garment_length_cm },
      schema: tryOnEnvelope,
      timeoutMs: UPLOAD_TIMEOUT,
    }).then((r) => r.data),

  tryOn: (id: string) => apiRequest(`/try-ons/${encodeURIComponent(id)}`, { schema: tryOnEnvelope }).then((r) => r.data),

  tryOns: (page: number, savedOnly: boolean) =>
    apiRequest(`/try-ons?page=${page}${savedOnly ? '&saved=1' : ''}`, { schema: tryOnPageSchema }),

  regenerateTryOn: (id: string) =>
    apiRequest(`/try-ons/${encodeURIComponent(id)}/regenerate`, { method: 'POST', schema: tryOnEnvelope }).then((r) => r.data),

  saveTryOn: (id: string) =>
    apiRequest(`/try-ons/${encodeURIComponent(id)}/save`, { method: 'POST', schema: tryOnEnvelope }).then((r) => r.data),

  deleteTryOn: (id: string) => apiRequest(`/try-ons/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
