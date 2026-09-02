import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { subscribeToUserChats } from '../services/chatService';
import { getUserProfile, subscribeToAllUsers } from '../services/userService';
import ChatListItem from '../components/ChatListItem';

export default function HomeScreen({ navigation }) {
  const { user, profile } = useAuth();
  const { theme } = useAppTheme();
  const [chats, setChats] = useState([]);
  const [usersById, setUsersById] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsubChats = subscribeToUserChats(user.uid, (list) => {
      setChats(list);
      setLoading(false);
    });
    const unsubUsers = subscribeToAllUsers(user.uid, (users) => {
      const map = {};
      users.forEach((u) => (map[u.id] = u));
      setUsersById(map);
    });
    return () => {
      unsubChats();
      unsubUsers();
    };
  }, [user]);

  function openChat(chat, otherUser) {
    navigation.navigate('Chat', { chatId: chat.id, otherUser });
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.header }]}>
        <Text style={[styles.headerTitle, { color: theme.headerText }]}>HeavenAyn</Text>
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity onPress={() => navigation.navigate('Users')} style={styles.headerIcon}>
            <Ionicons name="people-outline" size={24} color={theme.headerText} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.headerIcon}>
            <Ionicons name="person-circle-outline" size={26} color={theme.headerText} />
          </TouchableOpacity>
        </View>
      </View>

      {!loading && chats.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubble-ellipses-outline" size={70} color={theme.subText} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No conversations yet</Text>
          <Text style={[styles.emptySubtitle, { color: theme.subText }]}>
            Tap the people icon to find users and start chatting.
          </Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const otherUid = item.users.find((id) => id !== user.uid);
            const otherUser = usersById[otherUid];
            return (
              <ChatListItem
                chat={item}
                otherUser={otherUser}
                currentUid={user.uid}
                onPress={() => openChat(item, otherUser)}
              />
            );
          }}
          ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: theme.border }]} />}
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.accent }]}
        onPress={() => navigation.navigate('Users')}
      >
        <Ionicons name="chatbubble" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 55,
    paddingBottom: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 24, fontWeight: '700' },
  headerIcon: { marginLeft: 16 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 82 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', marginTop: 6 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
});
