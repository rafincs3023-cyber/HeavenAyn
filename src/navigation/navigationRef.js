import { createNavigationContainerRef } from '@react-navigation/native';

// Shared navigation ref so non-screen code (e.g. the incoming-call listener in
// CallContext) can navigate without a navigation prop.
export const navigationRef = createNavigationContainerRef();

export function navigate(name, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}
