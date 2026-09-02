import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';

export default function ForgotPasswordScreen({ navigation }) {
  const { forgotPassword } = useAuth();
  const { theme } = useAppTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleReset() {
    setError('');
    setMessage('');
    if (!email.trim()) {
      setError('Please enter your email.');
      return;
    }
    setLoading(true);
    const result = await forgotPassword(email.trim());
    setLoading(false);
    if (result.success) {
      setMessage('Password reset email sent! Check your inbox.');
    } else {
      setError(result.error);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={theme.text} />
      </TouchableOpacity>

      <Ionicons name="key-outline" size={60} color={theme.primary} style={{ alignSelf: 'center', marginBottom: 16 }} />
      <Text style={[styles.title, { color: theme.text }]}>Reset Password</Text>
      <Text style={[styles.subtitle, { color: theme.subText }]}>
        Enter your email and we'll send you a link to reset your password.
      </Text>

      {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
      {message ? <Text style={[styles.success, { color: theme.accent }]}>{message}</Text> : null}

      <View style={[styles.inputWrapper, { backgroundColor: theme.inputBackground }]}>
        <Ionicons name="mail-outline" size={20} color={theme.subText} />
        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholder="Email"
          placeholderTextColor={theme.subText}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
      </View>

      <TouchableOpacity style={[styles.button, { backgroundColor: theme.primary }]} onPress={handleReset} disabled={loading}>
        {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Send Reset Link</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  backButton: { position: 'absolute', top: 55, left: 20 },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', marginTop: 8, marginBottom: 24 },
  error: { textAlign: 'center', marginBottom: 12 },
  success: { textAlign: 'center', marginBottom: 12 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 18,
  },
  input: { flex: 1, marginLeft: 10, fontSize: 15 },
  button: { paddingVertical: 15, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
