import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, radii, spacing, typography } from '../theme/tokens';

interface WelcomeScreenProps {
  onComplete: () => void;
}

interface Slide {
  step: string;
  badge: string;
  title: string;
  description: string;
  icon: string;
  bgColor: string;
  accentColor: string;
}

const slides: Slide[] = [
  {
    step: '01 / 03',
    badge: 'LOCAL-FIRST CIPHER',
    title: 'A password manager you do not have to learn.',
    description:
      'Encrypted local SQLite storage. Secrets stay on your hardware. Direct device-to-device sync with zero central servers.',
    icon: '🛡️',
    bgColor: colors.paper,
    accentColor: colors.brandOrange,
  },
  {
    step: '02 / 03',
    badge: 'MESSY CSV CLEANUP',
    title: 'Smart import without the headache.',
    description:
      'Organizes browser exports, detects duplicates, and auto-tags entries while keeping secret fields strictly redacted.',
    icon: '✨',
    bgColor: colors.assist,
    accentColor: colors.brandPeri,
  },
  {
    step: '03 / 03',
    badge: 'ZERO-SECRET AI',
    title: 'Ask your vault in plain English.',
    description:
      'Find credentials naturally. A local sandboxed AI searches non-secret metadata while your actual passwords stay locked.',
    icon: '🔒',
    bgColor: colors.warm,
    accentColor: colors.brandOrange,
  },
];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onComplete }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slideAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    slideAnim.setValue(0);
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 320,
      useNativeDriver: true,
    }).start();
  }, [currentSlide]);

  const slideTranslateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [60, 0],
  });
  const slideOpacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 1],
  });

  const slide = slides[currentSlide];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: slide.bgColor }]}>
      {/* Top Header */}
      <View style={styles.topRow}>
        <View style={styles.brandRow}>
          <Image
            source={require('../../assets/verma-logo.png')}
            style={styles.brandLogo}
          />
          <Text style={styles.brandWordmark}>
            Verma<Text style={{ color: slide.accentColor }}>.</Text>
          </Text>
        </View>

        <TouchableOpacity onPress={onComplete} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Main Art & Content */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: slideOpacity,
            transform: [{ translateX: slideTranslateX }],
          },
        ]}
      >
        <View style={[styles.iconCircle, { borderColor: slide.accentColor }]}>
          <Text style={styles.heroEmoji}>{slide.icon}</Text>
        </View>

        <View style={styles.textBlock}>
          <Text style={[styles.eyebrow, { color: slide.accentColor }]}>
            {slide.badge}
          </Text>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.description}>{slide.description}</Text>
        </View>
      </Animated.View>

      {/* Bottom Controls */}
      <View style={styles.footer}>
        <View style={styles.dotsRow}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentSlide && [
                  styles.dotActive,
                  { backgroundColor: slide.accentColor },
                ],
              ]}
            />
          ))}
          <Text style={styles.stepText}>{slide.step}</Text>
        </View>

        <TouchableOpacity
          onPress={handleNext}
          style={[styles.actionBtn, { backgroundColor: slide.accentColor }]}
          activeOpacity={0.8}
        >
          <Text style={styles.actionBtnText}>
            {currentSlide === slides.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
    paddingTop: 48,
    paddingBottom: 36,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandLogo: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  brandWordmark: {
    fontSize: typography.sizeXxl,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  skipBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  skipText: {
    fontSize: typography.sizeSm,
    fontWeight: '600',
    color: colors.textMuted,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxxl,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  heroEmoji: {
    fontSize: 54,
  },
  textBlock: {
    alignItems: 'center',
    textAlign: 'center',
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: -0.6,
    marginBottom: spacing.md,
  },
  description: {
    fontSize: typography.sizeBase,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 320,
  },
  footer: {
    gap: spacing.lg,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: '#D9D0C5',
  },
  dotActive: {
    width: 24,
  },
  stepText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
  actionBtn: {
    paddingVertical: 18,
    borderRadius: radii.pill,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionBtnText: {
    fontSize: typography.sizeMd,
    fontWeight: '700',
    color: colors.text,
  },
});
