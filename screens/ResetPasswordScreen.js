import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { Colors } from '../theme/colors';

// Shown after the user follows the "reset password" email link (Supabase emits
// PASSWORD_RECOVERY with a temporary session). Lets them set a new password.
export default function ResetPasswordScreen({ onUpdatePassword, onClose }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (password.length < 6) {
      setError('La password deve avere almeno 6 caratteri');
      return;
    }
    if (password !== confirm) {
      setError('Le password non coincidono');
      return;
    }
    setBusy(true);
    try {
      await onUpdatePassword(password);
      setDone(true);
    } catch (e) {
      setError(e.message || 'Errore durante il salvataggio');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeX}>✕</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.mascot}>🔑</Text>
            <Text style={styles.title}>Imposta una nuova password</Text>
            <Text style={styles.sub}>
              Scegli una password sicura per tornare a cacciare il tuo viaggio perfetto.
            </Text>
          </View>

          {done ? (
            <View style={styles.doneWrap}>
              <Text style={styles.doneTitle}>Password aggiornata 🎉</Text>
              <Text style={styles.doneSub}>Ora puoi accedere con la nuova password.</Text>
              <TouchableOpacity style={styles.submitBtn} onPress={onClose}>
                <Text style={styles.submitText}>Torna al login</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.inputWrap}>
                <Text style={styles.inputLabel}>Nuova password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.sandLight}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.inputWrap}>
                <Text style={styles.inputLabel}>Conferma password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.sandLight}
                  value={confirm}
                  onChangeText={setConfirm}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <TouchableOpacity
                style={[styles.submitBtn, busy && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color={Colors.brown} />
                ) : (
                  <Text style={styles.submitText}>Salva password</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
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
  submitBtn: {
    backgroundColor: Colors.gold, borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { fontSize: 16, fontWeight: '700', color: Colors.brown },
  doneWrap: { alignItems: 'center', gap: 8, marginTop: 8 },
  doneTitle: { fontSize: 18, fontWeight: '800', color: Colors.brown },
  doneSub: { fontSize: 13, color: Colors.sand, textAlign: 'center' },
});