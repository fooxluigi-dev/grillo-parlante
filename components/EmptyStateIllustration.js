import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Colors } from '../theme/colors';

const ILLUSTRATIONS = {
  trip: {
    icon: '✈️',
    bg: ['#fff3e0', '#ffcc80'],
    label: 'Plan your first trip',
  },
  weather: {
    icon: '🌤️',
    bg: ['#e3f2fd', '#90caf9'],
    label: 'No destination yet',
  },
  tips: {
    icon: '💡',
    bg: ['#fce4ec', '#f48fb1'],
    label: 'Book a trip for tips',
  },
  chat: {
    icon: '💬',
    bg: ['#f3e5f5', '#ce93d8'],
    label: 'Start a conversation',
  },
};

export default function EmptyStateIllustration({ type, title, desc, actionLabel, onAction }) {
  const ill = ILLUSTRATIONS[type] || ILLUSTRATIONS.trip;
  const floatAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1.08, duration: 2000, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    );
    float.start();
    return () => float.stop();
  }, []);

  return (
    <View style={styles.wrapper}>
      <Animated.View style={[styles.iconCircle, { transform: [{ scale: floatAnim }] }]}>
        <Text style={styles.icon}>{ill.icon}</Text>
      </Animated.View>
      <Text style={styles.title}>{title || ill.label}</Text>
      {desc && <Text style={styles.desc}>{desc}</Text>}
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.actionBtn} onPress={onAction}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', padding: 24, gap: 8 },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.glassGold,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  icon: { fontSize: 36 },
  title: { fontSize: 18, fontWeight: '800', color: Colors.brown, textAlign: 'center' },
  desc: { fontSize: 13, color: Colors.sand, textAlign: 'center', lineHeight: 19, paddingHorizontal: 20 },
  actionBtn: {
    backgroundColor: Colors.terra, paddingVertical: 10, paddingHorizontal: 24,
    borderRadius: 24, marginTop: 4,
  },
  actionText: { fontSize: 14, fontWeight: '700', color: Colors.white },
});
