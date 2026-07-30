import React, { useState, useContext, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Switch, Platform, Alert
} from 'react-native';
import { Colors } from '../theme/colors';
import { AuthContext } from '../context/AuthContext';
import { SupabaseTrips } from '../utils/supabase-trips';

export default function ProfileScreen({ navigation }) {
  const { logout, currentUser } = useContext(AuthContext);
  const [notifications, setNotifications] = useState({
    weather: true,
    packing: true,
    reminders: false,
    tips: true,
  });
  const [tripCount, setTripCount] = useState(0);
  const [nextDays, setNextDays] = useState(null);
  const [chatCount, setChatCount] = useState('—');

  useEffect(() => {
    const userId = currentUser?.id;
    if (userId) {
      SupabaseTrips.count(userId).then(setTripCount);
      SupabaseTrips.nextDays(userId).then(setNextDays);
      // Chat count: load from localStorage (set by ChatScreen)
      if (Platform.OS === 'web') {
        try {
          const saved = localStorage.getItem('grillo_chat_count');
          setChatCount(saved ? parseInt(saved) : '—');
        } catch {}
      }
    }
  }, [currentUser?.id]);

  const toggleNotification = (key) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLogout = () => {
    const doLogout = () => logout();

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to sign out?')) {
        doLogout();
      }
      return;
    }

    Alert.alert(
      'Sign out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign out', style: 'destructive', onPress: doLogout },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile header */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>🦗</Text>
        </View>
        <Text style={styles.name}>{currentUser?.name || 'Luigi'}</Text>
        <Text style={styles.email}>{currentUser?.email || 'user@email.com'}</Text>
        <View style={styles.planBadge}>
          <Text style={styles.planText}>Free plan</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{tripCount}</Text>
          <Text style={styles.statLabel}>Trips</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{chatCount}</Text>
          <Text style={styles.statLabel}>Chats today</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{nextDays !== null ? nextDays : '—'}</Text>
          <Text style={styles.statLabel}>{nextDays === 0 ? 'Today!' : nextDays === 1 ? 'Day to go' : 'Days to go'}</Text>
        </View>
      </View>

      {/* Notifications */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>🔔 Notifications</Text>

        {[
          { key: 'weather', icon: '☀️', label: 'Weather alerts', sub: 'Daily forecast & rain warnings' },
          { key: 'packing', icon: '🎒', label: 'Packing reminders', sub: 'Checklist nudges before trips' },
          { key: 'reminders', icon: '⏰', label: 'Trip reminders', sub: 'Check-in, flight, and event alerts' },
          { key: 'tips', icon: '💡', label: 'Travel tips', sub: 'AI recommendations and hidden gems' },
        ].map(item => (
          <View key={item.key} style={styles.notifRow}>
            <Text style={styles.notifIcon}>{item.icon}</Text>
            <View style={styles.notifContent}>
              <Text style={styles.notifLabel}>{item.label}</Text>
              <Text style={styles.notifSub}>{item.sub}</Text>
            </View>
            <Switch
              value={notifications[item.key]}
              onValueChange={() => toggleNotification(item.key)}
              trackColor={{ false: Colors.border, true: Colors.goldGlow }}
              thumbColor={notifications[item.key] ? Colors.gold : Colors.sandLight}
            />
          </View>
        ))}
      </View>

      {/* Account */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>👤 Account</Text>

        <TouchableOpacity style={styles.menuRow}>
          <Text style={styles.menuIcon}>📊</Text>
          <Text style={styles.menuLabel}>Usage stats</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
        <View style={styles.menuDivider} />
        <TouchableOpacity style={styles.menuRow}>
          <Text style={styles.menuIcon}>⭐</Text>
          <Text style={styles.menuLabel}>Upgrade to Premium</Text>
          <View style={styles.premiumBadge}>
            <Text style={styles.premiumText}>€5.99</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.menuDivider} />
        <TouchableOpacity style={styles.menuRow}>
          <Text style={styles.menuIcon}>💬</Text>
          <Text style={styles.menuLabel}>Share feedback</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>🚪 Sign out</Text>
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  // Profile header
  profileCard: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(232,168,50,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: { fontSize: 36 },
  name: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  email: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 2,
  },
  planBadge: {
    marginTop: 8,
    backgroundColor: 'rgba(232,168,50,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  planText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.gold,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    gap: 2,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  statNum: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.gold,
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '500',
  },

  // Section card
  sectionCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 14,
  },

  // Notifications
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  notifIcon: { fontSize: 20 },
  notifContent: { flex: 1 },
  notifLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  notifSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 1,
  },

  // Menu
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  menuIcon: { fontSize: 18 },
  menuLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  menuArrow: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '300',
  },
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  premiumBadge: {
    backgroundColor: Colors.gold,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  premiumText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.brown,
  },

  // Logout
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.2)',
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
});
