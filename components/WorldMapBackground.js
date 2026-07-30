import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';

const { width: W, height: H } = Dimensions.get('window');

// Realistic continent outlines (simplified but recognizable)
const CONTINENTS = [
  // North America
  { d: 'M 95 55 L 105 50 L 115 48 L 125 50 L 130 55 L 128 65 L 120 75 L 115 85 L 118 95 L 125 100 L 130 105 L 128 115 L 120 120 L 110 118 L 105 112 L 95 110 L 88 105 L 82 98 L 78 88 L 80 78 L 85 68 L 90 60 Z', name: 'NA' },
  // South America
  { d: 'M 115 130 L 125 128 L 132 135 L 135 145 L 133 158 L 128 168 L 120 175 L 115 178 L 110 175 L 108 165 L 110 152 L 112 140 Z', name: 'SA' },
  // Europe
  { d: 'M 190 55 L 200 50 L 210 52 L 218 58 L 220 68 L 215 75 L 208 78 L 200 76 L 195 72 L 192 65 Z', name: 'EU' },
  // Africa
  { d: 'M 205 85 L 215 82 L 225 85 L 230 95 L 232 108 L 228 120 L 220 128 L 212 132 L 205 128 L 200 118 L 198 105 L 200 92 Z', name: 'AF' },
  // Asia
  { d: 'M 228 50 L 245 42 L 265 40 L 280 45 L 290 55 L 295 68 L 290 80 L 280 88 L 265 92 L 248 90 L 235 82 L 228 72 L 225 60 Z', name: 'AS' },
  // India
  { d: 'M 265 92 L 275 90 L 280 100 L 278 112 L 272 118 L 265 115 L 260 108 L 258 100 Z', name: 'IN' },
  // Australia
  { d: 'M 320 155 L 330 150 L 342 152 L 348 160 L 345 170 L 338 175 L 328 174 L 320 168 Z', name: 'AU' },
  // Greenland
  { d: 'M 130 35 L 140 30 L 150 33 L 155 42 L 150 48 L 140 50 L 132 45 Z', name: 'GL' },
  // UK
  { d: 'M 180 45 L 186 42 L 190 46 L 188 52 L 183 54 L 180 50 Z', name: 'UK' },
  // Japan
  { d: 'M 305 60 L 310 58 L 312 65 L 310 72 L 306 70 Z', name: 'JP' },
  // Madagascar
  { d: 'M 242 130 L 248 128 L 250 136 L 247 142 L 242 140 Z', name: 'MD' },
  // Southeast Asia islands
  { d: 'M 285 115 L 292 112 L 296 118 L 292 122 L 286 120 Z', name: 'SEA1' },
  { d: 'M 298 120 L 305 118 L 308 125 L 302 128 L 297 125 Z', name: 'SEA2' },
  // New Zealand
  { d: 'M 360 178 L 365 176 L 366 182 L 362 185 Z', name: 'NZ' },
];

// Small islands as dots
const DOTS = [
  [175, 65], [178, 70], // Iceland area
  [155, 55], // Norway
  [110, 48], // Hudson Bay
  [95, 42], // Alaska
  [140, 70], // Newfoundland
  [225, 108], // Madagascar area
  [185, 52], // Ireland
  [260, 48], // Kamchatka
  [295, 82], // Korea
  [315, 108], // PNG area
  [200, 80], // Mediterranean
  [195, 84], // Italy
  [202, 78], // Spain
  [340, 165], // Tasmania
  [92, 132], // Falklands
  [125, 142], // South Georgia
  [210, 135], // Cape
  [310, 92], // Philippines
  [175, 85], // Sahara
];

// Grid dots for ocean texture
const OCEAN_DOTS = [];
for (let i = 0; i < 60; i++) {
  OCEAN_DOTS.push([
    20 + Math.random() * 360,
    20 + Math.random() * 300,
    0.5 + Math.random() * 1.5,
  ]);
}

export default function WorldMapBackground({ opacity = 0.07 }) {
  const driftX = useRef(new Animated.Value(0)).current;
  const driftY = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const xAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(driftX, { toValue: 25, duration: 20000, useNativeDriver: true }),
        Animated.timing(driftX, { toValue: -10, duration: 25000, useNativeDriver: true }),
        Animated.timing(driftX, { toValue: 0, duration: 22000, useNativeDriver: true }),
      ])
    );
    const yAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(driftY, { toValue: 12, duration: 28000, useNativeDriver: true }),
        Animated.timing(driftY, { toValue: -8, duration: 22000, useNativeDriver: true }),
        Animated.timing(driftY, { toValue: 0, duration: 20000, useNativeDriver: true }),
      ])
    );
    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.94, duration: 15000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 15000, useNativeDriver: true }),
      ])
    );
    xAnim.start();
    yAnim.start();
    pulseAnim.start();
    return () => { xAnim.stop(); yAnim.stop(); pulseAnim.stop(); };
  }, []);

  const color = '#8a7a68';
  const mapScale = 1.2;

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        {
          opacity,
          transform: [
            { translateX: driftX },
            { translateY: driftY },
            { scale: pulse },
          ],
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
      ]}
      pointerEvents="none"
    >
      <Svg width={W * mapScale} height={H * mapScale} viewBox="0 0 400 310">
        {/* Ocean dots */}
        {OCEAN_DOTS.map(([x, y, r], i) => (
          <G key={`od${i}`}>
            <circle cx={x} cy={y} r={r} fill={color} opacity={0.08} />
          </G>
        ))}

        {/* Continents */}
        {CONTINENTS.map((c, i) => (
          <G key={c.name}>
            <Path d={c.d} fill={color} opacity={0.5} stroke={color} strokeWidth={0.3} strokeOpacity={0.5} />
          </G>
        ))}

        {/* Island dots */}
        {DOTS.map(([x, y], i) => (
          <G key={`dot${i}`}>
            <circle cx={x} cy={y} r={1.5} fill={color} opacity={0.35} />
          </G>
        ))}

        {/* Second copy offset */}
        <G opacity={0.25} transform="translate(250, 50)">
          {CONTINENTS.slice(0, 5).map((c, i) => (
            <Path key={`c2_${i}`} d={c.d} fill={color} stroke={color} strokeWidth={0.2} />
          ))}
        </G>

        {/* Third copy */}
        <G opacity={0.15} transform="translate(-180, 150)">
          {CONTINENTS.slice(0, 4).map((c, i) => (
            <Path key={`c3_${i}`} d={c.d} fill={color} />
          ))}
        </G>
      </Svg>
    </Animated.View>
  );
}
