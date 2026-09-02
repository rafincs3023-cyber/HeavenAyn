import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';

export default function Avatar({ uri, name = '?', size = 48, online = false, showStatus = false }) {
  const { theme } = useAppTheme();
  const initial = name?.charAt(0)?.toUpperCase() || '?';

  return (
    <View style={{ width: size, height: size }}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: theme.primary,
            },
          ]}
        >
          <Text style={[styles.initial, { fontSize: size * 0.4 }]}>{initial}</Text>
        </View>
      )}
      {showStatus && (
        <View
          style={[
            styles.statusDot,
            {
              backgroundColor: online ? theme.online : '#9E9E9E',
              width: size * 0.28,
              height: size * 0.28,
              borderRadius: size * 0.14,
              borderColor: theme.background,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    resizeMode: 'cover',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
  },
});
