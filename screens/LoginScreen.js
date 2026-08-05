import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import { Colors } from '../theme/colors';

export default function LoginScreen({ onLogin, onClose, initialMode = 'signin' }) {
  const [isSignUp, setIsSignUp] = useState(initialMode === 'signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    if (isSignUp && !name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (onLogin) {
      try {
        await onLogin({ email: email.trim(), password, name: name.trim(), isSignUp });
      } catch (e) {
        setError(e.message);
      }
    }
  };

  return (
    <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          {/* Close */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeX}>✕</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.mascot}>🦗</Text>
            <Text style={styles.title}>
              {isSignUp ? "Let's hunt your dream trip together" : 'Welcome back'}
            </Text>
            <Text style={styles.sub}>
              {isSignUp
                ? 'Your booking is ready — create your account and I\u2019ll build the perfect itinerary.'
                : 'Sign in to your Grillo account'}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {isSignUp && (
              <View style={styles.inputWrap}>
                <Text style={styles.inputLabel}>Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your name"
                  placeholderTextColor={Colors.sandLight}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            )}
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@email.com"
                placeholderTextColor={Colors.sandLight}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={Colors.sandLight}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
              <Text style={styles.submitText}>{isSignUp ? 'Create my account' : 'Sign in'}</Text>
            </TouchableOpacity>
          </View>

          {/* Toggle */}
          <TouchableOpacity style={styles.toggleBtn} onPress={() => setIsSignUp(!isSignUp)}>
            <Text style={styles.toggleText}>
              {isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 16 },
  card: {
    backgroundColor: Colors.white, borderRadius: 24, padding: 24,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 }, android: { elevation: 8 } }),
  },
  closeBtn: { alignSelf: 'flex-end', padding: 4 },
  closeX: { fontSize: 20, color: Colors.sand, fontWeight: '600' },
  header: { alignItems: 'center', marginBottom: 20 },
  mascot: { fontSize: 48 },
  title: { fontSize: 22, fontWeight: '800', color: Colors.brown, marginTop: 8 },
  sub: { fontSize: 13, color: Colors.sand, marginTop: 4, textAlign: 'center' },
  form: { gap: 14 },
  inputWrap: { gap: 4 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: Colors.brown, marginLeft: 4 },
  input: {
    backgroundColor: Colors.cardBg, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 15, color: Colors.brown, borderWidth: 1, borderColor: Colors.border,
  },
  errorText: {
    fontSize: 12, color: '#dc2626', fontWeight: '500', textAlign: 'center', marginTop: 4,
  },
  submitBtn: {
    backgroundColor: Colors.gold, borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 4,
  },
  submitText: { fontSize: 16, fontWeight: '700', color: Colors.brown },
  toggleBtn: { marginTop: 14, alignItems: 'center' },
  toggleText: { fontSize: 12, color: Colors.gold, fontWeight: '600' },
});
