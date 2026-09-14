import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { CallProvider } from './src/context/CallContext';
import RootNavigator from './src/navigation/RootNavigator';
import { attachNotificationTapHandler } from './src/services/notificationService';

export default function App() {
  // App-level (not per-user): routes a tapped push notification to the
  // right screen. Independent of auth state, so it's wired here rather
  // than in AuthContext.
  useEffect(() => attachNotificationTapHandler(), []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <CallProvider>
              <StatusBar style="auto" />
              <RootNavigator />
            </CallProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
