import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// ─────────────────────────────────────────────────────────────────────────────
// Grillo — Notifiche dinamiche
//
// Livello "locale": la pianificazione avviene SUL DISPOSITIVO dell'utente,
// in base ai dati reali dei suoi viaggi in Supabase (dates + itinerary).
// Nessun server coinvolto: gratis, istantaneo, funziona offline.
//
// SDK 57 — API verificata sui tipi installati:
//   trigger date → { type: 'date', date: Date|number, channelId? }
//   requestPermissionsAsync({ ios: { allowAlert, allowBadge, allowSound } })
//   cancelScheduledNotificationAsync(id) / getAllScheduledNotificationsAsync()
//   setNotificationChannelAsync(channelId, config)  (Android)
//
// Nota: expo-notifications NON è supportato (o è molto limitato) sul web.
// Qui ogni funzione degrades in un no-op sicuro quando non supportata,
// così l'app non crasha mai e il resto del flusso web resta intatto.
// ─────────────────────────────────────────────────────────────────────────────

// Comportamento notifiche in primo piano (app aperta): le mostriamo come
// banner, mai suono a raffica se non richiesto.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const SCHEDULED_MARKER = 'grillo_trip_';

function isSupported() {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

// Crea il canale Android di default (richiesto su Android 8+).
export async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('grillo', {
      name: 'I tuoi viaggi',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#e8a832',
    });
  } catch (e) {
    console.warn('[notifications] channel setup:', e?.message);
  }
}

/**
 * Chiede il permesso all'utente. Ritorna true se possiamo spingere notifiche.
 */
export async function requestPermission() {
  if (!isSupported()) return false;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (status !== 'granted') {
      const held = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
      });
      status = held.status;
    }
    await ensureAndroidChannel();
    return status === 'granted';
  } catch (e) {
    console.warn('[notifications] permission:', e?.message);
    return false;
  }
}

/**
 * Pianifica TUTTE le notifiche dinamiche per un singolo viaggio, calcolate
 * dalle date reali del trip. Ritorna gli ID pianificati.
 *
 * Ritorna [] se non supportato (web) o se le date non consentono promemoria.
 */
export async function scheduleTripNotifications(trip) {
  if (!isSupported() || typeof Notifications.scheduleNotificationAsync !== 'function') {
    return [];
  }

  const start = parseDate(trip.start_date || trip.checkIn);
  const end = parseDate(trip.end_date || trip.checkOut || trip.start_date || trip.checkIn);
  if (!start || !end || end < start) return [];

  const dest = trip.destination || 'il tuo viaggio';
  const tripId = trip.id || trip.tripId;

  const schedule = (triggerDate, title, body) => {
    if (!triggerDate || triggerDate.getTime() <= Date.now()) return null;
    return Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: { type: 'date', date: triggerDate, channelId: 'grillo' },
    }).then((id) => `${SCHEDULED_MARKER}${tripId}:${id}`).catch((e) => {
      console.warn('[notifications] schedule:', e?.message);
      return null;
    });
  };

  const plans = [];

  // 1) Il giorno prima della partenza → 18:00
  const tMinus1 = addDays(start, -1);
  tMinus1.setHours(18, 0, 0, 0);
  plans.push(schedule(tMinus1, '✈️ Domani si parte!',
    `Tra meno di 24 ore sei a ${dest}. Valigia pronta?`));

  // 2) Giorno del check-in → 08:00
  const checkIn = new Date(start);
  checkIn.setHours(8, 0, 0, 0);
  plans.push(schedule(checkIn, '🏨 Check-in di oggi',
    `Benvenuto a ${dest}! Dovresti fare il check-in oggi.`));

  // 3) Ogni giorno di viaggio → 09:00 (itinerario del giorno se presente)
  const itineraryDays = Array.isArray(trip.itinerary?.days) ? trip.itinerary.days : null;
  const nights = Math.max(0, Math.round((end - start) / 86400000));
  const daysInTrip = nights + 1;
  for (let i = 0; i < daysInTrip; i++) {
    const d = addDays(start, i);
    d.setHours(9, 0, 0, 0);
    if (d.getTime() <= Date.now()) continue; // skip giorni passati
    const dayPlan = itineraryDays?.[i];
    const label = dayPlan?.label || (i === 0 ? 'Giorno 1' : `Giorno ${i + 1}`);
    const title = `📅 ${label} a ${dest}`;
    const activities = dayPlan?.activities?.length
      ? dayPlan.activities.slice(0, 2).map((a) => a.title).join(' · ')
      : 'Ecco la giornata che ti aspetta.';
    plans.push(schedule(d, title, activities));
  }

  // 4) Giorno del check-out → 09:00
  const checkOut = new Date(end);
  checkOut.setHours(9, 0, 0, 0);
  plans.push(schedule(checkOut, '🧳 Ultimo giorno',
    `Oggi si riparte da ${dest}. Fai in tempo a goderti l'ultima colazione.`));

  const ids = (await Promise.all(plans)).filter(Boolean);
  return ids;
}

/**
 * Disdice tutte le notifiche pianificate appartenenti a un viaggio.
 */
export async function cancelTripNotifications(tripId) {
  if (!isSupported()) return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (n.identifier && n.identifier.startsWith(`${SCHEDULED_MARKER}${tripId}:`)) {
        Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {});
      }
    }
  } catch (e) {
    console.warn('[notifications] cancel:', e?.message);
  }
}

// Ritorna il numero di notifiche pianificate per debug / UI.
export async function countScheduled() {
  if (!isSupported()) return 0;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return scheduled.filter((n) => n.identifier?.startsWith(SCHEDULED_MARKER)).length;
  } catch {
    return 0;
  }
}

export async function cancelAll() {
  if (!isSupported()) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    console.warn('[notifications] cancelAll:', e?.message);
  }
}

// ─── Helpers date ──────────────────────────────────────────────────────────
function parseDate(str) {
  if (!str) return null;
  const d = new Date(str);
  if (!isNaN(d)) return d;
  // "Aug 22" / "Sep 25" senza anno → anno corrente
  const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
                   Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  const parts = String(str).trim().split(/\s+/);
  if (parts.length >= 2 && months[parts[0]] !== undefined) {
    const y = parts.length >= 3 ? parseInt(parts[2]) : new Date().getFullYear();
    return new Date(y, months[parts[0]], parseInt(parts[1]));
  }
  return null;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
