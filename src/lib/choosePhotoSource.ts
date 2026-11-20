import { Alert } from 'react-native';

import type { PickSource } from './image';

/** Native "Take photo / Choose from library" sheet. Resolves null on cancel. */
export function choosePhotoSource(title: string): Promise<PickSource | null> {
  return new Promise((resolve) => {
    Alert.alert(
      title,
      undefined,
      [
        { text: 'Take photo', onPress: () => resolve('camera') },
        { text: 'Choose from library', onPress: () => resolve('library') },
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}
