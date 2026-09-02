import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import Avatar from '../components/Avatar';

export default function ProfileScreen({ navigation }) {
  const { user, profile, logout, getSavedAccounts, removeSavedAccount, switchAccount } = useAuth();
  const { theme, mode, toggleTheme } = useAppTheme();
  const [savedAccounts, setSavedAccounts] = useState([]);

  useFocusEffect(
    useCallback(() => {
      getSavedAccounts().then(setSavedAccounts);
    }, [])
  );

  function handleLogout() {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => logout() },
    ]);
  }

  function handleSwitchTo(account) {
    Alert.alert(
      'Switch Account',
      `Log out and sign in as ${account.username || account.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Switch', onPress: () => switchAccount(account.email) },
      ]
    );
  }

  function handleAddAccount() {
    switchAccount(null);
  }

  function handleForgetAccount(uid) {
    removeSavedAccount(uid).then(() => getSavedAccounts().then(setSavedAccounts));
  }

  const otherAccounts = savedAccounts.filter((a) => a.uid !== user?.uid);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={[styles.header, { backgroundColor: theme.header }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.headerText} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.headerText }]}>Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.avatarSection}>
        <Avatar uri={profile?.photoURL} name={profile?.username} size={110} />
        <Text style={[styles.username, { color: theme.text }]}>{profile?.username}</Text>
        <Text style={[styles.email, { color: theme.subText }]}>{profile?.email}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <Text style={[styles.label, { color: theme.subText }]}>Bio</Text>
        <Text style={[styles.value, { color: theme.text }]}>{profile?.bio || 'Hey there! I am using HeavenAyn.'}</Text>
      </View>

      <TouchableOpacity
        style={[styles.card, styles.row, { backgroundColor: theme.surface }]}
        onPress={() => navigation.navigate('EditProfile')}
      >
        <Ionicons name="create-outline" size={22} color={theme.primary} />
        <Text style={[styles.rowText, { color: theme.text }]}>Edit Profile</Text>
        <Ionicons name="chevron-forward" size={20} color={theme.subText} />
      </TouchableOpacity>

      <View style={[styles.card, styles.row, { backgroundColor: theme.surface }]}>
        <Ionicons name="moon-outline" size={22} color={theme.primary} />
        <Text style={[styles.rowText, { color: theme.text }]}>Dark Mode</Text>
        <Switch value={mode === 'dark'} onValueChange={toggleTheme} />
      </View>

      {otherAccounts.length > 0 && (
        <View style={[styles.card, { backgroundColor: theme.surface, paddingVertical: 8 }]}>
          <Text style={[styles.label, { color: theme.subText, marginLeft: 4, marginTop: 6 }]}>
            Switch Account
          </Text>
          {otherAccounts.map((account) => (
            <View key={account.uid} style={styles.accountRow}>
              <TouchableOpacity style={styles.row} onPress={() => handleSwitchTo(account)}>
                <Ionicons name="person-outline" size={20} color={theme.primary} />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={{ color: theme.text, fontWeight: '600' }} numberOfLines={1}>
                    {account.username || account.email}
                  </Text>
                  <Text style={{ color: theme.subText, fontSize: 12 }} numberOfLines={1}>
                    {account.email}
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleForgetAccount(account.uid)} style={{ padding: 6 }}>
                <Ionicons name="close" size={18} color={theme.subText} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={[styles.card, styles.row, { backgroundColor: theme.surface }]}
        onPress={handleAddAccount}
      >
        <Ionicons name="person-add-outline" size={22} color={theme.primary} />
        <Text style={[styles.rowText, { color: theme.text }]}>Add Another Account</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.card, styles.row, { backgroundColor: theme.surface }]}
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={22} color={theme.danger} />
        <Text style={[styles.rowText, { color: theme.danger }]}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 55,
    paddingBottom: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: {},
  headerTitle: { fontSize: 18, fontWeight: '700' },
  avatarSection: { alignItems: 'center', paddingVertical: 24 },
  username: { fontSize: 20, fontWeight: '700', marginTop: 14 },
  email: { fontSize: 14, marginTop: 4 },
  card: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 12,
    padding: 16,
  },
  label: { fontSize: 12, marginBottom: 4, textTransform: 'uppercase' },
  value: { fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  rowText: { flex: 1, marginLeft: 12, fontSize: 15, fontWeight: '500' },
});
