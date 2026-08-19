import React, { useRef, useEffect, useState, useContext, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform,
  Animated, Dimensions, ImageBackground, Modal
} from 'react-native';
import { Colors } from '../theme/colors';
import { AuthContext } from '../context/AuthContext';
import UploadBookingScreen from './UploadBookingScreen';
const { width: W, height: H } = Dimensions.get('window');
const IS_WEB = Platform.OS === 'web';

// ─── Scene reveal via IntersectionObserver ───
function Scene({ children, delay = 0, style, onVisible }) {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(20)).current;
  const [show, setShow] = useState(false);
  const ref = useRef(null);
  const fired = useRef(false);

  useEffect(() => {
    if (IS_WEB && typeof IntersectionObserver !== 'undefined') {
      const obs = new IntersectionObserver(([e]) => {
        if (e.isIntersecting && !fired.current) {
          fired.current = true;
          setShow(true);
          onVisible?.();
          obs.disconnect();
        }
      }, { threshold: 0.2 });
      if (ref.current) obs.observe(ref.current);
      return () => obs.disconnect();
    } else {
      const t = setTimeout(() => setShow(true), 500);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    if (show) {
      Animated.parallel([
        Animated.timing(op, { toValue: 1, duration: 900, delay, useNativeDriver: true }),
        Animated.spring(ty, { toValue: 0, delay, tension: 40, friction: 16, useNativeDriver: true }),
      ]).start();
    }
  }, [show]);

  return <Animated.View ref={ref} style={[{ opacity: op, transform: [{ translateY: ty }] }, style]}>{children}</Animated.View>;
}

// ─── Travel DNA — progressive trips ───
function TravelDNA({ trigger }) {
  const TRIPS = [
    { label: 'Trip 1', text: 'Old Town · Beach · Pizza', tags: ['Sightseeing', 'Relax', 'Italian'] },
    { label: 'Trip 5', text: 'Food tour · Hiking · Wine', tags: ['Foodie', 'Active', 'Wine lover'] },
    { label: 'Trip 12', text: 'Hidden gems · Cooking class · Local market', tags: ['Foodie', 'Explorer', 'Early bird', 'Cultural'] },
  ];
  const [idx, setIdx] = useState(-1);

  useEffect(() => {
    if (!trigger) return;
    setIdx(-1);
    TRIPS.forEach((_, i) => setTimeout(() => setIdx(i), i * 1200 + 400));
  }, [trigger]);

  return (
    <View style={styles.dnaWrap}>
      {TRIPS.map((t, i) => (
        <View key={i} style={[styles.dnaRow, { opacity: i <= idx ? 1 : 0 }]}>
          <View style={styles.dnaLeft}>
            <View style={[styles.dnaDot, i === idx && styles.dnaDotActive]} />
            {i < TRIPS.length - 1 && <View style={styles.dnaLine} />}
          </View>
          <View style={styles.dnaContent}>
            <Text style={[styles.dnaLabel, i === idx && styles.dnaLabelActive]}>{t.label}</Text>
            <Text style={styles.dnaText}>{t.text}</Text>
            <View style={styles.dnaTags}>
              {t.tags.map((tag, j) => (
                <View key={j} style={styles.dnaTag}><Text style={styles.dnaTagText}>{tag}</Text></View>
              ))}
            </View>
          </View>
        </View>
      ))}
      {idx === TRIPS.length - 1 && (
        <Scene delay={200}>
          <Text style={styles.dnaConclusion}>Your trips keep getting better.</Text>
        </Scene>
      )}
    </View>
  );
}

// ─── Live notifications — one at a time ───
function LiveFeed({ trigger }) {
  const NOTIFS = [
    { icon: '🛫', text: 'Gate changed to B14', sub: '2 min walk from current gate' },
    { icon: '🚆', text: 'Metro line 2 delayed', sub: 'Bus ready at exit C' },
    { icon: '☔', text: 'Rain in 40 min', sub: 'Umbrella reminder set' },
    { icon: '🌅', text: 'Sunset in 25 min', sub: 'Rooftop bar, 2 min' },
    { icon: '🍜', text: 'Hidden ramen nearby', sub: 'Local favourite, 5 min walk' },
    { icon: '🎨', text: 'Museum closed today', sub: 'Park alternative prepared' },
  ];
  const ops = useRef(NOTIFS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (!trigger) return;
    // Reset
    ops.forEach(o => o.setValue(0));
    // Reveal one at a time
    const timers = [];
    NOTIFS.forEach((_, i) => {
      const t = setTimeout(() => {
        Animated.spring(ops[i], { toValue: 1, tension: 45, friction: 9, useNativeDriver: true }).start();
      }, i * 1000 + 200);
      timers.push(t);
    });
    return () => timers.forEach(clearTimeout);
  }, [trigger]);

  return (
    <View style={{ width: '85%', maxWidth: 320, justifyContent: 'center', paddingVertical: 12 }}>
      {NOTIFS.map((n, i) => (
        <Animated.View key={i} style={[styles.notifCard, {
          opacity: ops[i],
          transform: [
            { translateX: ops[i].interpolate({inputRange:[0,1],outputRange:[i === 0 ? 0 : 60, 0]}) },
            { scale: ops[i].interpolate({inputRange:[0,1],outputRange:[0.95, 1]}) },
          ],
        }]}>
          <Text style={styles.notifIcon}>{n.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.notifText}>{n.text}</Text>
            <Text style={styles.notifSub}>{n.sub}</Text>
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

// ─── Memory bubbles ───
function MemoryBubbles({ trigger }) {
  const MEMS = ['🎭 Red Theatre', '🍝 Fresh pasta', '🌅 Sunset boat', '🏛️ Old Town', '🍦 Gelato', '🌊 Beach day'];
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!trigger) return;
    setTimeout(() => setShow(true), 400);
  }, [trigger]);

  if (!show) return null;
  return (
    <View style={styles.memWrap}>
      {MEMS.map((m, i) => (
        <Scene key={i} delay={i * 150}>
          <View style={styles.memBubble}>
            <Text style={styles.memText}>{m}</Text>
          </View>
        </Scene>
      ))}
    </View>
  );
}

// ─── Hero Scene — slow, emotional, cinematic ───
function HeroText({ onLogin }) {
  const op1 = useRef(new Animated.Value(0)).current;
  const op2 = useRef(new Animated.Value(0)).current;
  const op3 = useRef(new Animated.Value(0)).current;
  const opBar = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    const init = setTimeout(() => {
      Animated.timing(op1, { toValue: 1, duration: 1200, useNativeDriver: true }).start();
    }, 1600);

    const t2 = setTimeout(() => {
      Animated.timing(op2, { toValue: 1, duration: 960, useNativeDriver: true }).start();
    }, 3600);

    const t3 = setTimeout(() => {
      Animated.parallel([
        Animated.timing(op1, { toValue: 0, duration: 1000, useNativeDriver: true }),
        Animated.timing(op2, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ]).start(() => {
        setShowInvite(true);
        Animated.timing(op3, { toValue: 1, duration: 1200, useNativeDriver: true }).start();
      });
    }, 5200);

    const t4 = setTimeout(() => {
      Animated.timing(opBar, { toValue: 1, duration: 480, useNativeDriver: true }).start();
    }, 2400);

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.02, duration: 2400, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 2400, useNativeDriver: true }),
      ])
    );
    pulseLoop.start();

    return () => { clearTimeout(init); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); pulseLoop.stop(); };
  }, []);

  return (
    <View style={styles.heroContainer}>
      <Animated.View style={[styles.heroBar, { opacity: opBar }]}>
        <Text style={styles.logo}>Grillo</Text>
        <TouchableOpacity
          onPress={onLogin}
          onClick={IS_WEB ? onLogin : undefined} // web: native click bypasses the ScrollView responder so the tap always lands
          activeOpacity={0.7}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <Text style={styles.signIn}>Sign in</Text>
        </TouchableOpacity>
      </Animated.View>

      <View style={styles.heroCenter}>
        <Animated.Text style={[styles.heroMain, { opacity: op1, transform: [{ scale: pulse }] }]}>
          Travel freely.
        </Animated.Text>
        <Animated.Text style={[styles.heroSub, { opacity: op2 }]}>
          I'll watch the rest.
        </Animated.Text>

        {showInvite && (
          <Animated.View style={[styles.heroInviteWrap, { opacity: op3 }]}>
            <View style={styles.heroInviteDot} />
            <Text style={styles.heroInvite}>Scroll down{'\n'}to start the journey together.</Text>
            <View style={[styles.heroInviteDot, { marginTop: 10 }]}>
              <Text style={styles.heroInviteArrow}>↓</Text>
            </View>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

// ─── Void Screenshot Demo — V4 Bold ───
function VoidDemo({ trigger, onComplete }) {
  const [phase, setPhase] = useState(0); // 0=idle, 1=upload-text, 2=screenshot, 3=void, 4=analysis, 5=insight, 6=done
  const [step, setStep] = useState(-1);
  const [highlight, setHighlight] = useState(null);
  const started = useRef(false);

  // Upload text
  const uploadOp = useRef(new Animated.Value(0)).current;
  // Screenshot
  const cardOp = useRef(new Animated.Value(0)).current;
  const scrDrop = useRef(new Animated.Value(0)).current;
  // Void suck
  const suckScale = useRef(new Animated.Value(1)).current;
  const suckRotate = useRef(new Animated.Value(0)).current;
  const suckOp = useRef(new Animated.Value(1)).current;
  const suckY = useRef(new Animated.Value(0)).current;
  // Void portal
  const portalScale = useRef(new Animated.Value(0)).current;
  const portalOp = useRef(new Animated.Value(0)).current;
  const portalGlow = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0)).current;
  const flashOp = useRef(new Animated.Value(0)).current;
  // Analysis feed
  const feedOp = useRef(new Animated.Value(0)).current;
  const doneOp = useRef(new Animated.Value(0)).current;

  // Orbiting particles
  const particleDists = useRef([...Array(16)].map(() => new Animated.Value(0))).current;
  const particleAngles = useRef([...Array(16)].map((_, i) => (i / 16) * 360)).current;

  const STEPS = [
    { label: '✈ Reading your screenshot…',           highlight: null       },
    { label: '✈ Flight SW 482 → Split',               highlight: 'flight'   },
    { label: '📅 22 — 28 August 2026',                highlight: 'dates'    },
    { label: '🏨 Airbnb · Old Town, Split',            highlight: 'hotel'    },
    { label: '👥 Luigi Rossi + 2 travellers',         highlight: 'travellers'},
    { label: '📍 Split, Croatia',                     highlight: 'dest'     },
    { label: '☀ Checking the weather…',               highlight: null       },
    { label: '🚆 Looking at local transport…',         highlight: null       },
    { label: '🎭 Finding events nearby…',              highlight: null       },
    { label: '🧠 Building your itinerary…',            highlight: null       },
  ];

  const timerRefs = useRef([]);

  useEffect(() => {
    if (!trigger) return;
    timerRefs.current = [];
    runSequence();
    return () => timerRefs.current.forEach(clearTimeout);
  }, [trigger]);

  const addTimer = (fn, ms) => {
    const id = setTimeout(fn, ms);
    timerRefs.current.push(id);
    return id;
  };

  const runSequence = () => {

    // ── Phase 1: "Upload your screenshot" appears (slow, like hero) ──
    setPhase(1);
    Animated.timing(uploadOp, { toValue: 1, duration: 1200, useNativeDriver: true }).start();

    // ── Phase 2: Invito sfuma via + screenshot fade in (simultaneo) ──
    addTimer(() => {
      setPhase(2);
      // Upload text fades out slowly
      Animated.timing(uploadOp, { toValue: 0, duration: 800, useNativeDriver: true }).start();
      // Screenshot fades in simultaneously
      cardOp.setValue(0);
      Animated.timing(cardOp, { toValue: 1, duration: 800, useNativeDriver: true }).start(() => {
        // After fade in complete, screenshot springs into position
        Animated.spring(scrDrop, { toValue: 1, tension: 35, friction: 14, useNativeDriver: true }).start();
      });
    }, 2800);

    // ── Phase 3: The Void (after screenshot + 2.5s) ──
    addTimer(() => {
      setPhase(3);

      // 0. Flash — brief white burst as void opens
      flashOp.setValue(0);
      Animated.sequence([
        Animated.timing(flashOp, { toValue: 0.6, duration: 80, useNativeDriver: false }),
        Animated.timing(flashOp, { toValue: 0, duration: 400, useNativeDriver: false }),
      ]).start();

      // 1. Portal snaps open
      portalScale.setValue(0);
      portalOp.setValue(1);
      Animated.spring(portalScale, { toValue: 2.2, tension: 60, friction: 12, useNativeDriver: true }).start();
      // Outer gravitational ring
      ringScale.setValue(0);
      Animated.sequence([
        Animated.timing(ringScale, { toValue: 4, duration: 1200, useNativeDriver: true }),
        Animated.timing(ringScale, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]).start();
      // Portal glow pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(portalGlow, { toValue: 1, duration: 600, useNativeDriver: false }),
          Animated.timing(portalGlow, { toValue: 0, duration: 600, useNativeDriver: false }),
        ])
      ).start();

      // 2. Particles burst faster
      particleDists.forEach(p => p.setValue(0));
      Animated.stagger(40,
        particleDists.map(p =>
          Animated.sequence([
            Animated.timing(p, { toValue: 1, duration: 200, useNativeDriver: true }),
            Animated.timing(p, { toValue: 0, duration: 1000, useNativeDriver: true }),
          ])
        )
      ).start();

      // 3. Screenshot gets sucked in — slower, more dramatic
      Animated.sequence([
        // Shiver
        Animated.parallel([
          Animated.sequence([
            Animated.timing(suckScale, { toValue: 0.98, duration: 80, useNativeDriver: true }),
            Animated.timing(suckScale, { toValue: 1.02, duration: 80, useNativeDriver: true }),
            Animated.timing(suckScale, { toValue: 0.97, duration: 80, useNativeDriver: true }),
            Animated.timing(suckScale, { toValue: 1.01, duration: 60, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(suckRotate, { toValue: 0.1, duration: 100, useNativeDriver: true }),
            Animated.timing(suckRotate, { toValue: -0.08, duration: 100, useNativeDriver: true }),
            Animated.timing(suckRotate, { toValue: 0.05, duration: 100, useNativeDriver: true }),
          ]),
        ]),
        // Suck into void
        Animated.parallel([
          Animated.timing(suckScale, { toValue: 0.08, duration: 1400, useNativeDriver: true }),
          Animated.timing(suckRotate, { toValue: 2, duration: 1400, useNativeDriver: true }),
          Animated.timing(cardOp, { toValue: 0, duration: 1600, useNativeDriver: true }),
          Animated.timing(suckY, { toValue: 1, duration: 1400, useNativeDriver: true }),
        ]),
      ]).start();

    }, 5500);

    // ── Phase 4: Analysis emerges from void ──
    addTimer(() => {
      setPhase(4);
      Animated.timing(portalOp, { toValue: 0, duration: 800, useNativeDriver: true }).start();
      Animated.timing(feedOp, { toValue: 1, duration: 1000, useNativeDriver: true }).start();

      const stepTimersLocal = [];
      STEPS.forEach((s, i) => {
        const t = addTimer(() => {
          setStep(i);
          setHighlight(s.highlight);
        }, 600 + i * 1400);
        stepTimersLocal.push(t);
      });
      return () => stepTimersLocal.forEach(clearTimeout);
    }, 7500);

    // ── Phase 5: Insight ──
    addTimer(() => {
      setPhase(5);
    }, 7500 + STEPS.length * 1400 + 1200);

    // ── Phase 6: Final ──
    addTimer(() => {
      setPhase(6);
      Animated.timing(doneOp, { toValue: 1, duration: 1200, useNativeDriver: true }).start();
      // Loop after 4s pause
      addTimer(() => {
        // Reset all values
        uploadOp.setValue(0);
        cardOp.setValue(0);
        scrDrop.setValue(0);
        suckScale.setValue(1);
        suckRotate.setValue(0);
        suckY.setValue(0);
        portalScale.setValue(0);
        portalOp.setValue(0);
        portalGlow.setValue(0);
        ringScale.setValue(0);
        flashOp.setValue(0);
        feedOp.setValue(0);
        doneOp.setValue(0);
        setStep(-1);
        setHighlight(null);
        setPhase(0);
        runSequence();
      }, 4000);
    }, 7500 + STEPS.length * 1400 + 5500);
  };

  const renderParticles = () => particleDists.map((d, i) => {
    const angle = (i / particleDists.length) * 360;
    const rad = (angle * Math.PI) / 180;
    const r = 80;
    return (
      <Animated.View key={i} style={{
        position: 'absolute', width: 3, height: 3, borderRadius: 1.5,
        backgroundColor: 'rgba(232,168,50,0.6)',
        left: '50%', top: '50%',
        marginLeft: -1.5, marginTop: -1.5,
        opacity: portalOp,
        transform: [
          { translateX: d.interpolate({inputRange:[0,1],outputRange:[0, Math.cos(rad)*r]}) },
          { translateY: d.interpolate({inputRange:[0,1],outputRange:[0, Math.sin(rad)*r]}) },
        ],
      }} />
    );
  });

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>

      {/* ── Phase 1: "Upload your screenshot" centered ── */}
      {phase === 1 && (
        <Animated.View style={{ alignItems: 'center', opacity: uploadOp }}>
          <View style={styles.vdUploadDot} />
          <Text style={styles.vdUploadLabel}>Upload your screenshot</Text>
          <Text style={styles.vdUploadSub}>I'll do the rest</Text>
        </Animated.View>
      )}

      {/* ── Flash — white burst when void opens ── */}
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#fff', opacity: flashOp }]} pointerEvents="none" />

      {/* ── Void portal + particles — full overlay ── */}
      <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]} pointerEvents="none">
        {/* Outer gravitational ring */}
        <Animated.View style={{
          position: 'absolute', width: 20, height: 20, borderRadius: 10,
          borderWidth: 1.5, borderColor: 'rgba(232,168,50,0.2)',
          opacity: portalOp,
          transform: [{ scale: ringScale }],
        }} />
        {/* Inner portal */}
        <Animated.View style={{
          width: 40, height: 40, borderRadius: 20,
          backgroundColor: '#000',
          borderWidth: 1.5, borderColor: 'rgba(232,168,50,0.3)',
          opacity: portalOp,
          transform: [{ scale: portalScale }],
        }} />
        <View style={{ position: 'absolute', width: 0, height: 0, zIndex: 2 }}>
          {renderParticles()}
        </View>
      </View>

      {/* ── Phase 2-3: Fake screenshot centered ── */}
      {(phase >= 2 && phase <= 3) && (
        <Animated.View style={[styles.vdCard, {
          opacity: cardOp,
          transform: [
            { translateY: scrDrop.interpolate({inputRange:[0,0.4,1],outputRange:[50,15,0]}) },
            { scale: suckScale },
            { rotate: suckRotate.interpolate({inputRange:[0,1],outputRange:['0deg','15deg']}) },
            { translateY: suckY.interpolate({inputRange:[0,1],outputRange:[0, 40]}) },
          ],
        }]}>
          {/* Phone status bar */}
          <View style={styles.ssStatusBar}>
            <Text style={styles.ssStatusTime}>09:41</Text>
            <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', gap: 1 }}>
                {[1,2,3,4].map(i => <View key={i} style={[styles.ssSignalBar, { height: i * 3 + 2 }]} />)}
              </View>
              <Text style={styles.ssBattery}>95%</Text>
            </View>
          </View>

          {/* Booking content — Airbnb confirmation style */}
          <View style={styles.ssBody}>
            {/* Featured image */}
            <ImageBackground
              source={{ uri: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&q=80' }}
              style={styles.ssHero}
              resizeMode="cover"
            >
              <View style={styles.ssHeroOverlay}>
                <Text style={styles.ssHeroTag}>Confirmed</Text>
              </View>
              <View style={styles.ssHeroDots}>
                {[0,1,2,3,4].map(i => <View key={i} style={[styles.ssDot, i === 0 && { backgroundColor: '#fff' }]} />)}
              </View>
            </ImageBackground>

            {/* Title & Host */}
            <Text style={styles.ssTitle}>Split: Accommodation</Text>
            <View style={styles.ssHostRow}>
              <Text style={styles.ssHost}>Host: Maja</Text>
              <View style={styles.ssProfilePills}>
                <View style={styles.ssProfileCircle} />
                <View style={[styles.ssProfileCircle, { marginLeft: -6 }]} />
                <View style={styles.ssProfilePlaceholder}>
                  <Text style={styles.ssProfilePlaceholderIcon}>+</Text>
                </View>
              </View>
            </View>

            {/* Check-in / Check-out */}
            <View style={styles.ssCheckRow}>
              <View style={styles.ssCheckBlock}>
                <Text style={styles.ssCheckLabel}>Check-in</Text>
                <Text style={styles.ssCheckDate}>Sat 22 Aug</Text>
                <Text style={styles.ssCheckTime}>15:00</Text>
              </View>
              <View style={styles.ssCheckDivider} />
              <View style={[styles.ssCheckBlock, { alignItems: 'flex-end' }]}>
                <Text style={styles.ssCheckLabel}>Check-out</Text>
                <Text style={styles.ssCheckDate}>Fri 28 Aug</Text>
                <Text style={styles.ssCheckTime}>11:00</Text>
              </View>
            </View>

            {/* Details */}
            <View style={[styles.ssDetailRow, highlight === 'flight' && styles.ssHL]}>
              <Text style={styles.ssDetailIcon}>✈️</Text>
              <View>
                <Text style={styles.ssDetailLabel}>Flight</Text>
                <Text style={styles.ssDetailValue}>SW 482 · Milan → Split</Text>
              </View>
            </View>

            <View style={[styles.ssDetailRow, highlight === 'travellers' && styles.ssHL]}>
              <Text style={styles.ssDetailIcon}>👥</Text>
              <View>
                <Text style={styles.ssDetailLabel}>Guests</Text>
                <Text style={styles.ssDetailValue}>Luigi Rossi + 2</Text>
              </View>
            </View>

            <View style={[styles.ssDetailRow, highlight === 'dates' && styles.ssHL]}>
              <Text style={styles.ssDetailIcon}>📍</Text>
              <View>
                <Text style={styles.ssDetailLabel}>How to get there</Text>
                <Text style={styles.ssDetailValue}>Mažuranićevo šetalište 37</Text>
              </View>
            </View>

            <View style={[styles.ssDetailRow, highlight === 'hotel' && styles.ssHL, { borderBottomWidth: 0 }]}>
              <Text style={styles.ssDetailIcon}>📖</Text>
              <View>
                <Text style={styles.ssDetailLabel}>House manual</Text>
                <Text style={styles.ssDetailValue}>Wi-Fi: SkyWing_5G · Code: 4821</Text>
              </View>
            </View>

            <Text style={styles.ssRef}>Booking code: SW-2K48-7M3</Text>
          </View>

          {/* Home indicator */}
          <View style={styles.ssHomeBar} />
        </Animated.View>
      )}

      {/* ── Phase 4+: Analysis feed centered ── */}
      {phase >= 4 && (
        <View style={{ alignItems: 'center', width: '100%', maxWidth: 420 }}>
          {STEPS.map((s, i) => (
            <Animated.View key={i} style={[styles.vdStep, {
              opacity: step >= i ? 1 : 0,
              transform: [{ translateX: step >= i ? 0 : -10 }],
            }]}>
              <View style={[styles.vdStepDot, step > i && styles.vdStepDone]}>
                {step > i && <Text style={styles.vdStepCheck}>✓</Text>}
                {step === i && phase >= 4 && (
                  <View style={styles.vdStepPulse} />
                )}
              </View>
              <Text style={[styles.vdStepText, step === i && styles.vdStepActive]}>{s.label}</Text>
            </Animated.View>
          ))}

          {/* Insight */}
          {phase >= 5 && (
            <Animated.View style={[styles.vdInsight, { opacity: doneOp }]}>
              <Text style={styles.vdInsightIcon}>⚠️</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.vdInsightTitle}>Heavy rain expected on day 3</Text>
                <Text style={styles.vdInsightSub}>Indoor alternatives ready · Museum · Cooking class · Spa</Text>
              </View>
            </Animated.View>
          )}

          {/* Final */}
          {phase >= 6 && (
            <Animated.View style={{ alignItems: 'center', marginTop: 24, opacity: doneOp }}>
              <Text style={styles.vdFinal}>I'm watching your trip now.</Text>
              <TouchableOpacity onPress={onComplete} activeOpacity={0.8}>
                <View style={styles.vdCta}>
                  <Text style={styles.vdCtaText}>Start your journey →</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      )}
    </View>
  );
}

// ─── MAIN ───
export default function LandingScreen({ navigation, onLogin, onSignUp, onBookingPending }) {
  const { isLoggedIn } = useContext(AuthContext);
  const [scrollY, setScrollY] = useState(0);
  const [sceneIdx, setSceneIdx] = useState(0);
  const [uploadDone, setUploadDone] = useState(false);
  const [uploadTrigger, setUploadTrigger] = useState(0);
  const [showUpload, setShowUpload] = useState(false);
  const [liveTrigger, setLiveTrigger] = useState(0);
  const [dnaTrigger, setDnaTrigger] = useState(0);
  const [memTrigger, setMemTrigger] = useState(0);

  const handleBookingParsed = (booking) => {
    setShowUpload(false);
    // Pass the parsed booking up so it survives the sign-up/login switch and
    // HomeScreen can generate the itinerary right after auth.
    onBookingPending?.(booking);
    // On the landing screen the user is always signed out — open SIGN-UP directly.
    // Note: `onSignUp?.() || onLogin?.()` would call BOTH (undefined return value),
    // and onLogin resets the mode to 'signin' — hence the explicit if/else.
    if (onSignUp) {
      onSignUp();
    } else if (onLogin) {
      onLogin();
    }
  };

  const handleScroll = useCallback((e) => {
    const y = e.nativeEvent.contentOffset.y;
    setScrollY(y);
    setSceneIdx(Math.min(5, Math.max(0, Math.round(y / H))));
  }, []);

  const scenes = ['Arrive', 'Share', 'Ready', 'Watch', 'Learn', 'Remember'];

  // Trigger upload when scene 2 enters the viewport (once)
  const uploadFired = useRef(false);
  useEffect(() => {
    const y = scrollY;
    if (y >= H * 0.6 && y <= H * 3 && !uploadFired.current) {
      uploadFired.current = true;
      setUploadTrigger(p => p + 1);
    }
  }, [scrollY]);

  // Trigger live notifications when scene 4 enters viewport (once)
  const liveFired = useRef(false);
  useEffect(() => {
    const y = scrollY;
    if (y >= H * 2.6 && y <= H * 4 && !liveFired.current) {
      liveFired.current = true;
      setLiveTrigger(p => p + 1);
    }
  }, [scrollY]);

  return (
    <View style={styles.root}>
      <Animated.ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        pagingEnabled={false}
        decelerationRate="fast"
        snapToInterval={H}
        snapToAlignment="start"
      >
        {/* SCENE 1 — Emotion */}
        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80' }}
          style={styles.scene}
          resizeMode="cover"
        >
          <View style={[styles.sceneOverlay, { backgroundColor: 'rgba(0,0,0,0.45)' }]} />
          <HeroText onLogin={onLogin} />
        </ImageBackground>

        {/* SCENE 2 — Upload */}
        <View style={styles.scene}>
          <View style={styles.sceneInner}>
            <VoidDemo trigger={uploadTrigger} onComplete={onLogin} />
          </View>
        </View>

        {/* SCENE 3 — Dashboard */}
        <View style={styles.scene}>
          <View style={styles.sceneInner}>
            <Scene delay={200}>
              <Text style={styles.dashGreeting}>Good morning.</Text>
            </Scene>
            <Scene delay={400}>
              <View style={styles.dashRow}>
                <Text style={styles.dashDest}>Tokyo</Text>
                <Text style={styles.dashDot}>·</Text>
                <Text style={styles.dashReady}>Everything is ready</Text>
              </View>
            </Scene>
            <Scene delay={600}>
              <View style={styles.dashCard}>
                <View style={styles.dashWeather}>
                  <Text style={styles.dashWeatherIcon}>☀️</Text>
                  <View>
                    <Text style={styles.dashWeatherTemp}>26°</Text>
                    <Text style={styles.dashWeatherLabel}>Mostly sunny</Text>
                  </View>
                </View>
                <View style={styles.dashDivider} />
                <View>
                  <Text style={styles.dashNextLabel}>Next activity</Text>
                  <Text style={styles.dashNextText}>🏛️ Senso-ji Temple · 14:00</Text>
                  <Text style={styles.dashNextSub}>10 min walk · Free entry</Text>
                </View>
              </View>
            </Scene>
            <Scene delay={900}>
              <View style={styles.dashMeta}>
                <Text style={styles.dashMetaText}>📅 22 — 28 Aug</Text>
              </View>
            </Scene>
          </View>
        </View>

        {/* SCENE 4 — Live */}
        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1501601983405-7b7cab2e56c2?w=1600&q=80' }}
          style={styles.scene}
          resizeMode="cover"
        >
          <View style={styles.sceneOverlay} />
          <View style={styles.sceneInner}>
            <Scene delay={100}>
              <Text style={[styles.sceneLabel, { color: '#fff' }]}>I'll keep an eye on things.</Text>
            </Scene>
            <LiveFeed trigger={liveTrigger} />
          </View>
        </ImageBackground>

        {/* SCENE 5 — DNA */}
        <View style={styles.scene} onLayout={() => setDnaTrigger(p => p + 1)}>
          <View style={styles.sceneInner}>
            <Scene delay={100}>
              <Text style={styles.sceneLabel}>I'm getting to know you.</Text>
            </Scene>
            <TravelDNA trigger={dnaTrigger} />
          </View>
        </View>

        {/* SCENE 6 — Final */}
        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1600&q=80' }}
          style={styles.scene}
          resizeMode="cover"
          onLayout={() => setMemTrigger(p => p + 1)}
        >
          <View style={styles.sceneOverlay} />
          <View style={styles.sceneInner}>
            <Scene delay={200}>
              <Text style={styles.finalMain}>You enjoyed your holiday.</Text>
            </Scene>
            <Scene delay={500}>
              <Text style={styles.finalSub}>I enjoyed watching it.</Text>
            </Scene>
            <MemoryBubbles trigger={memTrigger} />
            <Scene delay={900}>
              <View style={{ alignItems: 'center', marginTop: 20 }}>
                <TouchableOpacity style={styles.ctaBtn} onPress={() => setShowUpload(true)} activeOpacity={0.8}>
                  <Text style={styles.ctaText}>Send me your next booking</Text>
                </TouchableOpacity>
              </View>
            </Scene>
          </View>
        </ImageBackground>
      </Animated.ScrollView>

      {/* Web-only fixed Sign in (top-right) — lives OUTSIDE the ScrollView so
          the ScrollView's tap-responder can never eat the press. */}
      {IS_WEB && (
        <TouchableOpacity
          style={styles.fixedSignIn}
          onPress={onLogin}
          onClick={onLogin}
          activeOpacity={0.7}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <Text style={styles.fixedSignInText}>Sign in</Text>
        </TouchableOpacity>
      )}

      {/* Upload modal — full-screen so the loading animation and result card are never cut */}
      <Modal visible={showUpload} animationType="slide" onRequestClose={() => setShowUpload(false)}>
        <UploadBookingScreen
          onClose={() => setShowUpload(false)}
          onBookingParsed={handleBookingParsed}
        />
      </Modal>

      {/* Scene indicator */}
      <View style={styles.progress}>
        {scenes.map((name, i) => (
          <View key={i} style={styles.progRow}>
            <View style={[styles.progDot, i <= sceneIdx && styles.progDotActive]} />
            <Text style={[styles.progLabel, i === sceneIdx && styles.progLabelActive]}>
              {name}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── STYLES ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0a' },
  scroll: { flex: 1, WebkitScrollSnapType: 'y mandatory', scrollSnapType: 'y mandatory' },
  scene: { width: '100%', height: H, justifyContent: 'center', scrollSnapAlign: 'start', WebkitScrollSnapAlign: 'start' },
  logo: { fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: -0.3 },
  signIn: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.3)' },
  fixedSignIn: {
    position: 'absolute', top: 18, right: 20, zIndex: 50,
    backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999,
  },
  fixedSignInText: { fontSize: 13, fontWeight: '600', color: '#fff' },

  sceneOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  sceneInner: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  sceneLabel: { fontSize: 15, fontWeight: '500', color: 'rgba(255,255,255,0.25)', textAlign: 'center', letterSpacing: 2, marginBottom: 20 },

  heroContainer: { ...StyleSheet.absoluteFillObject, zIndex: 10 },
  heroBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: IS_WEB ? 20 : 52, paddingBottom: 12 },
  heroCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  heroPulse: { marginTop: 32, alignItems: 'center' },
  heroDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(232,168,50,0.6)' },
  heroBottom: { position: 'absolute', bottom: 40, alignSelf: 'center' },
  heroMain: { fontSize: 48, fontWeight: '800', color: '#fff', textAlign: 'center', lineHeight: 52 },
  heroSub: { fontSize: 26, fontWeight: '300', color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 10 },
  heroHint: { fontSize: 14, color: 'rgba(255,255,255,0.1)', letterSpacing: 2 },

  // Hero invitation after fade-out
  heroInviteWrap: { alignItems: 'center', marginTop: 40 },
  heroInviteDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(232,168,50,0.5)' },
  heroInvite: { fontSize: 13, fontWeight: '300', color: 'rgba(255,255,255,0.3)', textAlign: 'center', lineHeight: 22, marginTop: 12, letterSpacing: 2 },
  heroInviteArrow: { fontSize: 16, color: 'rgba(232,168,50,0.4)' },

  // Void Screenshot Demo — V4
  vdUploadDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(232,168,50,0.3)', marginBottom: 20 },
  vdUploadLabel: { fontSize: 24, fontWeight: '700', color: '#fff', letterSpacing: -0.5, textAlign: 'center' },
  vdUploadSub: { fontSize: 15, fontWeight: '300', color: 'rgba(255,255,255,0.4)', marginTop: 8, textAlign: 'center' },
  // Fake screenshot card — iOS style
  vdCard: {
    width: 280, backgroundColor: '#f5f5f7', borderRadius: 24, overflow: 'hidden',
    boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 2px 10px rgba(0,0,0,0.3)',
  },
  ssStatusBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8, backgroundColor: '#f5f5f7' },
  ssStatusTime: { fontSize: 12, fontWeight: '700', color: '#1a1a1a', letterSpacing: 0 },
  ssSignalBar: { width: 3, borderRadius: 1.5, backgroundColor: '#1a1a1a' },
  ssBattery: { fontSize: 10, fontWeight: '600', color: '#1a1a1a' },
  ssBody: { padding: 16, backgroundColor: '#fff', marginHorizontal: 8, marginBottom: 8, borderRadius: 14 },
  ssHero: { height: 140, backgroundColor: '#e8d5c4', borderRadius: 12, marginBottom: 12, justifyContent: 'flex-end', alignItems: 'center', overflow: 'hidden' },
  ssHeroOverlay: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  ssHeroTag: { fontSize: 9, color: '#fff', fontWeight: '600' },
  ssHeroDots: { flexDirection: 'row', gap: 5, marginBottom: 8 },
  ssDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: 'rgba(255,255,255,0.5)' },
  ssTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a1a', letterSpacing: -0.3 },
  ssHostRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, marginBottom: 14 },
  ssHost: { fontSize: 13, color: 'rgba(0,0,0,0.45)' },
  ssProfilePills: { flexDirection: 'row', alignItems: 'center' },
  ssProfileCircle: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#ddd', borderWidth: 1.5, borderColor: '#fff' },
  ssProfilePlaceholder: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#e8e8e8', alignItems: 'center', justifyContent: 'center', marginLeft: -6, borderWidth: 1.5, borderColor: '#fff' },
  ssProfilePlaceholderIcon: { fontSize: 10, color: '#999', fontWeight: '700' },
  ssCheckRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#f8f8f8', borderRadius: 12, padding: 14, marginBottom: 12 },
  ssCheckBlock: { flex: 1 },
  ssCheckLabel: { fontSize: 10, color: 'rgba(0,0,0,0.35)', marginBottom: 2, letterSpacing: 0.3 },
  ssCheckDate: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  ssCheckTime: { fontSize: 11, color: 'rgba(0,0,0,0.4)', marginTop: 1 },
  ssCheckDivider: { width: 1, backgroundColor: 'rgba(0,0,0,0.08)', marginHorizontal: 14, alignSelf: 'stretch' },
  ssDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)', borderRadius: 8, paddingHorizontal: 8 },
  ssHL: { backgroundColor: 'rgba(232,168,50,0.12)', borderBottomColor: 'transparent' },
  ssDetailIcon: { fontSize: 16 },
  ssDetailLabel: { fontSize: 10, color: 'rgba(0,0,0,0.35)', marginBottom: 1 },
  ssDetailValue: { fontSize: 13, fontWeight: '600', color: '#1a1a1a' },
  ssDetailSub: { fontSize: 11, color: 'rgba(0,0,0,0.4)', marginTop: 1 },
  ssRef: { fontSize: 8, color: 'rgba(0,0,0,0.2)', textAlign: 'center', marginTop: 12, letterSpacing: 1 },
  ssHomeBar: { width: 120, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.15)', alignSelf: 'center', marginVertical: 8 },

  // Void analysis feed
  vdFeed: { width: '100%', marginTop: 24 },
  vdStep: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  vdStepDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  vdStepDone: { backgroundColor: 'rgba(34,197,94,0.15)' },
  vdStepCheck: { fontSize: 8, color: '#22c55e', fontWeight: '700' },
  vdStepPulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#e8a832' },
  vdStepText: { fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: '500' },
  vdStepActive: { color: '#fff' },

  // Insight
  vdInsight: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(232,168,50,0.06)', borderRadius: 14, padding: 14, marginTop: 12, borderWidth: 1, borderColor: 'rgba(232,168,50,0.1)' },
  vdInsightIcon: { fontSize: 18 },
  vdInsightTitle: { fontSize: 13, fontWeight: '600', color: '#e8a832', marginBottom: 2 },
  vdInsightSub: { fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 16 },
  vdFinal: { fontSize: 22, fontWeight: '400', color: '#fff', textAlign: 'center', marginBottom: 20, lineHeight: 30 },
  vdCta: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 24 },
  vdCtaText: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.6)', letterSpacing: 0.5 },

  // Dashboard
  dashGreeting: { fontSize: 34, fontWeight: '700', color: '#fff', textAlign: 'center' },
  dashRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  dashDest: { fontSize: 18, fontWeight: '600', color: '#fff' },
  dashDot: { fontSize: 18, color: 'rgba(255,255,255,0.2)' },
  dashReady: { fontSize: 16, fontWeight: '400', color: 'rgba(255,255,255,0.4)' },
  dashCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 20, padding: 20, width: '85%', maxWidth: 320, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginTop: 20 },
  dashWeather: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dashWeatherIcon: { fontSize: 28 },
  dashWeatherTemp: { fontSize: 22, fontWeight: '700', color: '#fff' },
  dashWeatherLabel: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  dashDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 14 },
  dashNextLabel: { fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, marginBottom: 4 },
  dashNextText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  dashNextSub: { fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 },
  dashMeta: { marginTop: 16 },
  dashMetaText: { fontSize: 13, color: 'rgba(255,255,255,0.3)' },

  // Live notifications
  notifCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 14, marginBottom: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  notifIcon: { fontSize: 16 },
  notifText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  notifSub: { fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 1 },

  // DNA
  dnaWrap: { width: '85%', maxWidth: 320 },
  dnaRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  dnaLeft: { alignItems: 'center', width: 16 },
  dnaDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.15)' },
  dnaDotActive: { backgroundColor: '#e8a832', width: 10, height: 10, borderRadius: 5 },
  dnaLine: { width: 1, flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 4 },
  dnaContent: { flex: 1, marginBottom: 20 },
  dnaLabel: { fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 2 },
  dnaLabelActive: { color: '#e8a832' },
  dnaText: { fontSize: 15, fontWeight: '600', color: '#fff', marginBottom: 6 },
  dnaTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  dnaTag: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  dnaTagText: { fontSize: 9, color: 'rgba(255,255,255,0.45)' },
  dnaConclusion: { fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 10, fontWeight: '400' },

  // Final
  finalMain: { fontSize: 34, fontWeight: '700', color: '#fff', textAlign: 'center', lineHeight: 42 },
  finalSub: { fontSize: 22, fontWeight: '400', color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 4 },
  memWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 20 },
  memBubble: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, paddingVertical: 8, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  memText: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  ctaBtn: { backgroundColor: Colors.gold, paddingHorizontal: 36, paddingVertical: 16, borderRadius: 26 },
  ctaText: { fontSize: 15, fontWeight: '800', color: Colors.brown },

  // Progress
  progress: { position: 'absolute', right: 12, top: '50%', transform: [{ translateY: -70 }], gap: 10, zIndex: 50, alignItems: 'flex-end' },
  progRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  progDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)' },
  progDotActive: { width: 3, height: 14, borderRadius: 2, backgroundColor: Colors.gold },
  progLabel: { fontSize: 8, color: 'transparent', fontWeight: '600', letterSpacing: 1 },
  progLabelActive: { color: 'rgba(255,255,255,0.3)' },
});
