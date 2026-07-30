import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Platform
} from 'react-native';
import { Colors } from '../theme/colors';

const STEPS = ['Style', 'Vibes', 'Vibe', 'Wish'];

const STYLE_OPTIONS = [
  { id: 'relaxed', icon: '😌', label: 'Relaxed', desc: 'Slow mornings, chill evenings' },
  { id: 'balanced', icon: '⚖️', label: 'Balanced', desc: 'Mix of chill & explore' },
  { id: 'adventure', icon: '🏔️', label: 'Adventure', desc: 'Hiking, action, explore' },
  { id: 'cultural', icon: '🎭', label: 'Cultural', desc: 'Museums, history, art' },
];

const INTEREST_OPTIONS = [
  { id: 'food', icon: '🍝', label: 'Food & wine' },
  { id: 'nature', icon: '🌿', label: 'Nature & outdoors' },
  { id: 'history', icon: '🏛️', label: 'History & culture' },
  { id: 'shopping', icon: '🛍️', label: 'Shopping' },
  { id: 'nightlife', icon: '🍸', label: 'Nightlife' },
  { id: 'beach', icon: '🏖️', label: 'Beach & relax' },
  { id: 'photography', icon: '📸', label: 'Photography' },
  { id: 'sports', icon: '⚽', label: 'Sports & active' },
];

const VIBE_OPTIONS = [
  { id: 'budget', icon: '💰', label: 'Budget', desc: 'Save money, street food' },
  { id: 'moderate', icon: '💵', label: 'Moderate', desc: 'Good balance quality/price' },
  { id: 'luxury', icon: '💎', label: 'Luxury', desc: 'Fine dining, premium spots' },
];

export default function PreferenceQuiz({ onSubmit, onSkip }) {
  const [step, setStep] = useState(0);
  const [style, setStyle] = useState(null);
  const [interests, setInterests] = useState([]);
  const [vibe, setVibe] = useState(null);
  const [wish, setWish] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());

  const toggleInterest = (id) => {
    setInterests(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      onSubmit({ style, interests, vibe, wish, year });
    }
  };

  const canContinue = () => {
    if (step === 0) return style !== null;
    if (step === 1) return interests.length > 0;
    if (step === 2) return vibe !== null;
    return true; // wish is optional
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        {/* Steps indicator */}
        <View style={styles.stepsRow}>
          {[0, 1, 2, 3].map(i => (
            <View key={i} style={[styles.stepDot, i <= step && styles.stepDotActive]} />
          ))}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>

          {/* Step 0: Style */}
          {step === 0 && (
            <>
              <Text style={styles.question}>What's your travel style?</Text>
              <Text style={styles.sub}>Choose how you like to travel</Text>
              <View style={styles.optionsGrid}>
                {STYLE_OPTIONS.map(o => (
                  <TouchableOpacity
                    key={o.id}
                    style={[styles.optionCard, style === o.id && styles.optionCardActive]}
                    onPress={() => setStyle(o.id)}
                  >
                    <Text style={styles.optionIcon}>{o.icon}</Text>
                    <Text style={[styles.optionLabel, style === o.id && styles.optionLabelActive]}>{o.label}</Text>
                    <Text style={styles.optionDesc}>{o.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Step 1: Interests */}
          {step === 1 && (
            <>
              <Text style={styles.question}>What do you love?</Text>
              <Text style={styles.sub}>Pick your interests (at least one)</Text>
              <View style={styles.chipsGrid}>
                {INTEREST_OPTIONS.map(o => (
                  <TouchableOpacity
                    key={o.id}
                    style={[styles.chip, interests.includes(o.id) && styles.chipActive]}
                    onPress={() => toggleInterest(o.id)}
                  >
                    <Text style={styles.chipIcon}>{o.icon}</Text>
                    <Text style={[styles.chipLabel, interests.includes(o.id) && styles.chipLabelActive]}>{o.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Step 2: Vibe */}
          {step === 2 && (
            <>
              <Text style={styles.question}>What's your vibe?</Text>
              <Text style={styles.sub}>Set the overall experience level</Text>
              <View style={styles.optionsGrid}>
                {VIBE_OPTIONS.map(o => (
                  <TouchableOpacity
                    key={o.id}
                    style={[styles.optionCard, vibe === o.id && styles.optionCardActive]}
                    onPress={() => setVibe(o.id)}
                  >
                    <Text style={styles.optionIcon}>{o.icon}</Text>
                    <Text style={[styles.optionLabel, vibe === o.id && styles.optionLabelActive]}>{o.label}</Text>
                    <Text style={styles.optionDesc}>{o.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Step 3: Custom wish — free text */}
          {step === 3 && (
            <>
              <Text style={styles.question}>What do you dream of?</Text>
              <Text style={styles.sub}>
                Tell Grillo what you'd love to do.{'\n'}This is the most important question!
              </Text>
              <TextInput
                style={styles.wishInput}
                placeholder="e.g. I want to eat at a Michelin-star restaurant, watch the sunset from a boat, and visit a local market..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={wish}
                onChangeText={setWish}
                multiline
                textAlignVertical="top"
                maxLength={500}
              />
              <Text style={styles.wishHint}>
                Be as specific as you want ✨{'\n'}Grillo will build your perfect itinerary around it.
              </Text>

              {/* Year selector — compact row */}
              <View style={styles.yearRow}>
                <Text style={styles.yearLabel}>When?</Text>
                <View style={styles.yearPills}>
                  {[new Date().getFullYear(), new Date().getFullYear() + 1, new Date().getFullYear() + 2].map(y => (
                    <TouchableOpacity
                      key={y}
                      style={[styles.yearPill, year === y && styles.yearPillActive]}
                      onPress={() => setYear(y)}
                    >
                      <Text style={[styles.yearPillText, year === y && styles.yearPillTextActive]}>{y}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          )}
        </ScrollView>

        {/* Buttons */}
        <View style={styles.btnRow}>
          {step === 0 ? (
            <TouchableOpacity style={styles.skipBtn} onPress={onSkip}>
              <Text style={styles.skipText}>Skip all</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.skipBtn} onPress={() => setStep(step - 1)}>
              <Text style={styles.skipText}>← Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.nextBtn, !canContinue() && styles.nextBtnDisabled]}
            onPress={handleNext}
            disabled={!canContinue()}
          >
            <Text style={styles.nextText}>
              {step === 3 ? '✨ Create my itinerary!' : 'Next →'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center', paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#1a1a1a', borderRadius: 24, padding: 24,
    borderWidth: 1, borderColor: 'rgba(232,168,50,0.15)',
  },
  stepsRow: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 20 },
  stepDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.15)',
  },
  stepDotActive: { backgroundColor: Colors.gold, width: 24, borderRadius: 4 },
  scroll: { maxHeight: 360 },
  question: {
    fontSize: 20, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 6,
  },
  sub: {
    fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: 20,
  },

  // Option cards
  optionsGrid: { gap: 10, marginBottom: 8 },
  optionCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, gap: 12,
    borderWidth: 2, borderColor: 'transparent',
  },
  optionCardActive: { borderColor: Colors.gold, backgroundColor: 'rgba(232,168,50,0.1)' },
  optionIcon: { fontSize: 28 },
  optionLabel: { fontSize: 15, fontWeight: '700', color: '#fff' },
  optionLabelActive: { color: Colors.gold },
  optionDesc: { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 1 },

  // Chips
  chipsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)',
  },
  chipActive: { borderColor: Colors.gold, backgroundColor: 'rgba(232,168,50,0.1)' },
  chipIcon: { fontSize: 16 },
  chipLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  chipLabelActive: { color: Colors.gold },

  // Wish text input (step 3)
  wishInput: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16,
    padding: 16, minHeight: 120,
    fontSize: 14, color: '#fff', lineHeight: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  wishHint: {
    fontSize: 11, color: 'rgba(255,255,255,0.35)',
    textAlign: 'center', marginTop: 12, lineHeight: 16,
  },

  // Year selector
  yearRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 12, marginTop: 16,
  },
  yearLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  yearPills: { flexDirection: 'row', gap: 8 },
  yearPill: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  yearPillActive: { borderColor: Colors.gold, backgroundColor: 'rgba(232,168,50,0.15)' },
  yearPillText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  yearPillTextActive: { color: Colors.gold, fontWeight: '700' },

  // Buttons
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  skipBtn: {
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  skipText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  nextBtn: {
    flex: 1, backgroundColor: Colors.gold, paddingVertical: 12, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  nextBtnDisabled: { opacity: 0.4 },
  nextText: { fontSize: 15, fontWeight: '700', color: Colors.brown },
});
