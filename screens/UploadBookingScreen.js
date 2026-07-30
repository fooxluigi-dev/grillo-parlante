import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Image, Platform, SafeAreaView, Animated, Dimensions, TextInput
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Tesseract from 'tesseract.js';

const { width: W } = Dimensions.get('window');
const API = 'https://gp-landing-rho.vercel.app/api/parse-booking';

export default function UploadBookingScreen({ onClose, onBookingParsed }) {
  const [image, setImage] = useState(null);        // base64 data URL
  const [parsing, setParsing] = useState(false);
  const [phase, setPhase] = useState(0);            // 0=pick 1=parsing 2=result
  const [step, setStep] = useState(-1);
  const [parsed, setParsed] = useState(null);
  const [error, setError] = useState('');
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState({ destination: '', checkIn: '', checkOut: '', hotel: '' });
  const [textIdx, setTextIdx] = useState(-1);

  // Animations
  const contentOp = useRef(new Animated.Value(0)).current;
  const parseOp = useRef(new Animated.Value(0)).current;
  const parseScale = useRef(new Animated.Value(0.9)).current;
  const resultOp = useRef(new Animated.Value(0)).current;
  const resultSlide = useRef(new Animated.Value(30)).current;
  const textBlend = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(contentOp, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  // ─── Pick image (web + native) ───
  const resizeImage = (base64, maxW=1200) => new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      let {width, height} = img;
      if (width > maxW) { height = height * maxW / width; width = maxW; }
      const c = document.createElement('canvas');
      c.width = width; c.height = height;
      c.getContext('2d').drawImage(img, 0, 0, width, height);
      resolve(c.toDataURL('image/jpeg', 0.8));
    };
    img.src = base64;
  });

  const pick = async () => {
    let dataUrl = '';

    if (Platform.OS === 'web') {
      const files = await new Promise((resolve) => {
        const el = document.createElement('input');
        el.type = 'file';
        el.accept = 'image/*';
        el.multiple = false;
        el.onchange = (e) => resolve(Array.from(e.target.files || []));
        el.click();
      });
      if (!files.length) return;

      const file = files[0];
      console.log('File:', file.name, file.type, (file.size / 1024).toFixed(1) + 'KB');

      dataUrl = await new Promise((r) => {
        const reader = new FileReader();
        reader.onload = () => r(reader.result);
        reader.readAsDataURL(file);
      });
    } else {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], quality: 0.5, base64: true,
      });
      if (result.canceled || !result.assets?.length) return;
      dataUrl = `data:image/jpeg;base64,${result.assets[0].base64}`;
    }

    // Resize to 1200px before sending
    const resized = Platform.OS === 'web' ? await resizeImage(dataUrl, 1200) : dataUrl;
    setImage(resized);
    parseImage(resized);
  };

  // ─── Parse: send image → OCR → DeepSeek → show result ───
  const parseImage = async (dataUrl) => {
    setParsing(true);
    setPhase(1);
    setStep(0);
    setError('');
    setTextIdx(-1);

    Animated.parallel([
      Animated.timing(parseOp, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(parseScale, { toValue: 1, tension: 40, friction: 10, useNativeDriver: true }),
    ]).start();

    // Step animation (runs in background)
    const steps = ['📸 Loading...', '🔍 Scanning...', '📝 Reading...', '🧠 Parsing...', '📍 Found!', '✅ Done!'];
    steps.forEach((_, i) => setTimeout(() => setStep(i), i * 1500 + 400));

    let result = null;
    let ocrText = '';
    try {
      // Run Tesseract OCR client-side for maximum reliability
      if (Platform.OS === 'web') {
        const { data } = await Tesseract.recognize(dataUrl, 'eng', {
          logger: (m) => {
            if (m.status === 'recognizing text') setStep(m.progress > 0.7 ? 2 : 1);
          }
        });
        ocrText = data?.text?.trim() || '';
        if (ocrText) console.log(`Tesseract extracted ${ocrText.length} chars`);
      }

      // Send text + image to API
      const resp = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: [dataUrl],
          ocrText: ocrText || undefined,
        }),
      });
      if (resp.ok) {
        const j = await resp.json();
        if (j?.destination && j.destination !== 'Unknown') {
          result = { ...j, _isFallback: false };
        }
      }
    } catch (e) {
      console.error('API error:', e);
      setError('Could not reach the server. Try again?');
    }

    // Fallback
    if (!result) {
      result = {
        destination: 'your destination',
        checkIn: '—', checkOut: '—', hotel: '—', confirmation: '—', guests: '—',
        _isFallback: true,
      };
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
  const buildTexts = (d) => {
    const t = [];
    if (d?._isFallback) {
      t.push("👀 Let me look at your booking...");
      t.push("Reading the details...");
      t.push("Almost there! Processing the info...");
      t.push("I'll create the perfect itinerary... 🦗");
    } else {
      if (d.destination && d.destination !== 'your destination')
        t.push(`I can see you're heading to ${d.destination}! 🏖️`);
      if (d.hotel && d.hotel !== '—')
        t.push(`You'll be at ${d.hotel} — lovely! 🏠`);
      if (d.checkIn && d.checkIn !== '—')
        t.push(`Check-in ${d.checkIn} 📅`);
      if (d.checkOut && d.checkOut !== '—')
        t.push(`Check-out ${d.checkOut} 🌴`);
      if (d.guests && d.guests !== '—')
        t.push(`${d.guests} — great crew! 👥`);
      if (d.confirmation && d.confirmation !== '—')
        t.push(`Ref ${d.confirmation} ✅`);
      t.push('Let me put together something special for you... ✨');
      t.push("I'll create the perfect itinerary, just give me a moment... 🦗");
    }
    return t.filter(Boolean);
  };

  const confirmBooking = () => {
    if (parsed) onBookingParsed?.(parsed);
  };

  const applyManual = () => {
    setParsed({ ...parsed, destination: manual.destination, checkIn: manual.checkIn, checkOut: manual.checkOut, hotel: manual.hotel, _isManual: true });
    setManualOpen(false);
  };

  // ─── Render ───
  const maxH = W * 1.25;

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}><Text style={styles.headerBtn}>← Back</Text></TouchableOpacity>
          <Text style={styles.headerTitle}>Grillo</Text>
          <View style={{ width: 60 }} />
        </View>

        {phase === 0 && (
          <Animated.View style={[styles.pickArea, { opacity: contentOp }]}>
            <Text style={styles.pickTitle}>Upload your booking screenshot</Text>
            <Text style={styles.pickSub}>I'll read the details and create a custom itinerary</Text>
            <TouchableOpacity style={styles.pickBtn} onPress={pick}>
              <Text style={styles.pickBtnText}>📸 Choose image</Text>
            </TouchableOpacity>
            {image && (
              <Image source={{ uri: image }} style={[styles.preview, { maxHeight: maxH }]} resizeMode="contain" />
            )}
          </Animated.View>
        )}

        {phase === 1 && (
          <Animated.View style={[styles.parseCard, { opacity: parseOp, transform: [{ scale: parseScale }] }]}>
            <Text style={styles.parseEmoji}>🔍</Text>
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

              {parsed._isFallback && !manualOpen && (
                <TouchableOpacity style={styles.manualBtn} onPress={() => setManualOpen(true)}>
                  <Text style={styles.manualBtnText}>✏️ Enter details manually</Text>
                </TouchableOpacity>
              )}

              {manualOpen ? (
                <View style={styles.manualForm}>
                  <Text style={styles.manualTitle}>Enter your booking</Text>
                  <TextInput style={styles.input} placeholder="Destination" placeholderTextColor="rgba(255,255,255,0.3)"
                    value={manual.destination} onChangeText={t => setManual(m => ({...m, destination: t}))} />
                  <TextInput style={styles.input} placeholder="Check-in date" placeholderTextColor="rgba(255,255,255,0.3)"
                    value={manual.checkIn} onChangeText={t => setManual(m => ({...m, checkIn: t}))} />
                  <TextInput style={styles.input} placeholder="Check-out date" placeholderTextColor="rgba(255,255,255,0.3)"
                    value={manual.checkOut} onChangeText={t => setManual(m => ({...m, checkOut: t}))} />
                  <TextInput style={styles.input} placeholder="Hotel name" placeholderTextColor="rgba(255,255,255,0.3)"
                    value={manual.hotel} onChangeText={t => setManual(m => ({...m, hotel: t}))} />
                  <TouchableOpacity style={styles.confirmBtn} onPress={applyManual}>
                    <Text style={styles.confirmText}>✅ Confirm</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={styles.row}><Text style={styles.label}>📍 Destination</Text><Text style={styles.value}>{parsed.destination}</Text></View>
                  <View style={styles.divider} />
                  <View style={styles.row}><Text style={styles.label}>📅 Check-in</Text><Text style={styles.value}>{parsed.checkIn}</Text></View>
                  <View style={styles.divider} />
                  <View style={styles.row}><Text style={styles.label}>📅 Check-out</Text><Text style={styles.value}>{parsed.checkOut}</Text></View>
                  <View style={styles.divider} />
                  <View style={styles.row}><Text style={styles.label}>🏨 Accommodation</Text><Text style={styles.value}>{parsed.hotel}</Text></View>
                  <View style={styles.divider} />
                  <View style={styles.row}><Text style={styles.label}>👥 Guests</Text><Text style={styles.value}>{parsed.guests || '—'}</Text></View>
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
  preview: { width: '100%', borderRadius: 12, marginTop: 24, backgroundColor: 'rgba(255,255,255,0.05)' },

  parseCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 20, marginHorizontal: 24, marginTop: 40,
    padding: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  parseEmoji: { fontSize: 40, textAlign: 'center', marginBottom: 12 },
  parseTitle: { fontSize: 17, fontWeight: '600', color: '#fff', textAlign: 'center', marginBottom: 24 },
  parseSteps: { gap: 8 },
  parseStepText: { fontSize: 13, color: 'rgba(255,255,255,0.7)', paddingVertical: 3 },

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
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14,
    color: '#fff', fontSize: 14, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
});
