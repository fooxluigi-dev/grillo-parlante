import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Image, Platform, SafeAreaView, Animated, TextInput
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { ParsedBooking, BookingType } from '../types';

// API base URL comes from EXPO_PUBLIC_API_URL env var (set in .env.local)
const API_BASE = process.env.EXPO_PUBLIC_API_URL;

if (!API_BASE) {
  console.warn('[UploadBookingScreen] EXPO_PUBLIC_API_URL not set — API calls will fail');
}

const API = API_BASE ? `${API_BASE}/api/parse-booking` : 'https://grillo-parlante-api.vercel.app/api/parse-booking';

const MAX_IMAGES = 3;

interface ManualBookingState {
  destination: string;
  checkIn: string;
  checkOut: string;
  hotel: string;
  type: BookingType;
  eventName: string;
  flightRoute: string;
}

interface UploadBookingScreenProps {
  onClose: () => void;
  onBookingParsed: (booking: ParsedBooking) => void;
}

export default function UploadBookingScreen({ onClose, onBookingParsed }: UploadBookingScreenProps) {
  const [images, setImages] = useState<string[]>([]);        // base64 data URLs (max 3)
  const [parsing, setParsing] = useState<boolean>(false);
  const [phase, setPhase] = useState<number>(0);            // 0=pick 1=parsing 2=result
  const [step, setStep] = useState<number>(-1);
  const [parsed, setParsed] = useState<ParsedBooking | null>(null);
  const [error, setError] = useState<string>('');
  const [manualOpen, setManualOpen] = useState<boolean>(false);
  const [manual, setManual] = useState<ManualBookingState>({ 
    destination: '', checkIn: '', checkOut: '', hotel: '', type: 'hotel', eventName: '', flightRoute: '' 
  });
  const [textIdx, setTextIdx] = useState<number>(-1);

  // Animations
  const contentOp = useRef(new Animated.Value(0)).current;
  const parseOp = useRef(new Animated.Value(0)).current;
  const parseScale = useRef(new Animated.Value(0.9)).current;
  const resultOp = useRef(new Animated.Value(0)).current;
  const resultSlide = useRef(new Animated.Value(30)).current;
  const textBlend = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  // Hidden <input type=file> mounted in the DOM (reliable on iOS Safari —
  // createElement+click() without DOM attachment often fails or hangs).
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    Animated.timing(contentOp, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    // Infinite spinner rotation
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 1200, useNativeDriver: true })
    ).start();
  }, []);

  // ─── Pick image (web + native) ───
  const resizeImage = (base64: string, maxW = 1600): Promise<string> => new Promise(resolve => {
    if (Platform.OS !== 'web') {
      resolve(base64);
      return;
    }
    // Use HTMLImageElement for web
    const img = new (globalThis as any).Image();
    img.onload = () => {
      let {width, height} = img;
      if (width > maxW) { height = height * maxW / width; width = maxW; }
      const c = document.createElement('canvas');
      c.width = width; c.height = height;
      c.getContext('2d')!.drawImage(img, 0, 0, width, height);
      resolve(c.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => resolve(base64);
    img.src = base64;
  });

  const readFileAsDataUrl = (file: File): Promise<string> => new Promise((r) => {
    const reader = new FileReader();
    reader.onload = () => r(reader.result as string);
    reader.readAsDataURL(file);
  });

  // Keep payloads small enough for Vercel's 4.5MB body limit: with up to 3
  // screenshots, cap each web image at ~1.4MB (resize/compress via canvas).
  const maybeResize = async (dataUrl: string, budget = 1.4 * 1024 * 1024): Promise<string> => {
    if (Platform.OS !== 'web') return dataUrl;
    if (dataUrl.length <= budget) return dataUrl;
    try {
      return await resizeImage(dataUrl, 1600);
    } catch (e) {
      console.log('Resize failed, sending original:', (e as Error)?.message);
      return dataUrl;
    }
  };

  // Web: user picked file(s) through the hidden input
  const handleFilesChosen = async (files: File[]) => {
    if (!files.length) return;
    const selected = files.slice(0, MAX_IMAGES);
    if (files.length > MAX_IMAGES) {
      console.warn(`Selected ${files.length} files — keeping the first ${MAX_IMAGES}`);
    }

    // Enter the loading screen IMMEDIATELY — before reading the files —
    // so the user always sees feedback right after picking.
    setParsing(true);
    setPhase(1);
    setStep(0);
    setError('');
    setTextIdx(-1);

    Animated.parallel([
      Animated.timing(parseOp, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(parseScale, { toValue: 1, tension: 40, friction: 10, useNativeDriver: true }),
    ]).start();

    try {
      const urls: string[] = [];
      for (const file of selected) {
        const dataUrl = await readFileAsDataUrl(file);
        urls.push(await maybeResize(dataUrl));
      }
      setImages(urls);
      await parseImages(urls);
    } catch (e) {
      console.error('File read error:', e);
      setError('Could not read those files. Try PNG or JPEG screenshots.');
      setParsing(false);
      setPhase(0);
    }
  };

  const pick = async () => {
    if (Platform.OS === 'web') {
      // Click the hidden input that lives in the DOM — reliable on iOS Safari.
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
        fileInputRef.current.click();
      } else {
        // Fallback: create+append+click (better than bare createElement)
        const el = document.createElement('input');
        el.type = 'file';
        el.accept = 'image/*';
        el.multiple = true;
        el.style.position = 'fixed';
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
        document.body.appendChild(el);
        el.onchange = (e) => {
          const files = Array.from((e.target as HTMLInputElement).files || []);
          document.body.removeChild(el);
          if (files.length) handleFilesChosen(files);
        };
        el.click();
      }
    } else {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.4,
        base64: true,
        allowsMultipleSelection: true,
        selectionLimit: MAX_IMAGES,
        orderedSelection: true,
      });
      if (result.canceled || !result.assets?.length) return;
      const urls = result.assets.slice(0, MAX_IMAGES).map(a => `data:image/jpeg;base64,${a.base64}`);
      setParsing(true);
      setPhase(1);
      setStep(0);
      setError('');
      setTextIdx(-1);
      setImages(urls);
      parseImages(urls);
    }
  };

  // ─── Parse: send images → API (server handles OCR + parsing) ───
  const parseImages = async (dataUrls: string[]) => {
    setParsing(true);
    setPhase(1);
    setStep(0);
    setError('');
    setTextIdx(-1);

    // Step animation (runs in background)
    const steps = ['📸 Loading...', '🔍 Scanning...', '📝 Reading...', '🧠 Parsing...', '📍 Found!', '✅ Done!'];
    const timers = steps.map((_, i) => setTimeout(() => setStep(i), i * 1500 + 400));

    let result: ParsedBooking | null = null;
    try {
      // Send image directly to API — server handles OCR (GPT-4o → OCR.space) + DeepSeek parsing
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 75000); // safety net — never spin forever

      let resp: Response;
      try {
        resp = await fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ images: dataUrls }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      if (resp.ok) {
        const j = await resp.json();
        if (j?.destination && j.destination !== 'Unknown') {
          result = { ...j, _isFallback: false } as ParsedBooking;
        } else {
          console.warn('API response without destination:', JSON.stringify(j).slice(0, 300));
        }
      } else {
        console.warn('API HTTP', resp.status);
        setError(resp.status === 413
          ? 'Image too large for the server. Try a smaller screenshot.'
          : `Server error (${resp.status}). Try again?`);
      }
    } catch (e: any) {
      console.error('API error:', e);
      if (e?.name === 'AbortError') {
        setError('The server took too long. Check your connection and try again.');
      } else {
        setError('Could not reach the server. Try again?');
      }
    }

    timers.forEach(clearTimeout);

    // Fallback
    if (!result) {
      result = {
        type: 'hotel',
        destination: 'your destination',
        checkIn: '—', checkOut: '—', hotel: '—', confirmation: '—',
        guests: null, guestNames: null, notes: null,
        flight: {
          flightNumber: null, airline: null, departureAirport: null,
          arrivalAirport: null, departureTime: null, arrivalTime: null,
          departureDate: null, arrivalDate: null, terminal: null, gate: null,
        },
        event: {
          eventName: null, eventDate: null, eventTime: null,
          venue: null, ticketType: null, ticketCount: null,
        },
        _isFallback: true,
      } as ParsedBooking;
    }

    setParsed(result);
    setParsing(false);

    // Transition: parsing → result
    Animated.timing(parseOp, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    Animated.timing(resultOp, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    setPhase(2);

    // Cinematic texts
    const texts = buildTexts(result);
    setTextIdx(0);
    textBlend.setValue(1);
    for (let i = 1; i < texts.length; i++) {
      setTimeout(() => {
        setTextIdx(i);
        textBlend.setValue(0);
        Animated.timing(textBlend, { toValue: 1, duration: 600, useNativeDriver: true }).start();
      }, i * 3000);
    }
    setTimeout(() => {
      Animated.timing(resultSlide, { toValue: 0, duration: 400, useNativeDriver: true }).start();
    }, texts.length * 3000 + 500);
  };

  // ─── Build cinematic text lines ───
  const buildTexts = (d: ParsedBooking): string[] => {
    const t: string[] = [];
    if (d?._isFallback) {
      t.push("👀 Let me look at your booking...");
      t.push("Reading the details...");
      t.push("Almost there! Processing the info...");
      t.push("I'll create the perfect itinerary... 🦗");
      return t;
    }
    const type = d.type || 'hotel';
    if (d.destination && d.destination !== 'your destination')
      t.push(`I can see you're heading to ${d.destination}! ${type === 'event' ? '🎟️' : '🏖️'}`);
    if (type === 'flight') {
      const f = d.flight || {};
      if (f.flightNumber) t.push(`Flight ${f.flightNumber} — ${f.airline || ''} ✈️`);
      if (f.departureAirport && f.arrivalAirport)
        t.push(`${f.departureAirport} → ${f.arrivalAirport} ${f.departureTime || ''} 📍`);
      if (f.gate) t.push(`Gate ${f.gate} — boarding soon! 🛫`);
    } else if (type === 'event') {
      const e = d.event || {};
      if (e.eventName) t.push(`${e.eventName} — incredible! 🎭`);
      if (e.eventDate) t.push(`Mark your calendar: ${e.eventDate} ${e.eventTime || ''} 📅`);
      if (e.venue) t.push(`At ${e.venue} 📍`);
      if (e.ticketCount) t.push(`${e.ticketCount} ticket${Number(e.ticketCount) > 1 ? 's' : ''} for you! 🎟️`);
    } else {
      if (d.hotel && d.hotel !== '—')
        t.push(`You'll be at ${d.hotel} — lovely! 🏠`);
      if (d.checkIn && d.checkIn !== '—')
        t.push(`Check-in ${d.checkIn} 📅`);
      if (d.checkOut && d.checkOut !== '—')
        t.push(`Check-out ${d.checkOut} 🌴`);
      const guestCount = typeof d.guests === 'number' ? d.guests : parseInt(String(d.guests || '0'), 10);
      if (guestCount > 0)
        t.push(`${guestCount} — great crew! 👥`);
    }
    if (d.confirmation && d.confirmation !== '—')
      t.push(`Ref ${d.confirmation} ✅`);
    t.push('Let me put together something special for you... ✨');
    t.push("I'll create the perfect itinerary, just give me a moment... 🦗");
    return t.filter(Boolean);
  };

  const confirmBooking = () => {
    if (parsed) onBookingParsed(parsed);
  };

  // Open the editable form pre-filled from the parsed (or fallback) booking
  const openManual = () => {
    if (!parsed) return;
    const type: BookingType = parsed.type || 'hotel';
    const f = (parsed.flight || {}) as any;
    const e = (parsed.event || {}) as any;
    const clean = (v: any) => (v && v !== '—' && v !== 'your destination' ? v : '');
    setManual({
      destination: clean(parsed.destination),
      checkIn: clean(parsed.checkIn) || clean(f.departureDate) || clean(e.eventDate),
      checkOut: clean(parsed.checkOut),
      hotel: clean(f.flightNumber) || clean(parsed.hotel),
      type,
      eventName: clean(e.eventName) || clean(parsed.hotel),
      flightRoute: [f.departureAirport, f.arrivalAirport].filter(Boolean).join(' → '),
    });
    setManualOpen(true);
  };

  const applyManual = () => {
    const type = manual.type || 'hotel';
    const base: ParsedBooking = {
      ...parsed,
      type,
      destination: manual.destination,
      checkIn: manual.checkIn,
      checkOut: manual.checkOut || (type === 'event' ? manual.checkIn : ''),
      hotel: manual.hotel,
      _isManual: true,
    } as ParsedBooking;
    
    if (type === 'flight') {
      base.flight = { flightNumber: manual.hotel, departureDate: manual.checkIn } as any;
      if (manual.flightRoute) {
        const parts = manual.flightRoute.split('→');
        base.flight.departureAirport = (parts[0] || '').trim();
        base.flight.arrivalAirport = (parts[1] || '').trim();
      }
    }
    if (type === 'event') {
      base.event = { eventName: manual.eventName || manual.hotel, eventDate: manual.checkIn, venue: manual.hotel } as any;
    }
    setParsed(base);
    setManualOpen(false);
  };

  // ─── Render ───

  return (
    <View style={styles.root}>
      {/* Hidden file input — lives in the DOM so iOS Safari reliably opens the picker */}
      {Platform.OS === 'web' && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            const files = Array.from((e.target as HTMLInputElement).files || []);
            if (files.length) handleFilesChosen(files);
          }}
        />
      )}
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}><Text style={styles.headerBtn}>← Back</Text></TouchableOpacity>
          <Text style={styles.headerTitle}>Grillo</Text>
          <View style={{ width: 60 }} />
        </View>

        {phase === 0 && (
          <Animated.View style={[styles.pickArea, { opacity: contentOp }]}>
            <Text style={styles.pickTitle}>Upload your booking screenshots</Text>
            <Text style={styles.pickSub}>I'll read the details and create a custom itinerary — up to 3 screenshots</Text>
            <TouchableOpacity style={styles.pickBtn} onPress={pick}>
              <Text style={styles.pickBtnText}>📸 Choose screenshots</Text>
            </TouchableOpacity>
            {images.length > 0 && (
              <View style={styles.previewRow}>
                {images.map((u, i) => (
                  <Image key={i} source={{ uri: u }} style={styles.previewThumb} resizeMode="cover" />
                ))}
              </View>
            )}
          </Animated.View>
        )}

        {phase === 1 && (
          <Animated.View style={[styles.parseCard, { opacity: parseOp, transform: [{ scale: parseScale }] }]}>
            <View style={styles.spinnerWrap}>
              <Animated.View style={[styles.spinner, { transform: [{ rotate: spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]}>
                <Text style={styles.spinnerEmoji}>🦗</Text>
              </Animated.View>
            </View>
            <Text style={styles.parseTitle}>Reading your booking...</Text>
            <View style={styles.parseSteps}>
              {['📸 Loading...', '🔍 Scanning...', '📝 Reading...', '🧠 Parsing...', '📍 Found!', '✅ Done!'].map((s, i) => (
                <Animated.Text key={i} style={[styles.parseStepText, {
                  opacity: step >= i ? 1 : 0.2,
                  transform: [{ translateX: step >= i ? 0 : -10 }],
                }]}>
                  {step >= i ? '✓ ' : '○ '}{s}
                </Animated.Text>
              ))}
            </View>
            <Text style={styles.parseHint}>
              {step >= 3 ? 'Almost there — building your trip...' : 'This can take a few seconds. Hang tight!'}
            </Text>
            {error ? <Text style={styles.parseError}>{error}</Text> : null}
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.cancelBtnText}>✕ Cancel</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {phase === 2 && parsed && (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Cinematic texts */}
            <Animated.View style={[styles.textsContainer, { opacity: resultOp }]}>
              {textIdx >= 0 && (
                <Animated.Text key={textIdx} style={[styles.cinematicText, { opacity: textBlend }]}>
                  {buildTexts(parsed)[textIdx] || ''}
                </Animated.Text>
              )}
            </Animated.View>

            {/* Result card */}
            <Animated.View style={[styles.resultCard, { opacity: resultOp, transform: [{ translateY: resultSlide }] }]}>
              <Text style={styles.resultBadge}>
                {parsed._isFallback ? '⚠️ Could not read screenshot' : '✅ Booking detected'}
              </Text>

              {!manualOpen && (
                <TouchableOpacity style={styles.manualBtn} onPress={openManual}>
                  <Text style={styles.manualBtnText}>
                    {parsed._isFallback ? '✏️ Enter details manually' : '✏️ Edit extracted details'}
                  </Text>
                </TouchableOpacity>
              )}

              {manualOpen ? (
                <View style={styles.manualForm}>
                  <Text style={styles.manualTitle}>Enter your booking</Text>
                  <View style={styles.typeRow}>
                    {(['hotel','flight','event'] as BookingType[]).map(t => (
                      <TouchableOpacity key={t} style={[styles.typeChip, manual.type === t && styles.typeChipActive]}
                        onPress={() => setManual(m => ({...m, type: t}))}>
                        <Text style={[styles.typeChipText, manual.type === t && styles.typeChipTextActive]}>
                          {t === 'hotel' ? '🏨 Hotel' : t === 'flight' ? '✈️ Flight' : '🎟️ Event'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput style={styles.input} placeholder="Destination" placeholderTextColor="rgba(255,255,255,0.3)"
                    value={manual.destination} onChangeText={t => setManual(m => ({...m, destination: t}))} />
                  {manual.type === 'hotel' && (
                    <>
                      <TextInput style={styles.input} placeholder="Check-in date" placeholderTextColor="rgba(255,255,255,0.3)"
                        value={manual.checkIn} onChangeText={t => setManual(m => ({...m, checkIn: t}))} />
                      <TextInput style={styles.input} placeholder="Check-out date" placeholderTextColor="rgba(255,255,255,0.3)"
                        value={manual.checkOut} onChangeText={t => setManual(m => ({...m, checkOut: t}))} />
                      <TextInput style={styles.input} placeholder="Hotel name" placeholderTextColor="rgba(255,255,255,0.3)"
                        value={manual.hotel} onChangeText={t => setManual(m => ({...m, hotel: t}))} />
                    </>
                  )}
                  {manual.type === 'flight' && (
                    <>
                      <TextInput style={styles.input} placeholder="Flight (es. Ryanair FR2345)" placeholderTextColor="rgba(255,255,255,0.3)"
                        value={manual.hotel} onChangeText={t => setManual(m => ({...m, hotel: t}))} />
                      <TextInput style={styles.input} placeholder="Date (es. Aug 22)" placeholderTextColor="rgba(255,255,255,0.3)"
                        value={manual.checkIn} onChangeText={t => setManual(m => ({...m, checkIn: t}))} />
                      <TextInput style={styles.input} placeholder="Departure airport → Arrival (es. BGY → CRL)" placeholderTextColor="rgba(255,255,255,0.3)"
                        value={manual.flightRoute || ''} onChangeText={t => setManual(m => ({...m, flightRoute: t}))} />
                    </>
                  )}
                  {manual.type === 'event' && (
                    <>
                      <TextInput style={styles.input} placeholder="Event name (es. Sagrada Familia)" placeholderTextColor="rgba(255,255,255,0.3)"
                        value={manual.eventName || ''} onChangeText={t => setManual(m => ({...m, eventName: t}))} />
                      <TextInput style={styles.input} placeholder="Date (es. Aug 24)" placeholderTextColor="rgba(255,255,255,0.3)"
                        value={manual.checkIn} onChangeText={t => setManual(m => ({...m, checkIn: t}))} />
                      <TextInput style={styles.input} placeholder="Venue" placeholderTextColor="rgba(255,255,255,0.3)"
                        value={manual.hotel} onChangeText={t => setManual(m => ({...m, hotel: t}))} />
                    </>
                  )}
                  <TouchableOpacity style={styles.confirmBtn} onPress={applyManual}>
                    <Text style={styles.confirmText}>✅ Confirm</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={styles.row}><Text style={styles.label}>📍 Destination</Text><Text style={styles.value}>{parsed.destination}</Text></View>
                  <View style={styles.divider} />
                  {parsed.type === 'flight' ? (
                    <>
                      {parsed.hotel ? <><View style={styles.row}><Text style={styles.label}>✈️ Flight</Text><Text style={styles.value}>{parsed.hotel}</Text></View><View style={styles.divider} /></> : null}
                      <View style={styles.row}><Text style={styles.label}>🛫 Route</Text><Text style={styles.value}>{(parsed.flight?.departureAirport||'?')} → {(parsed.flight?.arrivalAirport||'?')}</Text></View>
                      <View style={styles.divider} />
                      <View style={styles.row}><Text style={styles.label}>🕐 Departure</Text><Text style={styles.value}>{parsed.flight?.departureDate || parsed.checkIn} {parsed.flight?.departureTime || ''}</Text></View>
                      <View style={styles.divider} />
                      {parsed.flight?.arrivalTime ? <><View style={styles.row}><Text style={styles.label}>🕐 Arrival</Text><Text style={styles.value}>{parsed.flight?.arrivalDate || ''} {parsed.flight?.arrivalTime}</Text></View><View style={styles.divider} /></> : null}
                      {parsed.flight?.terminal ? <><View style={styles.row}><Text style={styles.label}>🏢 Terminal</Text><Text style={styles.value}>{parsed.flight.terminal}</Text></View><View style={styles.divider} /></> : null}
                      {parsed.flight?.gate ? <><View style={styles.row}><Text style={styles.label}>🚪 Gate</Text><Text style={styles.value}>{parsed.flight.gate}</Text></View><View style={styles.divider} /></> : null}
                    </>
                  ) : parsed.type === 'event' ? (
                    <>
                      {parsed.event?.eventName ? <><View style={styles.row}><Text style={styles.label}>🎭 Event</Text><Text style={styles.value}>{parsed.event.eventName}</Text></View><View style={styles.divider} /></> : null}
                      {parsed.event?.eventDate ? <><View style={styles.row}><Text style={styles.label}>📅 Date</Text><Text style={styles.value}>{parsed.event.eventDate} {parsed.event.eventTime || ''}</Text></View><View style={styles.divider} /></> : null}
                      {parsed.event?.venue ? <><View style={styles.row}><Text style={styles.label}>📍 Venue</Text><Text style={styles.value}>{parsed.event.venue}</Text></View><View style={styles.divider} /></> : null}
                      {parsed.event?.ticketType ? <><View style={styles.row}><Text style={styles.label}>🎟️ Ticket</Text><Text style={styles.value}>{parsed.event.ticketType} {parsed.event.ticketCount ? `×${parsed.event.ticketCount}` : ''}</Text></View><View style={styles.divider} /></> : null}
                    </>
                  ) : (
                    <>
                      <View style={styles.row}><Text style={styles.label}>📅 Check-in</Text><Text style={styles.value}>{parsed.checkIn}</Text></View>
                      <View style={styles.divider} />
                      <View style={styles.row}><Text style={styles.label}>📅 Check-out</Text><Text style={styles.value}>{parsed.checkOut}</Text></View>
                      <View style={styles.divider} />
                      <View style={styles.row}><Text style={styles.label}>🏨 Accommodation</Text><Text style={styles.value}>{parsed.hotel}</Text></View>
                    </>
                  )}
                  <View style={styles.divider} />
                  <View style={styles.row}><Text style={styles.label}>👥 Guests</Text><Text style={styles.value}>{parsed.guests || (parsed.guestNames?.length || '—')}</Text></View>
                  <View style={styles.divider} />
                  <View style={styles.row}><Text style={styles.label}>🔑 Confirmation</Text><Text style={styles.value}>{parsed.confirmation || '—'}</Text></View>

                  <TouchableOpacity style={styles.confirmBtn} onPress={confirmBooking} activeOpacity={0.8}>
                    <Text style={styles.confirmText}>✨ Create my trip</Text>
                  </TouchableOpacity>
                </>
              )}
            </Animated.View>
          </ScrollView>
        )}

        <View style={{ height: 32 }} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  headerBtn: { fontSize: 15, fontWeight: '600', color: 'rgba(232,168,50,0.9)' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },

  pickArea: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  pickTitle: { fontSize: 22, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 8 },
  pickSub: { fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: 32, lineHeight: 20 },
  pickBtn: {
    backgroundColor: 'rgba(232,168,50,0.15)', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 32,
    borderWidth: 1, borderColor: 'rgba(232,168,50,0.3)',
  },
  pickBtnText: { fontSize: 16, fontWeight: '700', color: 'rgba(232,168,50,0.9)' },
  previewRow: { flexDirection: 'row', gap: 8, marginTop: 24, justifyContent: 'center' },
  previewThumb: { width: 96, height: 96, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)' },

  parseCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 20, marginHorizontal: 24, marginTop: 40,
    padding: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  spinnerWrap: { alignItems: 'center', marginBottom: 16 },
  spinner: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(232,168,50,0.12)',
    borderWidth: 2, borderColor: 'rgba(232,168,50,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  spinnerEmoji: { fontSize: 30 },
  parseEmoji: { fontSize: 40, textAlign: 'center', marginBottom: 12 },
  parseTitle: { fontSize: 17, fontWeight: '600', color: '#fff', textAlign: 'center', marginBottom: 24 },
  parseSteps: { gap: 8 },
  parseStepText: { fontSize: 13, color: 'rgba(255,255,255,0.7)', paddingVertical: 3 },
  parseHint: { fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 20, lineHeight: 17 },
  parseError: { fontSize: 13, color: '#ff6b6b', textAlign: 'center', marginTop: 14, lineHeight: 18 },
  cancelBtn: {
    marginTop: 18, paddingVertical: 10, borderRadius: 10,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  cancelBtnText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },

  textsContainer: { paddingHorizontal: 24, paddingTop: 40, minHeight: 80, justifyContent: 'center' },
  cinematicText: { fontSize: 18, fontWeight: '600', color: '#fff', textAlign: 'center', lineHeight: 26 },

  resultCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 20, marginHorizontal: 24, marginTop: 16,
    padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  resultBadge: { fontSize: 12, fontWeight: '700', color: '#4cd964', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  label: { fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: '500' },
  value: { fontSize: 14, color: '#fff', fontWeight: '600', maxWidth: '55%', textAlign: 'right' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },

  confirmBtn: {
    backgroundColor: 'rgba(232,168,50,0.9)', borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', marginTop: 20,
  },
  confirmText: { fontSize: 15, fontWeight: '800', color: '#0a0a0a' },

  manualBtn: {
    backgroundColor: 'rgba(232,168,50,0.15)', borderRadius: 12, paddingVertical: 10,
    alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(232,168,50,0.25)',
  },
  manualBtnText: { fontSize: 13, fontWeight: '600', color: 'rgba(232,168,50,0.9)' },
  manualForm: { width: '100%' },
  manualTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 12, textAlign: 'center' },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  typeChip: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  typeChipActive: { backgroundColor: 'rgba(232,168,50,0.15)', borderColor: 'rgba(232,168,50,0.4)' },
  typeChipText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  typeChipTextActive: { color: 'rgba(232,168,50,0.9)' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14,
    color: '#fff', fontSize: 14, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
});