import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert
} from 'react-native';
import { Colors } from '../theme/colors';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { SupabaseTrips } from '../utils/supabase-trips';

export default function TripsScreen() {
  const navigation = useNavigation();
  const { currentUser } = useContext(AuthContext);
  const [trips, setTrips] = useState([]);
  const userId = currentUser?.id;

  useEffect(() => {
    if (userId) SupabaseTrips.getAll(userId).then(setTrips);
  }, [userId]);

  // Refresh when screen comes into focus
  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      if (userId) SupabaseTrips.getAll(userId).then(setTrips);
    });
    return unsub;
  }, [navigation, userId]);

  const confirmDelete = (trip) => {
    const doDelete = async () => {
      await SupabaseTrips.remove(trip.id);
      setTrips(prev => prev.filter(t => t.id !== trip.id));
    };

    // Web: use native confirm dialog
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete ${trip.destination}?`)) {
        doDelete();
      }
      return;
    }

    // Native: use Alert
    Alert.alert(
      'Remove trip',
      `Delete ${trip.destination}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]
    );
  };

  if (trips.length === 0) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>My Trips</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>✈️</Text>
          <Text style={styles.emptyTitle}>No trips yet</Text>
          <Text style={styles.emptyDesc}>
            Upload a booking confirmation or plan a new trip with Grillo!
          </Text>
          <View style={styles.emptyActions}>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('Home')}>
              <Text style={styles.emptyBtnIcon}>📸</Text>
              <Text style={styles.emptyBtnText}>Upload booking</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.emptyBtn, styles.emptyBtnOutline]} onPress={() => navigation.navigate('Chat')}>
              <Text style={styles.emptyBtnIcon}>🦗</Text>
              <Text style={[styles.emptyBtnText, { color: Colors.gold }]}>Chat with Grillo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>My Trips</Text>
      {trips.map((trip, i) => (
        <View key={trip.id || i} style={styles.tripCardWrap}>
          <TouchableOpacity style={styles.tripCard} onPress={() => navigation.navigate('TripDetail', { tripId: trip.id })}>
            <View style={styles.tripHeader}>
              <Text style={styles.tripDestination}>{trip.destination}</Text>
              {trip.hotel ? <Text style={styles.tripHotel}>🏨 {trip.hotel}</Text> : null}
            </View>
            <Text style={styles.tripDate}>{trip.checkIn} → {trip.checkOut}</Text>
            {trip.confirmation ? <Text style={styles.tripConf}>Conf: {trip.confirmation}</Text> : null}
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDelete(trip)}>
            <Text style={styles.deleteBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', paddingHorizontal: 16 },
  title: { fontSize: 24, fontWeight: '800', color: '#fff', paddingTop: 16, marginBottom: 16 },

  emptyState: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyIcon: { fontSize: 60 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  emptyDesc: { fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
  emptyActions: { gap: 10, marginTop: 16, width: '100%' },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.gold, padding: 14, borderRadius: 16,
  },
  emptyBtnOutline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.gold },
  emptyBtnIcon: { fontSize: 18 },
  emptyBtnText: { fontSize: 15, fontWeight: '700', color: Colors.brown },

  tripCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  tripCardWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10,
  },
  deleteBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center',
  },
  deleteBtnText: { fontSize: 14, fontWeight: '700', color: '#dc2626' },
  tripHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tripDestination: { fontSize: 16, fontWeight: '700', color: '#fff' },
  tripHotel: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },
  tripDate: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 },
  tripConf: { fontSize: 11, color: Colors.gold, marginTop: 2, fontWeight: '500' },
});
