import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Avatar from './Avatar';
import { useAppTheme } from '../context/ThemeContext';
import { formatChatListTime } from '../utils/dateUtils';

export default function ChatListItem({ otherUser, chat, currentUid, onPress }) {
  const { theme } = useAppTheme();
  const unread = chat.unreadCount?.[currentUid] || 0;
  const isLastFromMe = chat.lastMessageSenderId === currentUid;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <Avatar
        uri={otherUser?.photoURL}
        name={otherUser?.username}
        size={54}
        online={otherUser?.online}
        showStatus
      />
      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
            {otherUser?.username || 'Unknown user'}
          </Text>
          <Text style={[styles.time, { color: unread > 0 ? theme.accent : theme.subText }]}>
            {formatChatListTime(chat.updatedAt)}
          </Text>
        </View>
        <View style={styles.row}>
          <Text
            style={[
              styles.lastMessage,
              { color: unread > 0 ? theme.text : theme.subText, fontWeight: unread > 0 ? '600' : '400' },
            ]}
            numberOfLines={1}
          >
            {isLastFromMe && chat.lastMessage ? 'You: ' : ''}
            {chat.lastMessage || 'Say hi 👋'}
          </Text>
          {unread > 0 && (
            <View style={[styles.badge, { backgroundColor: theme.unreadBadge }]}>
              <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          )}
        </View>
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
    flex: 1,
    marginLeft: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
  },
  time: {
    fontSize: 12,
    marginLeft: 8,
  },
  lastMessage: {
    fontSize: 14,
    flex: 1,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
