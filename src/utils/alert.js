import { Alert, Platform } from 'react-native';

// react-native-web ships Alert.alert as an empty function, so on web every
// dialog is silently skipped and the button callbacks behind it never run.
// Route through the browser's own dialogs there, and keep the native Alert
// everywhere else. Same signature as Alert.alert.
export function showAlert(title, message, buttons) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  const text = message ? `${title}\n\n${message}` : title;

  if (!buttons || buttons.length === 0) {
    window.alert(text);
    return;
  }

  const cancelButton = buttons.find((b) => b.style === 'cancel');
  const confirmButton =
    [...buttons].reverse().find((b) => b.style !== 'cancel') || buttons[buttons.length - 1];

  // Nothing to cancel: it is an acknowledgement, not a choice.
  if (!cancelButton) {
    window.alert(text);
    confirmButton?.onPress?.();
    return;
  }

  if (window.confirm(text)) confirmButton?.onPress?.();
  else cancelButton.onPress?.();
}
