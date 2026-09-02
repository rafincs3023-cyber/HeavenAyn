import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Avatar from './Avatar';
import { useAppTheme } from '../context/ThemeContext';
import { formatLastSeen } from '../utils/dateUtils';

export default function UserListItem({ user, onPress }) {
  const { theme } = useAppTheme();

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <Avatar uri={user.photoURL} name={user.username} size={50} online={user.online} showStatus />
      <View style={styles.content}>
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
          {user.username}
        </Text>
        <Text style={[styles.sub, { color: theme.subText }]} numberOfLines={1}>
          {user.online ? 'Online' : formatLastSeen(user.lastSeen)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  content: {
    marginLeft: 12,
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  sub: {
    fontSize: 13,
    marginTop: 2,
  },
});
