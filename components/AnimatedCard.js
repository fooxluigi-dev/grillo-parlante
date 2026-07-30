import React, { useEffect, useRef } from 'react';
import { Animated, TouchableOpacity, StyleSheet, Platform } from 'react-native';

export default function AnimatedCard({ children, style, onPress, delay = 0, glass = false }) {
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(20)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1, duration: 400, delay, useNativeDriver: true,
      }),
      Animated.timing(slideUp, {
        toValue: 0, duration: 400, delay, useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, friction: 3, useNativeDriver: true }).start();
  };

  const baseStyle = {
    opacity: fadeIn,
    transform: [{ translateY: slideUp }, { scale }],
  };

  const glassStyle = glass ? {
    backgroundColor: 'rgba(255,255,255,0.55)',
    ...Platform.select({
      web: { backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' },
    }),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  } : {};

  if (onPress) {
    return (
      <Animated.View style={[baseStyle, glassStyle, style]}>
        <TouchableOpacity
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.85}
          style={{ flex: 1 }}
        >
          {children}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[baseStyle, glassStyle, style]}>
      {children}
    </Animated.View>
  );
}
