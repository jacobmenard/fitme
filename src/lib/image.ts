import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import type { FileUpload } from './api/client';
import { ApiError } from './api/errors';

export type PickSource = 'camera' | 'library';

export class PermissionDeniedError extends Error {
  constructor(source: PickSource) {
    super(
      source === 'camera'
        ? 'Camera access is off. Turn it on in Settings to take a photo.'
        : 'Photo access is off. Turn it on in Settings to choose a photo.',
    );
  }
}

const MAX_SIDE = 2000;

/**
 * Pick or take a photo, then re-encode it as JPEG.
 * Re-encoding bakes in the rotation, strips EXIF (incl. GPS location) and shrinks the upload.
 * Returns null if the user cancels.
 */
export async function pickPhoto(source: PickSource, name: string): Promise<FileUpload | null> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new PermissionDeniedError(source);

  const options: ImagePicker.ImagePickerOptions = { mediaTypes: 'images', quality: 1, allowsEditing: false };
  const result =
    source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);

  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;

  const context = ImageManipulator.manipulate(asset.uri);
  const tall = asset.height >= asset.width;
  if (Math.max(asset.width, asset.height) > MAX_SIDE) {
    context.resize(tall ? { height: MAX_SIDE, width: null } : { width: MAX_SIDE, height: null });
  }
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });

  return { uri: saved.uri, name: `${name}.jpg`, type: 'image/jpeg' };
}

/** User-facing message for anything that can go wrong while picking/uploading a photo. */
export function photoErrorMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof PermissionDeniedError) return error.message;
  return 'We could not use that photo. Please try another one.';
}
