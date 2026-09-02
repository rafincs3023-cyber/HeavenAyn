import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';
import { formatMessageTime } from '../utils/dateUtils';

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MessageBubble({ message, isMine }) {
  const { theme } = useAppTheme();

  const renderStatusIcon = () => {
    if (!isMine) return null;
    if (message.seen) {
      return <Ionicons name="checkmark-done" size={16} color="#4FC3F7" />;
    }
    if (message.status === 'sent') {
      return <Ionicons name="checkmark" size={16} color={theme.subText} />;
    }
    return <Ionicons name="time-outline" size={14} color={theme.subText} />;
  };

  return (
    <View style={[styles.row, { justifyContent: isMine ? 'flex-end' : 'flex-start' }]}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isMine ? theme.bubbleSent : theme.bubbleReceived,
            borderTopRightRadius: isMine ? 4 : 16,
            borderTopLeftRadius: isMine ? 16 : 4,
          },
        ]}
      >
        {message.type === 'image' && message.imageURL ? (
          <Image source={{ uri: message.imageURL }} style={styles.image} />
        ) : message.type === 'file' && message.fileURL ? (
          <TouchableOpacity
            style={styles.fileRow}
            onPress={() => Linking.openURL(message.fileURL)}
          >
            <Ionicons name="document-outline" size={26} color={isMine ? theme.bubbleTextSent : theme.bubbleTextReceived} />
            <View style={{ marginLeft: 8, flexShrink: 1 }}>
              <Text
                style={{ color: isMine ? theme.bubbleTextSent : theme.bubbleTextReceived, fontSize: 14, fontWeight: '600' }}
                numberOfLines={1}
              >
                {message.fileName || 'File'}
              </Text>
              {message.fileSize ? (
                <Text style={{ color: theme.subText, fontSize: 11 }}>{formatFileSize(message.fileSize)}</Text>
              ) : null}
            </View>
          </TouchableOpacity>
        ) : (
          <Text style={{ color: isMine ? theme.bubbleTextSent : theme.bubbleTextReceived, fontSize: 15 }}>
            {message.text}
          </Text>
        )}
        <View style={styles.metaRow}>
          <Text style={[styles.time, { color: theme.subText }]}>
            {formatMessageTime(message.createdAt)}
          </Text>
          {renderStatusIcon()}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginVertical: 3,
    paddingHorizontal: 10,
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginBottom: 4,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    maxWidth: 220,
  },
  metaRow: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    alignItems: 'center',
    marginTop: 2,
  },
  time: {
    fontSize: 11,
    marginRight: 4,
  },
});
