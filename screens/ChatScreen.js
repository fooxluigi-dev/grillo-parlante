import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { Colors } from '../theme/colors';
import { apiCall, API_ENDPOINTS } from '../utils/api';

const WELCOME = {
  id: '0',
  role: 'grillo',
  text: '🦗 Ciao! I\'m Grillo, your AI travel companion. Ask me anything about your trip!\n\n🍝 Try: "Best restaurants near me"\n🎒 Try: "What should I pack?"\n🗺️ Try: "Plan my itinerary"',
};

export default function ChatScreen({ route }) {
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const flatRef = useRef(null);
  const trip = route?.params?.trip;

  const sendWithMessages = async (msgList) => {
    setLoading(true);
    try {
      const apiMessages = msgList.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

      const res = await apiCall(API_ENDPOINTS.CHAT, {
        method: 'POST',
        body: JSON.stringify({
          messages: apiMessages,
          tripContext: trip
            ? `${trip.destination} (${trip.checkIn} → ${trip.checkOut})${trip.hotel ? ` - ${trip.hotel}` : ''}`
            : 'General travel chat',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        // New API requires auth — surface it instead of a generic failure
        const authReply = res.status === 401
          ? '🔒 Devi effettuare l\'accesso per chattare con Grillo.'
          : `🦗 Errore del server (${res.status}). Riprova!`;
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(), role: 'grillo', text: authReply,
        }]);
        setLoading(false);
        return;
      }
      const reply = data.reply || data.choices?.[0]?.message?.content || '🦗 Sorry, I couldn\'t process that. Try again!';

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'grillo', text: reply,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'grillo',
        text: '🦗 Oops! Connection issue. Try again! 🌍',
      }]);
    }
    setLoading(false);
  };

  const send = async () => {
    if (!input.trim() || loading) return;

    // Track chat count in localStorage
    if (Platform.OS === 'web') {
      try {
        const prev = parseInt(localStorage.getItem('grillo_chat_count') || '0');
        localStorage.setItem('grillo_chat_count', (prev + 1).toString());
      } catch {}
    }

    const userMsg = { id: Date.now().toString(), role: 'user', text: input.trim() };
    const all = [...messages, userMsg];
    setMessages(all);
    setInput('');

    await sendWithMessages(all);
  };

  return (
    <KeyboardAvoidingView style={styles.c} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
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
        contentContainerStyle={styles.lc}
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
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: '#0a0a0a' },
  lc: { padding: 16, paddingBottom: 8 },
  b: { flexDirection: 'row', gap: 8, marginBottom: 12, maxWidth: '88%' },
  ub: { alignSelf: 'flex-end', backgroundColor: Colors.gold, borderRadius: 18, borderBottomRightRadius: 4, padding: 12 },
  gb: { alignSelf: 'flex-start', backgroundColor: Colors.white, borderRadius: 18, borderBottomLeftRadius: 4, padding: 12, ...Platform.select({ ios: { shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 3 }, android: { elevation: 2 } }) },
  gi: { fontSize: 18, marginTop: -2 },
  bt: { fontSize: 14, color: Colors.brown, lineHeight: 20, flex: 1 },
  ut: { color: Colors.brown, fontWeight: '500' },
  lr: { alignSelf: 'flex-start', marginBottom: 12 },
  lb: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.white, borderRadius: 18, borderBottomLeftRadius: 4, padding: 12, ...Platform.select({ ios: { shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 3 }, android: { elevation: 2 } }) },
  lt: { fontSize: 13, color: Colors.sand, fontWeight: '500' },
  ir: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border },
  in: { flex: 1, backgroundColor: Colors.cardBg, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: Colors.brown, maxHeight: 80, borderWidth: 1, borderColor: Colors.border },
  sb: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.gold, alignItems: 'center', justifyContent: 'center' },
  sd: { opacity: 0.5 },
  si: { fontSize: 16, color: Colors.brown },
});
