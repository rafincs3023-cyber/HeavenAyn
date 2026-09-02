import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import Avatar from '../components/Avatar';
import { updateUserProfile } from '../services/userService';
import { uploadProfileImage } from '../services/storageService';

export default function EditProfileScreen({ navigation }) {
  const { user, profile } = useAuth();
  const { theme } = useAppTheme();
  const [username, setUsername] = useState(profile?.username || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [localImage, setLocalImage] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handlePickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled) {
      setLocalImage(result.assets[0].uri);
    }
  }

  async function handleSave() {
    if (!username.trim()) {
      Alert.alert('Username required', 'Please enter a username.');
      return;
    }
    setSaving(true);
    try {
      let photoURL = profile?.photoURL;
      if (localImage) {
        photoURL = await uploadProfileImage(user.uid, localImage);
      }
      await updateUserProfile(user.uid, {
        username: username.trim(),
        bio: bio.trim(),
        photoURL,
      });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', 'Could not update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={[styles.header, { backgroundColor: theme.header }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.headerText} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.headerText }]}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator color={theme.headerText} />
          ) : (
            <Text style={{ color: theme.headerText, fontWeight: '700' }}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={handlePickImage}>
          <Avatar uri={localImage || profile?.photoURL} name={username} size={110} />
          <View style={[styles.editBadge, { backgroundColor: theme.accent }]}>
            <Ionicons name="camera" size={16} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: theme.subText }]}>Username</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.surface, color: theme.text }]}
          value={username}
          onChangeText={setUsername}
          placeholder="Username"
          placeholderTextColor={theme.subText}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: theme.subText }]}>Bio</Text>
        <TextInput
          style={[styles.input, styles.multiline, { backgroundColor: theme.surface, color: theme.text }]}
          value={bio}
          onChangeText={setBio}
          placeholder="Tell people about yourself"
          placeholderTextColor={theme.subText}
          multiline
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: theme.subText }]}>Email</Text>
        <Text style={[styles.readonlyValue, { color: theme.subText }]}>{profile?.email}</Text>
      </View>
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
  headerTitle: { fontSize: 18, fontWeight: '700' },
  avatarSection: { alignItems: 'center', paddingVertical: 24 },
  editBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  field: { paddingHorizontal: 20, marginBottom: 18 },
  label: { fontSize: 12, marginBottom: 6, textTransform: 'uppercase' },
  input: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  readonlyValue: { fontSize: 15, paddingHorizontal: 2 },
});
