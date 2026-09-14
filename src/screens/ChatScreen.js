import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { useCall } from '../context/CallContext';
import Avatar from '../components/Avatar';
import MessageBubble from '../components/MessageBubble';
import {
  subscribeToMessages,
  sendTextMessage,
  sendImageMessage,
  sendFileMessage,
  markMessagesAsSeen,
} from '../services/messageService';
import { subscribeToChat, setTyping, resetUnreadCount } from '../services/chatService';
import { uploadChatImage, uploadChatFile } from '../services/storageService';
import { subscribeToUserProfile } from '../services/userService';
import { formatLastSeen } from '../utils/dateUtils';

let typingTimeout = null;

export default function ChatScreen({ route, navigation }) {
  const { chatId, otherUser: initialOtherUser } = route.params;
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const { startCall } = useCall();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [otherUser, setOtherUser] = useState(initialOtherUser);
  const [chatData, setChatData] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [pendingImage, setPendingImage] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);

  const flatListRef = useRef(null);

  // Header: live other-user profile (online status / last seen)
  useEffect(() => {
    const unsub = subscribeToUserProfile(initialOtherUser.id, (p) => {
      if (p) setOtherUser(p);
    });
    return unsub;
  }, [initialOtherUser.id]);

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      header: () => (
        <View style={[styles.customHeader, { backgroundColor: theme.header }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={theme.headerText} />
          </TouchableOpacity>
          <Avatar uri={otherUser?.photoURL} name={otherUser?.username} size={38} online={otherUser?.online} showStatus />
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={[styles.headerName, { color: theme.headerText }]} numberOfLines={1}>
              {otherUser?.username}
            </Text>
            <Text style={[styles.headerStatus, { color: theme.headerText }]} numberOfLines={1}>
              {chatData?.typing?.[otherUser?.id]
                ? 'typing...'
                : otherUser?.online
                ? 'Online'
                : formatLastSeen(otherUser?.lastSeen)}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => startCall(otherUser, 'audio')}
            style={styles.headerCallBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="call-outline" size={22} color={theme.headerText} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => startCall(otherUser, 'video')}
            style={styles.headerCallBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="videocam-outline" size={24} color={theme.headerText} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [otherUser, chatData, theme, startCall]);

  // Real-time messages
  useEffect(() => {
    const unsub = subscribeToMessages(chatId, (msgs) => {
      setMessages(msgs);
      setLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return unsub;
  }, [chatId]);

  // Real-time chat doc (typing indicator)
  useEffect(() => {
    const unsub = subscribeToChat(chatId, setChatData);
    return unsub;
  }, [chatId]);

  // Mark messages as seen whenever new ones arrive while screen is focused
  useEffect(() => {
    markMessagesAsSeen(chatId, user.uid);
    resetUnreadCount(chatId, user.uid);
  }, [messages.length, chatId, user.uid]);

  // Clear typing flag when leaving the screen
  useEffect(() => {
    return () => {
      setTyping(chatId, user.uid, false);
      if (typingTimeout) clearTimeout(typingTimeout);
    };
  }, [chatId, user.uid]);

  function handleTextChange(value) {
    setText(value);
    setTyping(chatId, user.uid, value.length > 0);
    if (typingTimeout) clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      setTyping(chatId, user.uid, false);
    }, 2000);
  }

  async function handleSend() {
    if (!text.trim() && !pendingImage && !pendingFile) return;

    if (pendingImage) {
      setUploading(true);
      try {
        const imageURL = await uploadChatImage(chatId, pendingImage);
        await sendImageMessage(chatId, { senderId: user.uid, otherUid: otherUser.id, imageURL });
      } finally {
        setUploading(false);
        setPendingImage(null);
      }
    }

    if (pendingFile) {
      setUploading(true);
      try {
        const { url, name, size } = await uploadChatFile(chatId, pendingFile.uri, pendingFile.name);
        await sendFileMessage(chatId, {
          senderId: user.uid,
          otherUid: otherUser.id,
          fileURL: url,
          fileName: name,
          fileSize: size,
        });
      } finally {
        setUploading(false);
        setPendingFile(null);
      }
    }

    if (text.trim()) {
      const toSend = text.trim();
      setText('');
      await sendTextMessage(chatId, { senderId: user.uid, otherUid: otherUser.id, text: toSend });
    }

    setTyping(chatId, user.uid, false);
  }

  async function handlePickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
      allowsEditing: true,
    });
    if (!result.canceled) {
      setPendingImage(result.assets[0].uri);
    }
  }

  async function handlePickFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled) return;
    const asset = result.assets ? result.assets[0] : result;
    setPendingFile({ uri: asset.uri, name: asset.name });
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={theme.primary} />
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => item.id || `message-${index}`}
          renderItem={({ item }) => <MessageBubble message={item} isMine={item.senderId === user.uid} />}
          contentContainerStyle={{ paddingVertical: 10 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
      )}

      {pendingImage && (
        <View style={[styles.previewBar, { backgroundColor: theme.surface }]}>
          <Image source={{ uri: pendingImage }} style={styles.previewImage} />
          <Text style={{ color: theme.subText, marginLeft: 10, flex: 1 }}>Image ready to send</Text>
          <TouchableOpacity onPress={() => setPendingImage(null)}>
            <Ionicons name="close-circle" size={22} color={theme.danger} />
          </TouchableOpacity>
        </View>
      )}

      {pendingFile && (
        <View style={[styles.previewBar, { backgroundColor: theme.surface }]}>
          <Ionicons name="document-outline" size={30} color={theme.primary} />
          <Text style={{ color: theme.subText, marginLeft: 10, flex: 1 }} numberOfLines={1}>
            {pendingFile.name}
          </Text>
          <TouchableOpacity onPress={() => setPendingFile(null)}>
            <Ionicons name="close-circle" size={22} color={theme.danger} />
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.inputBar, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        <TouchableOpacity onPress={handlePickImage} style={styles.iconBtn}>
          <Ionicons name="image-outline" size={26} color={theme.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handlePickFile} style={styles.iconBtn}>
          <Ionicons name="attach-outline" size={26} color={theme.primary} />
        </TouchableOpacity>
        <TextInput
          style={[styles.textInput, { backgroundColor: theme.inputBackground, color: theme.text }]}
          placeholder="Type a message"
          placeholderTextColor={theme.subText}
          value={text}
          onChangeText={handleTextChange}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: theme.accent }]}
          onPress={handleSend}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="send" size={20} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 55,
    paddingBottom: 12,
    paddingHorizontal: 12,
  },
  backBtn: { marginRight: 8 },
  headerCallBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  headerName: { fontSize: 16, fontWeight: '700' },
  headerStatus: { fontSize: 12, opacity: 0.85, marginTop: 1 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: { padding: 6, marginBottom: 4 },
  textInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 15,
    marginHorizontal: 6,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  previewImage: { width: 44, height: 44, borderRadius: 8 },
});
