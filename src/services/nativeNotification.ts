import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@choochmeque/tauri-plugin-notifications-api';

export async function notify(title: string, body?: string): Promise<void> {
  try {
    let permitted = await isPermissionGranted();
    if (!permitted) {
      const permission = await requestPermission();
      permitted = permission === 'granted';
    }
    if (permitted) {
      sendNotification({ title, body });
    } else {
      console.log('Notification permission denied');
    }
  } catch (err) {
    console.error('Notification error:', err);
  }
}
