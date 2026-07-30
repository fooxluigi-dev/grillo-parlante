import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, SafeAreaView
} from 'react-native';
import { Colors } from '../theme/colors';

const API_URL = 'https://gp-landing-rho.vercel.app/api/chat';

const WELCOME = {
  id: '0', role: 'grillo',
  text: '🦗 Ciao! I\'m Grillo, your AI travel companion. Ask me anything about your trip!\n\n🇭🇷 Try: "What to do in Split?"\n🍝 Try: "Best restaurants"\n🎒 Try: "What should I pack?"',
};

export default function ChatModal({ onClose }) {
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const flatRef = useRef(null);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { id: Date.now().toString(), role: 'user', text: input.trim() };
    const all = [...messages, userMsg];
    setMessages(all);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: all.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })),
          tripContext: 'Split, Croatia (August)',
        }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'grillo', text: data.reply || '🦗 Sorry!' }]);
    } catch {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'grillo', text: '🦗 Connection issue. Try again! 🌍' }]);
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        <View style={styles.header}>
          <Text style={styles.title}>🦗 Chat with Grillo</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={m => m.id}
          renderItem={({ item }) => (
            <View style={[styles.b, item.role === 'user' ? styles.ub : styles.gb]}>
              {item.role === 'grillo' && <Text style={styles.gi}>🦗</Text>}
              <Text style={[styles.bt, item.role === 'user' && styles.ut]}>{item.text}</Text>
            </View>
          )}
          contentContainerStyle={{ padding: 16 }}
          onContentSizeChange={() => flatRef.current?.scrollToEnd()}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={loading ? (
            <View style={styles.lr}>
              <View style={styles.lb}>
                <ActivityIndicator size="small" color={Colors.gold} />
                <Text style={styles.lt}>Grillo is thinking...</Text>
              </View>
            </View>
          ) : null}
        />
        <View style={styles.ir}>
          <TextInput
            style={styles.in}
            placeholder="Ask Grillo anything..."
            placeholderTextColor={Colors.sandLight}
            value={input}
            onChangeText={setInput}
            multiline maxLength={500}
            editable={!loading}
          />
          <TouchableOpacity style={[styles.sb, loading && styles.sd]} onPress={send} disabled={loading}>
            <Text style={styles.si}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { fontSize: 16, fontWeight: '700', color: Colors.brown },
  closeBtn: { position: 'absolute', right: 16, padding: 4 },
  closeText: { fontSize: 18, color: Colors.sand, fontWeight: '600' },
  b: { flexDirection: 'row', gap: 8, marginBottom: 12, maxWidth: '88%' },
  ub: { alignSelf: 'flex-end', backgroundColor: Colors.gold, borderRadius: 18, borderBottomRightRadius: 4, padding: 12 },
  gb: { alignSelf: 'flex-start', backgroundColor: Colors.white, borderRadius: 18, borderBottomLeftRadius: 4, padding: 12, ...Platform.select({ ios: { shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 3 }, android: { elevation: 2 } }) },
  gi: { fontSize: 18, marginTop: -2 },
  bt: { fontSize: 14, color: Colors.brown, lineHeight: 20, flex: 1 },
  ut: { fontWeight: '500' },
  lr: { alignSelf: 'flex-start', marginBottom: 12 },
  lb: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.white, borderRadius: 18, borderBottomLeftRadius: 4, padding: 12 },
  lt: { fontSize: 13, color: Colors.sand, fontWeight: '500' },
  ir: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border },
  in: { flex: 1, backgroundColor: Colors.cardBg, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: Colors.brown, maxHeight: 80, borderWidth: 1, borderColor: Colors.border },
  sb: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.gold, alignItems: 'center', justifyContent: 'center' },
  sd: { opacity: 0.5 },
  si: { fontSize: 16, color: Colors.brown },
});
