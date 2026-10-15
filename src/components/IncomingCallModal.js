import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';
import Avatar from './Avatar';

export default function IncomingCallModal({ call, onAccept, onDecline }) {
  const { theme } = useAppTheme();
  const visible = !!call;
  const isVideo = call?.type === 'video';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDecline}>
      <View style={[styles.backdrop, { backgroundColor: theme.background }]}>
        <View style={styles.top}>
          <Avatar uri={call?.callerPhoto} name={call?.callerName} size={120} />
          <Text style={[styles.name, { color: theme.text }]}>{call?.callerName}</Text>
          <Text style={[styles.sub, { color: theme.subText }]}>
            Incoming {isVideo ? 'video' : 'voice'} call…
          </Text>
        </View>

        <View style={styles.actions}>
          <View style={styles.action}>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: theme.danger }]}
              onPress={onDecline}
            >
              <Ionicons name="close" size={30} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={[styles.label, { color: theme.subText }]}>Decline</Text>
          </View>

          <View style={styles.action}>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: theme.online }]}
              onPress={onAccept}
            >
              <Ionicons name={isVideo ? 'videocam' : 'call'} size={28} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={[styles.label, { color: theme.subText }]}>Accept</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 90 },
  top: { alignItems: 'center', marginTop: 40 },
  name: { fontSize: 26, fontWeight: '700', marginTop: 22 },
  sub: { fontSize: 15, marginTop: 8 },
  actions: { flexDirection: 'row', gap: 70 },
  action: { alignItems: 'center' },
  btn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 13, marginTop: 10 },
});
