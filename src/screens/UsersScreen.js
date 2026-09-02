import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { subscribeToAllUsers, filterUsers } from '../services/userService';
import { getOrCreateChat } from '../services/chatService';
import UserListItem from '../components/UserListItem';

export default function UsersScreen({ navigation }) {
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [startingChatWith, setStartingChatWith] = useState(null);

  useEffect(() => {
    const unsub = subscribeToAllUsers(user.uid, (list) => {
      setUsers(list);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  async function handleSelectUser(otherUser) {
    setStartingChatWith(otherUser.id);
    try {
      const chatId = await getOrCreateChat(user.uid, otherUser.id);
      navigation.navigate('Chat', { chatId, otherUser });
    } finally {
      setStartingChatWith(null);
    }
  }

  const filtered = filterUsers(users, search);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.header }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.headerText} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.headerText }]}>Select User</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.searchWrapper, { backgroundColor: theme.inputBackground }]}>
        <Ionicons name="search" size={18} color={theme.subText} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search by username or email"
          placeholderTextColor={theme.subText}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={theme.subText} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 30 }} color={theme.primary} />
      ) : filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="person-outline" size={60} color={theme.subText} />
          <Text style={[styles.emptyText, { color: theme.subText }]}>No users found</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <UserListItem
              user={item}
              onPress={() => handleSelectUser(item)}
            />
          )}
          ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: theme.border }]} />}
        />
      )}

      {startingChatWith && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      )}
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
  headerTitle: { fontSize: 18, fontWeight: '700' },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 78 },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  emptyText: { marginTop: 12, fontSize: 15 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
