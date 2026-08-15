import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import { Colors } from '../theme/colors';

export default function LoginScreen({ onLogin, onClose, initialMode = 'signin', needsVerification = false, verificationEmail = '', onResendVerification, onForgotPassword }) {
  const [isSignUp, setIsSignUp] = useState(initialMode === 'signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState('auth'); // 'auth' | 'forgot' | 'sent'
  const [forgotEmail, setForgotEmail] = useState('');
  const [info, setInfo] = useState('');

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

  const handleForgot = async () => {
    setError('');
    if (!forgotEmail.trim()) {
      setError('Enter your email address');
      return;
    }
    if (onForgotPassword) {
      try {
        await onForgotPassword(forgotEmail.trim());
        setMode('sent');
        setInfo(`We sent a reset link to ${forgotEmail.trim()}. Check your inbox.`);
      } catch (e) {
        setError(e.message);
      }
    }
  };

  const handleResend = async () => {
    setError('');
    if (onResendVerification && verificationEmail) {
      try {
        await onResendVerification(verificationEmail);
        setInfo(`Another confirmation link sent to ${verificationEmail}.`);
      } catch (e) {
        setError(e.message);
      }
    }
  };

  // After a signup that requires email confirmation, show the "check your
  // inbox" state instead of a broken silent close.
  if (needsVerification) {
    return (
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.centerWrap}>
          <View style={styles.card}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeX}>✕</Text>
            </TouchableOpacity>
            <View style={styles.header}>
              <Text style={styles.mascot}>📬</Text>
              <Text style={styles.title}>Check your inbox</Text>
              <Text style={styles.sub}>
                We sent a confirmation link to{'\n'}{verificationEmail || 'your email'}.
                Tap it to activate your account, then sign in.
              </Text>
            </View>
            {info ? <Text style={styles.infoText}>{info}</Text> : null}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <TouchableOpacity style={styles.submitBtn} onPress={handleResend}>
              <Text style={styles.submitText}>Resend email</Text>
            </TouchableOpacity>
            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.divider} />
            </View>
            <TouchableOpacity style={styles.toggleBtn} onPress={onClose}>
              <Text style={styles.toggleText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // "Forgot password" email-entry step.
  if (mode === 'forgot' || mode === 'sent') {
    return (
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeX}>✕</Text>
            </TouchableOpacity>
            <View style={styles.header}>
              <Text style={styles.mascot}>🔑</Text>
              <Text style={styles.title}>
                {mode === 'sent' ? 'Check your inbox' : 'Reset your password'}
              </Text>
              <Text style={styles.sub}>
                {mode === 'sent'
                  ? info
                  : 'Enter your email and we\u2019ll send you a link to set a new password.'}
              </Text>
            </View>
            {mode === 'forgot' && (
              <View style={styles.form}>
                <View style={styles.inputWrap}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="you@email.com"
                    placeholderTextColor={Colors.sandLight}
                    value={forgotEmail}
                    onChangeText={setForgotEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                <TouchableOpacity style={styles.submitBtn} onPress={handleForgot}>
                  <Text style={styles.submitText}>Send reset link</Text>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity style={styles.toggleBtn} onPress={() => setMode('auth')}>
              <Text style={styles.toggleText}>← Back to sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

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
            {!isSignUp && (
              <TouchableOpacity style={styles.forgotBtn} onPress={() => { setMode('forgot'); setError(''); }}>
                <Text style={styles.forgotText}>Forgot your password?</Text>
              </TouchableOpacity>
            )}
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
  title: { fontSize: 22, fontWeight: '800', color: Colors.brown, marginTop: 8, textAlign: 'center' },
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
  infoText: {
    fontSize: 12, color: '#047857', fontWeight: '500', textAlign: 'center', marginTop: 4,
  },
  forgotBtn: { marginTop: 10, alignItems: 'center' },
  forgotText: { fontSize: 12, color: Colors.gold, fontWeight: '600' },
  centerWrap: { flex: 1, justifyContent: 'center', padding: 16 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 14 },
  divider: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontSize: 11, color: Colors.sand },
  submitBtn: {
    backgroundColor: Colors.gold, borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 4,
  },
  submitText: { fontSize: 16, fontWeight: '700', color: Colors.brown },
  toggleBtn: { marginTop: 14, alignItems: 'center' },
  toggleText: { fontSize: 12, color: Colors.gold, fontWeight: '600' },
});
