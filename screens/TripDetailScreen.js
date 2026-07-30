import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Platform, SafeAreaView, Dimensions, ActivityIndicator
} from 'react-native';
import { Colors } from '../theme/colors';
import { generateItinerary } from '../utils/itinerary';
import { SupabaseTrips } from '../utils/supabase-trips';

const { width: SCREEN_W } = Dimensions.get('window');

export default function TripDetailScreen({ route, navigation }) {
  const { tripId } = route.params || {};
  const [trip, setTrip] = useState(null);
  const [activeDay, setActiveDay] = useState(0);
  const [DAYS, setDays] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load trip from Supabase on mount
  useEffect(() => {
    let mounted = true;
    setLoading(true);

    let loaded = null;
    const loadTrip = async () => {
      if (tripId) {
        const t = await SupabaseTrips.getById(tripId);
        if (mounted && t) { setTrip(t); loaded = t; }
      } else if (route.params?.trip) {
        const t = route.params.trip;
        setTrip(t);
        loaded = t;
      }
    };

    loadTrip().then(() => {
      if (loaded) {
        generateItinerary(loaded).then(days => {
          if (mounted) {
            setDays(days);
            setLoading(false);
          }
        });
      } else {
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, [tripId, trip?.id, trip?.checkIn, trip?.checkOut, trip?.destination]);

  if (loading || !DAYS || DAYS.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={Colors.gold} />
          <Text style={{ marginTop: 12, fontSize: 14, color: Colors.sand }}>Generating your itinerary...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const current = DAYS[activeDay] || DAYS[0];

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerIcon}>📋</Text>
          <Text style={styles.headerTitle}>Itinerario Giorno per Giorno</Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>

        {/* Day selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayRow}>
          {DAYS.map((d, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.dayBtn, i === activeDay && styles.dayBtnActive]}
              onPress={() => setActiveDay(i)}
            >
              <Text style={[styles.dayLabel, i === activeDay && styles.dayLabelActive]}>{d.day}</Text>
              <Text style={[styles.dayIcon, i === activeDay && styles.dayIconActive]}>{d.icon}</Text>
              <Text style={[styles.daySub, i === activeDay && styles.daySubActive]}>{d.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ═══ Grillo banner: between days & content ═══ */}
        <TouchableOpacity
          style={styles.grilloBanner}
          onPress={() => navigation.navigate('Chat', { trip })}
          activeOpacity={0.8}
        >
          <Image
            source={require('../assets/grillo-icon.png')}
            style={styles.grilloBannerImg}
            resizeMode="contain"
          />
          <Text style={styles.grilloBannerText}>Ask Grillo about the day</Text>
          <Text style={styles.grilloBannerArrow}>→</Text>
        </TouchableOpacity>

        {/* Day title */}
        <View style={styles.dayTitleRow}>
          <View style={styles.dayTitleLeft}>
            <Text style={styles.dayTitleIcon}>{current.icon}</Text>
            <Text style={styles.dayTitle}>{current.subtitle}</Text>
          </View>
          <View style={styles.dayBadge}>
            <Text style={styles.dayBadgeText}>{current.label}</Text>
          </View>
        </View>

        {/* Hero image */}
        <Image
          source={{ uri: current.image }}
          style={styles.hero}
          resizeMode="cover"
        />

        {/* Activities */}
        <View style={styles.activities}>
          {current.activities.map((act, i) => (
            <View key={i} style={styles.activityRow}>
              {/* Timeline line */}
              <View style={styles.timeline}>
                <View style={styles.timelineDot} />
                {i < current.activities.length - 1 && <View style={styles.timelineLine} />}
              </View>

              {/* Content */}
              <View style={styles.activityContent}>
                <View style={styles.activityHeader}>
                  <Text style={styles.activityIcon}>{act.icon}</Text>
                  <Text style={styles.activityTime}>{act.time}</Text>
                </View>
                <Text style={styles.activityTitle}>{act.title}</Text>
                <Text style={styles.activityDesc}>{act.desc}</Text>
                {act.price && (
                  <Text style={styles.activityPrice}>{act.price}</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { padding: 4 },
  backText: { fontSize: 15, fontWeight: '600', color: Colors.gold },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerIcon: { fontSize: 16 },
  headerTitle: { fontSize: 15, fontWeight: '700', color: Colors.brown },

  scroll: { flex: 1 },

  // Day selector
  dayRow: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row' },
  dayBtn: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white,
    alignItems: 'center', marginRight: 8, minWidth: 70,
  },
  dayBtnActive: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  dayLabel: { fontSize: 11, fontWeight: '600', color: Colors.sand, marginBottom: 2 },
  dayLabelActive: { color: Colors.brown },
  dayIcon: { fontSize: 16, marginBottom: 2 },
  dayIconActive: {},
  daySub: { fontSize: 10, fontWeight: '500', color: Colors.sandLight },
  daySubActive: { color: Colors.brown, fontWeight: '700' },

  // Day title
  dayTitleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, marginBottom: 10,
  },
  dayTitleLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dayTitleIcon: { fontSize: 20 },
  dayTitle: { fontSize: 20, fontWeight: '800', color: Colors.brown },
  dayBadge: {
    backgroundColor: Colors.goldGlow, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12,
  },
  dayBadgeText: { fontSize: 11, fontWeight: '600', color: Colors.goldDark },

  // Hero image
  hero: {
    width: SCREEN_W - 32, height: 200, borderRadius: 16, marginHorizontal: 16, marginBottom: 16,
    backgroundColor: Colors.border,
  },

  // Activities
  activities: { paddingHorizontal: 16, gap: 0 },
  activityRow: { flexDirection: 'row', gap: 12 },
  timeline: { alignItems: 'center', width: 20 },
  timelineDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.gold, marginTop: 4,
  },
  timelineLine: {
    width: 2, flex: 1, backgroundColor: Colors.border, marginTop: 4,
  },
  activityContent: { flex: 1, paddingBottom: 20 },
  activityHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  activityIcon: { fontSize: 14 },
  activityTime: { fontSize: 11, fontWeight: '700', color: Colors.terra, letterSpacing: 0.5 },
  activityTitle: { fontSize: 15, fontWeight: '700', color: Colors.brown, lineHeight: 20, marginBottom: 3 },
  activityDesc: { fontSize: 13, color: Colors.sand, lineHeight: 18 },
  activityPrice: { fontSize: 12, fontWeight: '600', color: Colors.terra, marginTop: 4 },

  // Grillo banner (between days & content)
  grilloBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gold,
    marginHorizontal: 16,
    marginBottom: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: { elevation: 4 },
    }),
  },
  grilloBannerImg: { width: 36, height: 36, borderRadius: 18 },
  grilloBannerText: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.brown },
  grilloBannerArrow: { fontSize: 18, color: Colors.brown, fontWeight: '600' },
});
