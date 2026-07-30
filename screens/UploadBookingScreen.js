import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Image, Platform, SafeAreaView, Animated, Dimensions
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../theme/colors';
import { apiCall, API_ENDPOINTS } from '../utils/api';
import * as Tesseract from 'tesseract.js';

const { width: W } = Dimensions.get('window');

export default function UploadBookingScreen({ onClose, onBookingParsed }) {
  const [images, setImages] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [phase, setPhase] = useState(0); // 0=picker, 1=parsing, 2=texts, 3=results+card
  const [step, setStep] = useState(-1);
  const [textIdx, setTextIdx] = useState(-1);
  const [ocrProgress, setOcrProgress] = useState(0);

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

  // ─── Web-safe image picker ───
  const pickImages = async (useCamera) => {
    let files = [];

    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      if (useCamera) {
        input.setAttribute('capture', 'environment');
        input.accept = 'image/*';
      } else {
        input.removeAttribute('capture');
        input.accept = 'image/*';
      }
      input.multiple = false;

      files = await new Promise((resolve) => {
        const timer = setTimeout(() => resolve([]), 120000);
        input.onchange = (e) => {
          clearTimeout(timer);
          resolve(Array.from(e.target.files || []));
        };
        input.click();
      });
      if (files.length === 0) return;

      const base64Images = await Promise.all(files.map((file) => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
        });
      }));
      setImages(prev => [...prev, ...base64Images.filter(Boolean)]);
      return;
    }

    // Native
    const options = { mediaTypes: ['images'], quality: 0.5, base64: true };
    const result = useCamera
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
    if (!result.canceled && result.assets?.length > 0) {
      setImages(prev => [...prev, ...result.assets.map(a => a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri)]);
    }
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // ─── Build personal texts from parsed data ───
  const buildPersonalTexts = (data) => {
    const texts = [];
    if (data?._isFallback || data?._ocrFailed) {
      texts.push('👀 Let me look at your booking...');
      texts.push('Reading the details on your screenshot...');
      texts.push('Almost there! Processing the info...');
      texts.push('I can see travel plans forming... ✈️');
      texts.push('Let me put together something special for you... ✨');
      texts.push("Just give me a moment... 🦗");
      return texts;
    }
    if (data?.destination && data.destination !== 'your destination' && data.destination !== 'Unknown') {
      texts.push(`I can see you're heading to ${data.destination}! 🏖️`);
    }
    if (data?.hotel && data.hotel !== '—') {
      texts.push(`You'll be staying at ${data.hotel} — looks lovely! 🏠`);
    }
    if (data?.guests && data.guests !== '—') {
      texts.push(`${data.guests} — sounds like a great crew! 👥`);
    }
    if (data?.checkIn && data.checkIn !== '—') {
      texts.push(`Your adventure starts ${data.checkIn} 📅`);
      if (data?.checkOut && data.checkOut !== '—') {
        texts.push(`Until ${data.checkOut} — that's a solid trip! 🌴`);
      }
    }
    if (data?.confirmation && data.confirmation !== '—') {
      texts.push(`Booking ref ${data.confirmation} — got it. ✅`);
    }
    texts.push('Let me put together something special for you... ✨');
    texts.push("I'll create the perfect itinerary, just give me a moment... 🦗");
    return texts;
  };
  // ─── Tesseract OCR in browser ───
  const runOcrInBrowser = async (imageDataUrl, onProgress) => {
    try {
      const result = await Tesseract.recognize(imageDataUrl, 'eng+ita', {
        logger: (info) => {
          if (info.status === 'recognizing text') {
            const pct = Math.round(info.progress * 100);
            onProgress?.(pct);
          }
        },
      });
      return result.data.text.trim();
    } catch (err) {
      console.error('Tesseract error:', err);
      return '';
    }
  };

  // ─── Parse the booking ───
  const parseBooking = async () => {
    setPhase(1);
    setParsing(true);
    setTextIdx(-1);
    setOcrProgress(0);
    Animated.parallel([
      Animated.timing(parseOp, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(parseScale, { toValue: 1, tension: 40, friction: 10, useNativeDriver: true }),
    ]).start();

    // Show initial loading step
    setStep(0);

    let extractedText = '';
    let resultData = null;

    // PHASE 1: OCR — run immediately, show progress
    if (images.length > 0) {
      try {
        setStep(1); // Scanning text
        extractedText = await runOcrInBrowser(images[0], (pct) => {
          setOcrProgress(pct);
          if (pct > 20) setStep(2);  // Recognizing
          if (pct > 50) setStep(3);  // Extracting
          if (pct > 75) setStep(4);  // Finding destination
        });
        if (extractedText) {
          console.log('OCR extracted:', extractedText.slice(0, 200));
          setStep(5); // Building
        }
      } catch (ocrErr) {
        console.error('OCR failed:', ocrErr);
      }
    }

    // PHASE 2: Parse with DeepSeek if we got text
    if (extractedText) {
      try {
        setStep(5);
        const response = await apiCall(API_ENDPOINTS.PARSE_BOOKING, {
          method: 'POST',
          body: JSON.stringify({ ocrText: extractedText }),
        });
        if (response.ok) {
          const data = await response.json();
          resultData = { ...data, _isFallback: false, _isDemo: false };
        }
      } catch (apiErr) {
        console.error('DeepSeek parse error:', apiErr);
      }
    }

    // If we got OCR text but DeepSeek failed, show raw text
    if (extractedText && !resultData) {
      const firstLine = extractedText.split('\n')[0].trim() || 'Read from image';
      resultData = {
        destination: firstLine,
        checkIn: '—', checkOut: '—', hotel: '—', confirmation: '—', guests: '—',
        _rawOcr: extractedText.slice(0, 500),
      };
    }

    // Full fallback — no text extracted at all
    if (!resultData) {
      resultData = {
        destination: images.length === 0 ? 'your destination' : 'Unknown',
        checkIn: '—', checkOut: '—', hotel: '—', confirmation: '—', guests: '—',
        pages: images.length || 1,
        _isDemo: images.length === 0,
        _ocrFailed: images.length > 0,
      };
    }

    setParsed(resultData);

    // PHASE 3: Run steps animation (now with real data)
    const steps = [
      '📸 Image loaded',
      '🔍 Text scanned',
      '📝 Info recognized',
      '🧠 Data extracted',
      '📍 Destination found',
      '✅ Trip built',
    ];

    // Fade out parse view
    Animated.timing(parseOp, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    Animated.timing(resultOp, { toValue: 1, duration: 300, useNativeDriver: true }).start();

    // Show phase 2 (texts)
    setPhase(2);

    const texts = buildPersonalTexts(resultData);
    setTextIdx(0);
    textBlend.setValue(1);

    // Queue subsequent texts
    if (texts.length > 1) {
      for (let i = 1; i < texts.length; i++) {
        setTimeout(() => {
          setTextIdx(i);
          textBlend.setValue(0);
          Animated.timing(textBlend, { toValue: 1, duration: 600, useNativeDriver: true }).start();
        }, i * 3000);
      }
      // Show result card after all texts
      setTimeout(() => {
        setPhase(3);
        Animated.parallel([
          Animated.timing(resultOp, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(resultSlide, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]).start();
      }, texts.length * 3000 + 500);
    } else {
      setTimeout(() => {
        setPhase(3);
        Animated.parallel([
          Animated.timing(resultOp, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(resultSlide, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]).start();
      }, 3000);
    }

    setParsing(false);
  };

  const confirmBooking = () => {
    if (onBookingParsed) onBookingParsed(parsed);
    if (onClose) onClose();
  };

  const hasImages = images.length > 0;
  const personalTexts = parsed ? buildPersonalTexts(parsed) : [];

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: contentOp }]}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.brand}>Grillo</Text>
          <View style={{ width: 50 }} />
        </Animated.View>

        {/* ─── PHASE 0: Picker ─── */}
        {phase === 0 && (
          <Animated.View style={{ flex: 1, opacity: contentOp }}>
            <View style={styles.heroSection}>
              <Text style={styles.mainLabel}>Upload your booking</Text>
              <Text style={styles.subLabel}>
                Take a screenshot of your confirmation{'\n'}and I'll take care of the rest.
              </Text>
            </View>

            <View style={styles.pickerSection}>
              <TouchableOpacity style={styles.pickerBtn} onPress={() => pickImages(true)} activeOpacity={0.8}>
                <Text style={styles.pickerIcon}>📸</Text>
                <Text style={styles.pickerLabel}>Take photo</Text>
                <Text style={styles.pickerDesc}>Snap your booking confirmation</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.pickerBtn} onPress={() => pickImages(false)} activeOpacity={0.8}>
                <Text style={styles.pickerIcon}>🖼️</Text>
                <Text style={styles.pickerLabel}>From gallery</Text>
                <Text style={styles.pickerDesc}>Choose existing screenshots</Text>
              </TouchableOpacity>
            </View>

            {!hasImages && (
              <TouchableOpacity style={styles.demoBtn} onPress={parseBooking} activeOpacity={0.8}>
                <Text style={styles.demoIcon}>🦗</Text>
                <View>
                  <Text style={styles.demoLabel}>Try the demo</Text>
                  <Text style={styles.demoDesc}>Test the full flow — Split, Croatia</Text>
                </View>
                <Text style={styles.demoArrow}>→</Text>
              </TouchableOpacity>
            )}

            {hasImages && (
              <View style={styles.previewSection}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {images.map((uri, i) => (
                    <View key={i} style={styles.thumbWrap}>
                      <Image source={{ uri }} style={styles.thumb} resizeMode="cover" />
                      <TouchableOpacity style={styles.removeBtn} onPress={() => removeImage(i)}>
                        <Text style={styles.removeText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
                <TouchableOpacity style={styles.parseBtn} onPress={parseBooking} activeOpacity={0.8}>
                  <Text style={styles.parseBtnText}>
                    🔍 Parse {images.length} screenshot{images.length > 1 ? 's' : ''}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.retakeBtn} onPress={() => setImages([])}>
                  <Text style={styles.retakeText}>Choose different photos</Text>
                </TouchableOpacity>
              </View>
            )}

            {!hasImages && (
              <View style={styles.emailSection}>
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>
                <View style={styles.emailCard}>
                  <Text style={styles.emailIcon}>✉️</Text>
                  <Text style={styles.emailLabel}>Forward your email</Text>
                  <Text style={styles.emailSub}>
                    Send your booking confirmation to{'\n'}
                    <Text style={styles.emailAddr}>bookings@grilloparlante.app</Text>
                  </Text>
                </View>
              </View>
            )}
          </Animated.View>
        )}

        {/* ─── PHASE 1: Parsing ─── */}
        {phase === 1 && (
          <View style={styles.parseContainer}>
            <Animated.View style={[styles.parseCard, { opacity: parseOp, transform: [{ scale: parseScale }] }]}>
              <Text style={styles.parseEmoji}>🔍</Text>
              <Text style={styles.parseTitle}>Grillo is reading your booking</Text>
              {ocrProgress > 0 && (
                <>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${ocrProgress}%` }]} />
                  </View>
                  <Text style={styles.progressText}>{ocrProgress}%</Text>
                </>
              )}
              <View style={styles.parseSteps}>
                {['📸 Loading OCR...', '🔍 Scanning...', '📝 Recognizing...', '🧠 Extracting...', '📍 Finding...', '✅ Building...'].map((s, i) => (
                  <Animated.Text key={i} style={[styles.parseStepText, {
                    opacity: step >= i ? 1 : 0.2,
                    transform: [{ translateX: step >= i ? 0 : -8 }],
                  }]}>
                    {s}
                  </Animated.Text>
                ))}
              </View>
            </Animated.View>
          </View>
        )}

        {/* ─── PHASE 2+3: Cinematic texts + result card ─── */}
        {(phase === 2 || phase === 3) && parsed && (
          <View style={styles.resultWrap}>
            <View style={styles.textsContainer}>
              {personalTexts.map((t, i) => (
                <Animated.Text key={i} style={[styles.personalText, {
                  opacity: textIdx === i ? textBlend : 0,
                  transform: [{ translateY: textIdx === i ? 0 : 12 }, { scale: textIdx === i ? 1 : 0.97 }],
                }]}>
                  {t}
                </Animated.Text>
              ))}
            </View>

            {phase === 3 && (
              <Animated.View style={[styles.resultCard, { opacity: resultOp, transform: [{ translateY: resultSlide }] }]}>
                <Text style={styles.resultBadge}>✅ Booking detected</Text>
                {parsed._ocrFailed && (
                  <Text style={styles.fallbackWarning}>
                    ⚠️ Could not read the screenshot text.{'\n'}You can still create a trip manually.
                  </Text>
                )}
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>📍 Destination</Text>
                  <Text style={styles.resultValue}>{parsed.destination}</Text>
                </View>
                <View style={styles.resultDivider} />
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>📅 Check-in</Text>
                  <Text style={styles.resultValue}>{parsed.checkIn}</Text>
                </View>
                <View style={styles.resultDivider} />
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>📅 Check-out</Text>
                  <Text style={styles.resultValue}>{parsed.checkOut}</Text>
                </View>
                <View style={styles.resultDivider} />
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>🏨 Accommodation</Text>
                  <Text style={styles.resultValue}>{parsed.hotel}</Text>
                </View>
                <View style={styles.resultDivider} />
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>👥 Guests</Text>
                  <Text style={styles.resultValue}>{parsed.guests}</Text>
                </View>
                <View style={styles.resultDivider} />
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>🔑 Confirmation</Text>
                  <Text style={styles.resultValue}>{parsed.confirmation}</Text>
                </View>
                <TouchableOpacity style={styles.confirmBtn} onPress={confirmBooking} activeOpacity={0.8}>
                  <Text style={styles.confirmText}>✨ Create my trip</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
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
  backBtn: { padding: 4 },
  backText: { fontSize: 15, fontWeight: '600', color: 'rgba(232,168,50,0.8)' },
  brand: { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.3)', letterSpacing: -0.3 },

  heroSection: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28 },
  mainLabel: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5, marginBottom: 8 },
  subLabel: { fontSize: 15, fontWeight: '400', color: 'rgba(255,255,255,0.4)', lineHeight: 22 },

  pickerSection: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 24 },
  pickerBtn: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20, padding: 20,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  pickerIcon: { fontSize: 32, marginBottom: 8 },
  pickerLabel: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 2 },
  pickerDesc: { fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'center', lineHeight: 15 },

  demoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(232,168,50,0.08)', borderRadius: 16, padding: 16, marginHorizontal: 20, marginBottom: 24,
    borderWidth: 1, borderColor: 'rgba(232,168,50,0.2)',
  },
  demoIcon: { fontSize: 28 },
  demoLabel: { fontSize: 14, fontWeight: '700', color: 'rgba(232,168,50,0.9)' },
  demoDesc: { fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 1 },
  demoArrow: { fontSize: 18, color: 'rgba(232,168,50,0.5)', marginLeft: 'auto' },

  previewSection: { paddingHorizontal: 20 },
  thumbWrap: { position: 'relative' },
  thumb: { width: 80, height: 110, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)' },
  removeBtn: {
    position: 'absolute', top: -6, right: -6,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#c2553a', alignItems: 'center', justifyContent: 'center',
  },
  removeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  parseBtn: {
    backgroundColor: 'rgba(232,168,50,0.9)', paddingVertical: 14, borderRadius: 14,
    alignItems: 'center', marginTop: 16,
  },
  parseBtnText: { fontSize: 14, fontWeight: '700', color: '#0a0a0a' },
  retakeBtn: { alignItems: 'center', marginTop: 12, padding: 8 },
  retakeText: { fontSize: 12, color: 'rgba(232,168,50,0.5)', fontWeight: '500' },

  parseContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, backgroundColor: '#0a0a0a',
  },
  parseCard: {
    backgroundColor: '#1a1a1a', borderRadius: 24, padding: 32,
    alignItems: 'center', width: '100%', maxWidth: 320,
    borderWidth: 1, borderColor: 'rgba(232,168,50,0.15)',
  },
  parseEmoji: { fontSize: 48, marginBottom: 12 },
  parseTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 24, textAlign: 'center' },
  progressBar: {
    width: '100%', height: 4, backgroundColor: 'rgba(232,168,50,0.15)',
    borderRadius: 2, marginBottom: 8, overflow: 'hidden',
  },
  progressFill: { height: 4, backgroundColor: 'rgba(232,168,50,0.8)', borderRadius: 2 },
  progressText: { fontSize: 11, color: 'rgba(232,168,50,0.6)', marginBottom: 12 },
  parseSteps: { alignItems: 'flex-start', width: '100%', gap: 8 },
  parseStepText: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },

  emailSection: { paddingHorizontal: 20, marginTop: 8 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  dividerText: { fontSize: 12, color: 'rgba(255,255,255,0.25)', fontWeight: '500' },
  emailCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 20,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  emailIcon: { fontSize: 28, marginBottom: 8 },
  emailLabel: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 6 },
  emailSub: { fontSize: 12, color: 'rgba(255,255,255,0.35)', textAlign: 'center', lineHeight: 18 },
  emailAddr: { fontSize: 12, color: 'rgba(232,168,50,0.7)', fontWeight: '600' },

  resultWrap: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },
  textsContainer: { height: 120, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  personalText: {
    position: 'absolute', fontSize: 18, fontWeight: '600', color: '#fff',
    textAlign: 'center', lineHeight: 26, maxWidth: 340,
  },
  resultCard: {
    backgroundColor: '#1a1a1a', borderRadius: 24, padding: 24,
    borderWidth: 1, borderColor: 'rgba(232,168,50,0.12)',
  },
  resultBadge: {
    fontSize: 14, fontWeight: '700', color: '#4ade80', marginBottom: 16,
    textAlign: 'center', letterSpacing: 0.5,
  },
  fallbackWarning: {
    fontSize: 11, color: 'rgba(232,168,50,0.8)', textAlign: 'center',
    marginBottom: 12, lineHeight: 16,
  },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  resultDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
  resultLabel: { fontSize: 13, color: 'rgba(255,255,255,0.45)', fontWeight: '500' },
  resultValue: { fontSize: 13, color: '#fff', fontWeight: '600', maxWidth: '55%', textAlign: 'right' },
  confirmBtn: {
    backgroundColor: 'rgba(232,168,50,0.9)', borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', marginTop: 20,
  },
  confirmText: { fontSize: 15, fontWeight: '800', color: '#0a0a0a' },
});
