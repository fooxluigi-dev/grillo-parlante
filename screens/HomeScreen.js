import React, { useContext, useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert, Modal, RefreshControl, Animated,
} from 'react-native';
import { Colors } from '../theme/colors';
import { AuthContext } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { apiCall, API_ENDPOINTS } from '../utils/api';
import AnimatedCard from '../components/AnimatedCard';
import EmptyStateIllustration from '../components/EmptyStateIllustration';
import UploadBookingScreen from './UploadBookingScreen';
import PreferenceQuiz from '../components/PreferenceQuiz';
import { SupabaseTrips } from '../utils/supabase-trips';
import { scheduleTripNotifications } from '../utils/notifications';
import { eventBookingFromExtra, buildEventDay, mergeEventIntoItinerary } from '../utils/events';

const QUICK_ACTIONS = [
  { icon: '📸', label: 'Upload booking', desc: 'Scan confirmation', tab: null, action: 'upload' },
  { icon: '🦗', label: 'Chat with Grillo', desc: 'AI travel tips', tab: 'Chat', action: null },
  { icon: '✈️', label: 'My trips', desc: 'View all plans', tab: 'Trips', action: null },
  { icon: '👫', label: 'Invite buddies', desc: 'Share with friends', tab: null, action: 'invite' },
];

// ─── GrilloWorkshop — cinematic working overlay ───
function GrilloWorkshop({ booking }) {
  const dest = booking?.destination || 'your destination';
  const checkIn = booking?.checkIn || '';
  const checkOut = booking?.checkOut || '';
  const hotel = booking?.hotel || '';
  const guests = booking?.guests || '';
  const conf = booking?.confirmation || '';

  // Build phases dynamically from booking data
  const PHASES = [
    { icon: '📸', text: `Looking at your screenshot...`, sub: dest !== 'your destination' ? `I can see ${dest} in your booking` : 'Checking every detail' },
    { icon: '📍', text: dest !== 'your destination' ? `Seen: ${dest} — researching now...` : 'Exploring your destination...', sub: hotel ? `Your stay at ${hotel}` : 'Finding the best spots' },
    { icon: '✈️', text: conf ? `Your code: ${conf} — checking flights...` : 'Checking travel routes...', sub: guests ? `Traveling with ${guests}` : 'Optimizing your route' },
    { icon: '🌤️', text: 'Checking local conditions...', sub: checkIn ? `Preparing for ${checkIn} arrival` : 'Weather, transport, events' },
    { icon: '🍜', text: dest !== 'your destination' ? `Finding gems in ${dest}...` : 'Discovering local spots...', sub: 'The places only residents know' },
    { icon: '🧠', text: dest !== 'your destination' ? `Building your ${dest} itinerary...` : 'Crafting your itinerary...', sub: checkOut ? `${checkIn} → ${checkOut} of memories` : 'Making every day count' },
    { icon: '🦗', text: 'Final touches...', sub: 'Polishing everything for you' },
  ];

  const [phase, setPhase] = useState(0);
  const op = useRef(new Animated.Value(1)).current;
  const grilloPulse = useRef(new Animated.Value(1)).current;
  const [dots, setDots] = useState('');
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse Grillo icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(grilloPulse, { toValue: 1.08, duration: 1200, useNativeDriver: true }),
        Animated.timing(grilloPulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();

    // Phase cycling
    let currentPhase = 0;
    const phaseTimer = setInterval(() => {
      currentPhase = (currentPhase + 1) % PHASES.length;
      Animated.sequence([
        Animated.timing(op, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(op, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]).start();
      setTimeout(() => setPhase(currentPhase), 200);
    }, 7000);

    // Progress bar — incremental fill
    Animated.timing(progress, { toValue: 0.92, duration: 60000, useNativeDriver: false }).start();

    // Animated dots
    const dotsTimer = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 600);

    return () => {
      clearInterval(phaseTimer);
      clearInterval(dotsTimer);
    };
  }, []);

  const p = PHASES[phase];

  // Random personalized thoughts — all based on what was seen in the screenshot
  const THOUGHTS = [
    dest !== 'your destination' ? `I noticed you're heading to ${dest}... great choice! 🌊` : null,
    hotel ? `Your stay at ${hotel} looks lovely — I'm finding things nearby...` : null,
    conf ? `Booking ${conf} — I've confirmed the details ✅` : null,
    guests ? `${guests} — I'm making sure there's something for everyone 👥` : null,
    dest !== 'your destination' ? `Looking up what's special about ${dest} this time of year...` : null,
    checkIn && checkOut ? `From ${checkIn} to ${checkOut} — let me plan every single day...` : null,
    dest !== 'your destination' ? `Checking restaurant reviews in ${dest}... saving the best ones 🍝` : null,
    'Reading reviews, comparing prices, finding hidden gems... 📋',
    hotel ? `Walking distance from ${hotel} to the best spots... 🚶` : null,
    dest !== 'your destination' ? `I can picture you walking through ${dest} — let me make it perfect ✨` : null,
  ].filter(Boolean);

  const [thought, setThought] = useState(THOUGHTS[0]);

  useEffect(() => {
    const thoughtTimer = setInterval(() => {
      const next = THOUGHTS[Math.floor(Math.random() * THOUGHTS.length)];
      setThought(next);
    }, 9000);
    return () => clearInterval(thoughtTimer);
  }, []);

  return (
    <View style={styles.woOverlay}>
      <View style={styles.woCard}>
        {/* Pulsing Grillo */}
        <Animated.View style={[styles.woIconWrap, { transform: [{ scale: grilloPulse }] }]}>
          <Text style={styles.woIcon}>🦗</Text>
        </Animated.View>

        {/* Phase badge */}
        <Animated.View style={{ opacity: op, alignItems: 'center' }}>
          <Text style={styles.woPhaseIcon}>{p.icon}</Text>
          <Text style={styles.woText}>{p.text}{dots}</Text>
          <Text style={styles.woSub}>{p.sub}</Text>
        </Animated.View>

        {/* Progress */}
        <View style={styles.woProgressBar}>
          <Animated.View style={[styles.woProgressFill, {
            width: progress.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          }]} />
        </View>

        {/* Grillo's inner thought — human touch */}
        <Animated.View style={{ opacity: op }} key={thought}>
          <Text style={styles.woThought}>{thought}</Text>
        </Animated.View>

        <Text style={styles.woHint}>This may take a minute — great things take time ✨</Text>
      </View>
    </View>
  );
}

// ─── Celebration Overlay — "The Dream Trip Is Ready" ───
function CelebrationOverlay() {
  const pulse = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0.3)).current;
  const op = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.06, duration: 800, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(glow, { toValue: 0.7, duration: 1200, useNativeDriver: false }),
          Animated.timing(glow, { toValue: 0.3, duration: 1200, useNativeDriver: false }),
        ])
      ),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.celebOverlay, { opacity: op }]}>
      <Animated.View style={[styles.celebCard, { transform: [{ scale: pulse }] }]}>
        <Animated.View style={[styles.celebIconWrap, { backgroundColor: `rgba(232,168,50,${glow})` }]}>
          <Text style={styles.celebIcon}>🦗</Text>
        </Animated.View>
        <Text style={styles.celebTitle}>The Dream Trip Is Ready</Text>
        <Text style={styles.celebSub}>Grillo crafted your itinerary ✨</Text>
        <View style={styles.celebDots}>
          {[0, 1, 2].map(i => (
            <Animated.View key={i} style={[styles.celebDot, { opacity: glow }]} />
          ))}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

export default function HomeScreen({ pendingBooking: incomingBooking, onPendingBookingConsumed }) {
  const { currentUser } = useContext(AuthContext);
  const navigation = useNavigation();
  const [showUpload, setShowUpload] = useState(false);
  const [upcomingTrip, setUpcomingTrip] = useState(null);
  const [tripCount, setTripCount] = useState(0);
  const [pendingBooking, setPendingBooking] = useState(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [loadingItinerary, setLoadingItinerary] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showTripPicker, setShowTripPicker] = useState(false);
  const [pendingEvent, setPendingEvent] = useState(null);
  const [tripsList, setTripsList] = useState([]);

  const userId = currentUser?.id;

  const loadTrips = async () => {
    const trips = await SupabaseTrips.getAll(userId);
    setUpcomingTrip(trips.length > 0 ? trips[0] : null);
    setTripCount(trips.length);
  };

  useEffect(() => {
    if (userId) loadTrips();
    const unsub = navigation.addListener('focus', () => {
      if (userId) loadTrips();
    });
    return unsub;
  }, [userId, navigation]);

  // Consume a booking parsed on the Landing screen (signed-out flow): after
  // sign-up/login this fires once and opens the preference quiz, which then
  // generates the itinerary — fixing the "booking lost after signup" bug.
  useEffect(() => {
    if (incomingBooking && !showQuiz && !loadingItinerary) {
      setPendingBooking(incomingBooking);
      setShowQuiz(true);
      onPendingBookingConsumed?.();
    }
  }, [incomingBooking, showQuiz, loadingItinerary, onPendingBookingConsumed]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTrips();
    setRefreshing(false);
  };

  const handleAction = (action) => {
    if (action === 'upload') {
      setShowUpload(true);
    } else if (action === 'invite') {
      const text = 'Join me on Grillo — AI travel companion!';

      if (typeof navigator !== 'undefined' && navigator.share) {
        navigator.share({ title: 'Grillo Travel', text }).catch(() => {});
      } else if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          if (Platform.OS === 'web') {
            alert('Invite link copied! Share it with your friends.');
          } else {
            Alert.alert('Copied!', 'Share the link with your friends.');
          }
        });
      }
    }
  };

  const handleBookingParsed = (parsed) => {
    setPendingBooking(parsed);
    setShowQuiz(true);
  };

  const handleQuizComplete = async (preferences) => {
    const booking = pendingBooking;
    if (!booking) {
      if (Platform.OS === 'web') alert('No booking data found. Please upload a booking first.');
      setShowQuiz(false);
      return;
    }

    setShowQuiz(false);
    setLoadingItinerary(true);

    // Generate itinerary via DeepSeek
    const bookingType = booking?.type || 'hotel';
    const dest = booking?.destination || 'Your destination';

    // For events (museo/cinema/biglietto singolo) non ha senso un itinerario
    // multi-giorno: usiamo la data dell'evento come unica data di riferimento,
    // così il backend genera un piano da un giorno ruotato attorno all'evento.
    const eventDate = booking?.event?.eventDate || booking?.event?.date || '';
    const flightDate = booking?.flight?.departureDate || booking?.flight?.date || '';
    let checkIn = booking?.checkIn || eventDate || flightDate || '';
    let checkOut = booking?.checkOut || checkIn;

    try {
      const response = await apiCall(API_ENDPOINTS.ITINERARY, {
        method: 'POST',
        body: JSON.stringify({
          destination: dest,
          checkIn,
          checkOut: checkOut || checkIn,
          preferences: preferences || {},
          hotel: booking?.hotel || '',
          type: bookingType,
          year: preferences?.year || new Date().getFullYear(),
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API error: ${response.status}`);
      }
      const itinerary = await response.json();

      // Save to Supabase in background (non-blocking)
      let savedTrip = null;
      try {
        if (userId) {
          savedTrip = await SupabaseTrips.add({
            title: `Trip to ${dest}`,
            destination: dest,
            start_date: checkIn,
            end_date: checkOut,
            booking_data: booking,
            itinerary,
            year: preferences?.year || new Date().getFullYear(),
          }, userId);

          // Mixed upload: attach secondary events (excursions, tickets) to THIS trip
          if (booking?.extraEvents?.length) {
            let merged = null;
            for (const x of booking.extraEvents) {
              const ev = eventBookingFromExtra(booking, x);
              merged = mergeEventIntoItinerary({ ...savedTrip, itinerary: merged || savedTrip.itinerary }, ev);
            }
            if (merged) {
              await SupabaseTrips.update(savedTrip.id, { itinerary: merged });
              console.log(`[events] attached ${booking.extraEvents.length} event(s) to trip ${savedTrip.id}`);
            }
          }
        }
      } catch (dbErr) {
        console.error('Supabase save error:', dbErr);
        // Surface the real error — never fail silently (the user would see a
        // fake "trip created" that disappears on refresh).
        setLoadingItinerary(false);
        setPendingBooking(null);
        setShowCelebration(false);
        setErrorMsg(`❌ Could not save the trip (${dbErr?.message || 'unknown error'}). Please try again.`);
        return;
      }

      setLoadingItinerary(false);
      setPendingBooking(null);

      // Show celebration while we wait for the trip data to load
      setShowCelebration(true);

      // Wait for the trip to actually appear in the database
      let fetchedTrip = null;
      let retries = 0;
      const maxRetries = 15; // up to ~7.5s
      while (retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const trips = await SupabaseTrips.getAll(userId);
        if (trips.length > 0) {
          fetchedTrip = trips[0];
          break;
        }
        retries++;
      }

      setUpcomingTrip(fetchedTrip || null);
      setTripCount(prev => prev + 1);
      setShowCelebration(false);
      await loadTrips();

      // Pianifica le notifiche dinamiche del viaggio (gratis, sul dispositivo)
      if (fetchedTrip) {
        try {
          await scheduleTripNotifications(fetchedTrip);
        } catch (notifErr) {
          console.error('[notifications] schedule on save:', notifErr?.message);
        }
      }

      // Navigate to TripDetail with data
      if (Platform.OS === 'web') {
        if (fetchedTrip) {
          setTimeout(() => {
            navigation.navigate('TripDetail', { tripId: fetchedTrip.id });
          }, 1500);
        } else {
          // Fallback: pass itinerary directly
          navigation.navigate('TripDetail', {
            trip: {
              destination: dest,
              start_date: checkIn,
              end_date: checkOut,
              itinerary,
              booking_data: booking,
            }
          });
        }
      }
    } catch (e) {
      console.error('Itinerary generation error:', e);
      setLoadingItinerary(false);
      setPendingBooking(null);

      const msg = e?.message || 'Unknown error';
      const isAuth = msg.includes('401') || msg.includes('Session expired');
      const errorMsg = isAuth
        ? '🔒 Please sign in to generate itineraries.'
        : `❌ Could not generate itinerary (${msg}). Please try again.`;

      if (Platform.OS === 'web') {
        alert(errorMsg);
        navigation.navigate('Home');
      } else {
        // On mobile, set an error state so the user sees what happened
        setErrorMsg(errorMsg);
      }
    }
  };

  // ─── Event → add to trip / single-day reminder ───
  const createEventReminderTrip = async (booking) => {
    setLoadingItinerary(true);
    try {
      const e = booking?.event || {};
      const name = e.eventName || booking?.hotel || 'Event';
      const dest = booking?.destination && booking.destination !== 'your destination'
        ? booking.destination
        : (e.venue || name);
      const eventDay = buildEventDay(booking);
      const eventDate = e.eventDate || booking?.checkIn || '';
      const saved = await SupabaseTrips.add({
        title: name,
        destination: dest,
        checkIn: eventDate,
        checkOut: eventDate,
        booking_type: 'event',
        booking_data: booking,
        itinerary: { days: [eventDay] },
        year: new Date().getFullYear(),
      }, userId);

      const fetched = await SupabaseTrips.getById(saved.id);
      if (fetched) {
        try { await scheduleTripNotifications(fetched); } catch (notifErr) { console.error('[notifications] event reminder:', notifErr?.message); }
      }
      setLoadingItinerary(false);
      setPendingEvent(null);
      setShowTripPicker(false);
      await loadTrips();
      navigation.navigate('TripDetail', { tripId: saved.id });
    } catch (err) {
      console.error('Event reminder creation error:', err);
      setLoadingItinerary(false);
      setErrorMsg(`❌ Could not save the event (${err?.message || 'unknown'}). Please try again.`);
    }
  };

  const handleAddEventToTrip = async (booking) => {
    if (!userId) {
      setErrorMsg('🔒 Please sign in to save events to your trips.');
      return;
    }
    const trips = await SupabaseTrips.getAll(userId);
    if (trips.length === 0) {
      // Single event, no trip yet → single-day reminder from the event
      await createEventReminderTrip(booking);
    } else {
      setTripsList(trips);
      setPendingEvent(booking);
      setShowTripPicker(true);
    }
  };

  const handleTripPicked = async (trip) => {
    setShowTripPicker(false);
    try {
      const itinerary = mergeEventIntoItinerary(trip, pendingEvent);
      await SupabaseTrips.update(trip.id, { itinerary });
      setPendingEvent(null);
      await loadTrips();
      if (Platform.OS === 'web') alert(`✅ Evento aggiunto a "${trip.title || trip.destination}"`);
      navigation.navigate('TripDetail', { tripId: trip.id });
    } catch (err) {
      console.error('Attach event error:', err);
      setErrorMsg(`❌ Could not add the event (${err?.message || 'unknown'}).`);
    }
  };

  const handleTabNav = (tabName) => {
    navigation.navigate(tabName);
  };

  const userName = currentUser?.name || 'Traveler';
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.gold} />}
    >
      {/* Welcome */}
      <View style={styles.welcomeSection}>
        <Text style={styles.greeting}>{greeting},</Text>
        <Text style={styles.userName}>{userName}</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>✈️</Text>
          <Text style={styles.statNum}>{tripCount}</Text>
          <Text style={styles.statLabel}>Trips</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>📅</Text>
          <Text style={styles.statNum}>
            {upcomingTrip && upcomingTrip.start_date
              ? new Date(upcomingTrip.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
              : '—'}
          </Text>
          <Text style={styles.statLabel}>Next trip</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🏖️</Text>
          <Text style={styles.statNum}>
            {upcomingTrip?.destination?.split(',')[0] || '—'}
          </Text>
          <Text style={styles.statLabel}>Destination</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionLabel}>Quick actions</Text>
      <View style={styles.actionsGrid}>
        {QUICK_ACTIONS.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={styles.actionCard}
            onPress={() => {
              if (item.tab) handleTabNav(item.tab);
              else handleAction(item.action);
            }}
          >
            <Text style={styles.actionIcon}>{item.icon}</Text>
            <Text style={styles.actionLabel}>{item.label}</Text>
            <Text style={styles.actionDesc}>{item.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Upcoming Trip */}
      {upcomingTrip && (
        <TouchableOpacity
          style={styles.upcomingCard}
          onPress={() => navigation.navigate('TripDetail', { tripId: upcomingTrip.id })}
        >
          <LinearGradient
            colors={['rgba(232,168,50,0.15)', 'rgba(232,168,50,0.05)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
            borderRadius={18}
          />
          <Text style={styles.upcomingBadge}>⬤ Upcoming trip</Text>
          <Text style={styles.upcomingDest}>{upcomingTrip.destination || upcomingTrip.title}</Text>
          <Text style={styles.upcomingDate}>
            {upcomingTrip.start_date ? new Date(upcomingTrip.start_date).toLocaleDateString('en-GB', {
              weekday: 'short', day: 'numeric', month: 'long', year: 'numeric'
            }) : 'Plan your trip'}
          </Text>
          <View style={styles.upcomingArrow}>
            <Text style={styles.upcomingArrowText}>View details →</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Smart Tips — from latest trip's AI-generated tips */}
      {upcomingTrip?.itinerary?.tips?.length > 0 && (
        <View style={styles.tipsSection}>
          <Text style={styles.sectionLabel}>💡 Smart tips</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tipsScroll}>
            {upcomingTrip.itinerary.tips.map((tip, i) => (
              <View key={i} style={styles.tipCard}>
                <Text style={styles.tipIcon}>{tip.icon || '💡'}</Text>
                <Text style={styles.tipTitle}>{tip.title}</Text>
                <Text style={styles.tipDesc}>{tip.desc}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Empty state */}
      {!upcomingTrip && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🦗</Text>
          <Text style={styles.emptyTitle}>No trips yet</Text>
          <Text style={styles.emptySub}>
            Upload your first booking and let Grillo{"\n"}create your perfect itinerary!
          </Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowUpload(true)}>
            <Text style={styles.emptyBtnText}>📸 Upload your booking</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 32 }} />
      </ScrollView>

      {/* Upload Booking Modal */}
      <Modal visible={showUpload} animationType="slide" onRequestClose={() => setShowUpload(false)}>
        <UploadBookingScreen onClose={() => setShowUpload(false)} onBookingParsed={handleBookingParsed} onAddEventToTrip={handleAddEventToTrip} />
      </Modal>

      {/* Event → Trip Picker Modal */}
      <Modal visible={showTripPicker} transparent animationType="fade" onRequestClose={() => setShowTripPicker(false)}>
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>➕ Dove lo aggiungo?</Text>
            <Text style={styles.pickerSub}>
              {pendingEvent?.event?.eventName || pendingEvent?.hotel || 'Event'} — scegli una trip
            </Text>
            <ScrollView style={{ maxHeight: 280 }}>
              <TouchableOpacity style={styles.pickerItem} onPress={() => createEventReminderTrip(pendingEvent)}>
                <Text style={styles.pickerItemTitle}>🆕 Crea una trip da questo evento</Text>
                <Text style={styles.pickerItemSub}>Giorno singolo, come promemoria</Text>
              </TouchableOpacity>
              {tripsList.map(t => (
                <TouchableOpacity key={t.id} style={styles.pickerItem} onPress={() => handleTripPicked(t)}>
                  <Text style={styles.pickerItemTitle}>{t.title || t.destination}</Text>
                  <Text style={styles.pickerItemSub}>{t.destination} · {t.start_date || ''} → {t.end_date || ''}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.pickerCancel} onPress={() => setShowTripPicker(false)}>
              <Text style={styles.pickerCancelText}>Annulla</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Preference Quiz Modal */}
      <Modal visible={showQuiz} animationType="slide" onRequestClose={() => setShowQuiz(false)}>
        <PreferenceQuiz onSubmit={handleQuizComplete} onSkip={() => handleQuizComplete({})} />
      </Modal>

      {/* Loading overlay - Grillo's workshop (Modal ensures it renders above all other layers) */}
      {loadingItinerary && (
        <Modal visible={loadingItinerary} animationType="none" transparent>
          <GrilloWorkshop booking={pendingBooking} />
        </Modal>
      )}

      {/* Error banner */}
      {!!errorMsg && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errorMsg}</Text>
          <TouchableOpacity onPress={() => setErrorMsg('')} style={styles.errorBannerClose}>
            <Text style={styles.errorBannerCloseText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Celebration overlay — "The Dream Trip Is Ready" */}
      {showCelebration && <CelebrationOverlay />}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: '#0a0a0a',
  },

  // Welcome
  welcomeSection: { marginBottom: 20 },
  greeting: { fontSize: 16, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  userName: { fontSize: 28, fontWeight: '800', color: '#fff', marginTop: 2 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  statCard: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16, padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statNum: { fontSize: 15, fontWeight: '800', color: Colors.gold },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 2, fontWeight: '500' },

  // Section
  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12,
  },

  // Quick actions
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  actionCard: {
    width: '48%', backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  actionIcon: { fontSize: 24, marginBottom: 8 },
  actionLabel: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 2 },
  actionDesc: { fontSize: 11, color: 'rgba(255,255,255,0.45)' },

  // Upcoming
  upcomingCard: {
    borderRadius: 18, padding: 20, marginBottom: 16,
    backgroundColor: 'rgba(232,168,50,0.04)',
    borderWidth: 1, borderColor: 'rgba(232,168,50,0.15)',
    overflow: 'hidden',
  },
  upcomingBadge: { fontSize: 11, fontWeight: '700', color: Colors.gold, marginBottom: 8, letterSpacing: 1 },
  upcomingDest: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 4 },
  upcomingDate: { fontSize: 13, color: 'rgba(255,255,255,0.55)', marginBottom: 12 },
  upcomingArrow: { flexDirection: 'row', alignItems: 'center' },
  upcomingArrowText: { fontSize: 13, fontWeight: '600', color: Colors.gold },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 32, marginBottom: 16 },
  emptyIcon: { fontSize: 48, marginBottom: 12, opacity: 0.6 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 6 },
  emptySub: { fontSize: 13, color: 'rgba(255,255,255,0.45)', textAlign: 'center', lineHeight: 18, marginBottom: 20 },
  emptyBtn: {
    backgroundColor: Colors.gold, borderRadius: 20, paddingVertical: 14, paddingHorizontal: 24,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: Colors.brown },

  // GrilloWorkshop
  woOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center', alignItems: 'center',
    zIndex: 1000,
  },
  woCard: {
    backgroundColor: '#1a1a1a', borderRadius: 28, padding: 36, paddingTop: 32,
    alignItems: 'center', width: '85%', maxWidth: 340,
    borderWidth: 1, borderColor: 'rgba(232,168,50,0.15)',
  },
  woIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(232,168,50,0.1)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(232,168,50,0.2)',
  },
  woIcon: { fontSize: 36 },
  woPhaseIcon: { fontSize: 28, marginBottom: 8 },
  woText: { fontSize: 17, fontWeight: '700', color: '#fff', marginBottom: 4, textAlign: 'center' },
  woSub: { fontSize: 12, color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginBottom: 20 },
  woProgressBar: {
    width: '100%', height: 3, borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 16,
  },
  woProgressFill: { height: '100%', borderRadius: 1.5, backgroundColor: 'rgba(232,168,50,0.6)' },
  woThought: { fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center', fontStyle: 'italic', marginBottom: 16, lineHeight: 17, paddingHorizontal: 8 },
  woHint: { fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center' },

  // Error banner
  errorBanner: {
    backgroundColor: '#cc3333',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorBannerText: { fontSize: 13, color: '#fff', flex: 1 },
  errorBannerClose: { paddingHorizontal: 8 },
  errorBannerCloseText: { fontSize: 16, color: '#fff', fontWeight: '700' },

  // Smart Tips
  tipsSection: { marginBottom: 20 },
  tipsScroll: { paddingBottom: 4 },
  tipCard: {
    width: 220, backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16, padding: 16, marginRight: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  tipIcon: { fontSize: 24, marginBottom: 8 },
  tipTitle: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 4 },
  tipDesc: { fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 16 },

  // Celebration
  celebOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center', alignItems: 'center',
    zIndex: 2000,
  },
  celebCard: {
    backgroundColor: '#1a1a1a', borderRadius: 28, padding: 40, paddingTop: 36,
    alignItems: 'center', width: '85%', maxWidth: 340,
    borderWidth: 1, borderColor: 'rgba(232,168,50,0.2)',
  },
  celebIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(232,168,50,0.2)',
  },
  celebIcon: { fontSize: 48 },
  celebTitle: { fontSize: 22, fontWeight: '800', color: Colors.gold, textAlign: 'center', marginBottom: 6 },
  celebSub: { fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: 20 },
  celebDots: { flexDirection: 'row', gap: 8 },
  celebDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.gold,
  },

  // Event trip picker
  pickerOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  pickerCard: {
    backgroundColor: '#141414', borderRadius: 20, padding: 20,
    width: '100%', maxWidth: 400,
    borderWidth: 1, borderColor: 'rgba(232,168,50,0.25)',
  },
  pickerTitle: { fontSize: 17, fontWeight: '800', color: Colors.gold, textAlign: 'center', marginBottom: 4 },
  pickerSub: { fontSize: 12, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: 16, lineHeight: 17 },
  pickerItem: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  pickerItemTitle: { fontSize: 14, fontWeight: '700', color: '#fff' },
  pickerItemSub: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  pickerCancel: {
    marginTop: 12, paddingVertical: 12, borderRadius: 12, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  pickerCancelText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
});
