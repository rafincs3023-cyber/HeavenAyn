import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';

export default function SplashScreen() {
  const { theme } = useAppTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.primary }]}>
      <Ionicons name="chatbubbles" size={90} color="#FFFFFF" />
      <Text style={styles.title}>HeavenAyn</Text>
      <ActivityIndicator size="large" color="#FFFFFF" style={{ marginTop: 30 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#FFFFFF', fontSize: 32, fontWeight: '700', marginTop: 16, letterSpacing: 0.5 },
});
