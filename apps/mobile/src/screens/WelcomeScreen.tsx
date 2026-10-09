import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { Icon } from '../components/Icon';
import { colors, radii, spacing, typography } from '../theme/tokens';

interface WelcomeScreenProps {
  onComplete: () => void;
}

// Illustration SVGs mirrored from apps/mobile/assets/welcome-*.svg. Inlined and
// rendered via react-native-svg's SvgXml so they load in Expo Go without a
// metro svg transformer (importing .svg as a component needs one).
const artVault = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 300" fill="none"><path d="M63 213C22 171 53 104 103 91S148 18 217 39s104 70 88 134-46 89-122 85-95-16-120-45Z" fill="#E8EAFE"/><circle cx="277" cy="43" r="16" fill="#FE820E"/><path d="m64 57 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" fill="#292621"/><path d="M312 105h11m-5-5v10M42 215h10m-5-5v10" stroke="#607FF3" stroke-width="1.7" stroke-linecap="round"/><path d="m73 247 106-34 103 32-106 37Z" fill="#FFFCF8" stroke="#292621" stroke-width="1.5" stroke-linejoin="round"/><path d="M73 247v13l103 34v-12m0 12 106-35v-14" stroke="#292621" stroke-width="1.5" stroke-linejoin="round"/><path d="m176 282 106-37v14l-106 35Z" fill="#292621"/><path d="M108 231V121a67 67 0 0 1 134 0v110l-67 22Z" fill="#FE820E" stroke="#292621" stroke-width="1.8"/><path d="M121 226V122a54 54 0 0 1 108 0v104l-54 18Z" fill="#FFE0BF" stroke="#292621" stroke-width="1.5"/><path d="M133 220v-98a42 42 0 0 1 84 0v98l-42 14Z" fill="#FFFCF8" stroke="#292621" stroke-width="1.5"/><path d="M175 132a19 19 0 0 0-11 35l-8 36 19 11 19-11-8-36a19 19 0 0 0-11-35Z" fill="#292621"/><circle cx="220" cy="159" r="3" fill="#292621"/><path d="M122 237v-17l53 17 54-17v17l-54 19Z" fill="#292621" stroke="#292621" stroke-width="1.4"/><g transform="rotate(-12 63 145)"><rect x="24" y="122" width="80" height="49" rx="10" fill="#FFFCF8" stroke="#292621" stroke-width="1.4"/><circle cx="44" cy="146" r="10" fill="#607FF3"/><path d="m40 146 3 3 5-6" stroke="#FFFCF8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M62 138h25M62 147h17M62 154h23" stroke="#A5AEDD" stroke-width="2" stroke-linecap="round"/></g><g transform="rotate(25 278 194)"><path d="M278 153a20 20 0 0 0-10 37v48l10 7 10-7v-12h-8v-9h8v-27a20 20 0 0 0-10-37Z" fill="#607FF3" stroke="#292621" stroke-width="1.5"/><circle cx="278" cy="173" r="7" fill="#FFFCF8" stroke="#292621" stroke-width="1.3"/><path d="M274 201v34" stroke="#FFFCF8" stroke-width="1.3" stroke-linecap="round"/></g><path d="M52 265v-25m0 12c-12-1-16-9-16-17 12 1 16 10 16 17Zm0-8c11-2 15-10 14-18-10 2-15 10-14 18Z" stroke="#292621" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><path d="m293 274 10-12 8 4 17-11" stroke="#8B97C9" stroke-width="1.2"/><circle cx="293" cy="274" r="2" fill="#FFFCF8" stroke="#8B97C9"/><circle cx="328" cy="255" r="2" fill="#FFFCF8" stroke="#8B97C9"/></svg>`;
const artOrganize = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 300" fill="none"><path d="M49 213c-21-30-4-78 27-108S82 40 142 35s79 7 119 49 78 67 59 120-94 70-149 57S70 243 49 213Z" fill="#E8EAFE"/><circle cx="63" cy="51" r="12" fill="#FE820E"/><path d="m288 48 5 9 10 3-10 3-5 9-3-9-9-3 9-3Z" fill="#607FF3"/><path d="m87 182 88-38 99 31-90 44Z" fill="#FFFCF8" stroke="#292621" stroke-width="1.6" stroke-linejoin="round"/><path d="m87 182 97 37v66l-97-42Z" fill="#FE820E" stroke="#292621" stroke-width="1.6" stroke-linejoin="round"/><path d="m184 219 90-44v67l-90 43Z" fill="#607FF3" stroke="#292621" stroke-width="1.6" stroke-linejoin="round"/><path d="m99 226 22 9v10l-22-9Z" fill="#292621"/><path d="m87 182-26 25 96 38 27-26M184 219l26 21 88-45-24-20" fill="#FFE0BF" stroke="#292621" stroke-width="1.6" stroke-linejoin="round"/><g transform="rotate(-13 132 119)"><rect x="95" y="72" width="83" height="113" rx="13" fill="#FFFCF8" stroke="#292621" stroke-width="1.5"/><rect x="108" y="85" width="29" height="29" rx="9" fill="#FE820E"/><path d="M119 104v-8a4 4 0 0 1 8 0v8m-10-5h12v8h-12Z" stroke="#292621" stroke-width="1.2" stroke-linejoin="round"/><path d="M109 130h53M109 138h32" stroke="#B3AC9D" stroke-width="2" stroke-linecap="round"/><rect x="107" y="151" width="49" height="17" rx="8.5" fill="#E8EAFE"/><path d="M117 159h29" stroke="#607FF3" stroke-width="2" stroke-linecap="round"/></g><g transform="rotate(14 222 103)"><rect x="186" y="49" width="79" height="110" rx="13" fill="#FFFCF8" stroke="#292621" stroke-width="1.5"/><rect x="198" y="62" width="29" height="29" rx="9" fill="#607FF3"/><path d="M207 69h10v13h-10ZM210 73h4M210 76h4" stroke="#FFFCF8" stroke-width="1.3" stroke-linejoin="round"/><path d="M198 105h53M198 114h34" stroke="#B3AC9D" stroke-width="2" stroke-linecap="round"/><rect x="198" y="127" width="45" height="17" rx="8.5" fill="#FFE0BF"/><path d="M208 135h23" stroke="#CC6A1A" stroke-width="2" stroke-linecap="round"/></g><path d="m60 126 5 5 14-15" stroke="#292621" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="68" cy="123" r="18" stroke="#292621" stroke-width="1.2" stroke-dasharray="2 4"/><path d="M292 139v21m-10-10h21M115 41h7m-3-4v8" stroke="#292621" stroke-width="1.5" stroke-linecap="round"/><path d="M315 247c0-19 10-40 18-47m-18 37c-13-1-18-13-17-20 12 2 17 10 17 20Zm5-16c13-1 20-13 18-22-12 3-19 12-18 22Z" stroke="#292621" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="m21 190 12-12 11 4" stroke="#8B97C9" stroke-width="1.2"/><circle cx="21" cy="190" r="2" fill="#FFFCF8" stroke="#8B97C9"/></svg>`;
const artFind = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 300" fill="none"><path d="M52 204C25 161 66 93 112 59s89-40 129-2 83 62 70 117-32 85-106 89-121-11-153-59Z" fill="#FFE0BF"/><circle cx="278" cy="44" r="13" fill="#607FF3"/><path d="M180 237c71 0 123-45 123-101S251 39 180 39 53 80 53 136" stroke="#B6AC9F" stroke-width="1.1" stroke-dasharray="3 5"/><g transform="rotate(-7 133 83)"><rect x="60" y="63" width="160" height="46" rx="23" fill="#FFFCF8" stroke="#292621" stroke-width="1.5"/><circle cx="84" cy="84" r="7" stroke="#607FF3" stroke-width="1.5"/><path d="m89 90 5 5" stroke="#607FF3" stroke-width="1.5" stroke-linecap="round"/><path d="M106 82h72M106 90h47" stroke="#B6AC9F" stroke-width="2.3" stroke-linecap="round"/></g><path d="m213 197 65 60a13 13 0 0 0 18-19l-64-60Z" fill="#FE820E" stroke="#292621" stroke-width="1.7"/><path d="m220 198 11-12M277 247l7 7" stroke="#292621" stroke-width="1.7" stroke-linecap="round"/><circle cx="174" cy="157" r="68" fill="#607FF3" stroke="#292621" stroke-width="1.7"/><circle cx="174" cy="157" r="53" fill="#FFFCF8" stroke="#292621" stroke-width="1.5"/><path d="M138 127a44 44 0 0 1 39-14" stroke="#D7DCF4" stroke-width="3" stroke-linecap="round"/><rect x="144" y="135" width="60" height="46" rx="10" fill="#FFE0BF" stroke="#292621" stroke-width="1.4"/><circle cx="159" cy="156" r="6" fill="#FE820E"/><path d="M158 162v5m14-14h19m-19 8h13" stroke="#292621" stroke-width="1.5" stroke-linecap="round"/><circle cx="219" cy="111" r="19" fill="#FFFCF8" stroke="#292621" stroke-width="1.4"/><path d="m210 111 6 6 12-14" stroke="#292621" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><g transform="rotate(10 72 216)"><rect x="24" y="198" width="98" height="35" rx="17.5" fill="#FFFCF8" stroke="#292621" stroke-width="1.4"/><path d="M42 211h52M42 220h35" stroke="#A0AAD5" stroke-width="2.2" stroke-linecap="round"/></g><path d="m300 122 4 9 9 4-9 4-4 9-4-9-9-4 9-4Z" fill="#292621"/><path d="M64 147h14m-7-7v14M154 268h10m-5-5v10" stroke="#607FF3" stroke-width="1.6" stroke-linecap="round"/><circle cx="56" cy="263" r="8" fill="#FE820E"/><path d="m270 281 22-7 9-14" stroke="#8B97C9" stroke-width="1.2"/><circle cx="301" cy="260" r="2" fill="#FFFCF8" stroke="#8B97C9"/></svg>`;

interface Slide {
  art: string;
  eyebrow: string;
  title: string;
  description: string;
  /** Page background. Slides 2 and 3 flood with brand colour like the preview. */
  bg: string;
  dark: boolean;
}

const slides: Slide[] = [
  {
    art: artVault,
    eyebrow: 'A SPACE OF YOUR OWN',
    title: 'Your digital life.\nA little lighter.',
    description:
      'A home for your passwords, notes, and little digital things. Everything that matters, close to you.',
    bg: colors.paper,
    dark: false,
  },
  {
    art: artOrganize,
    eyebrow: 'LESS MESS. MORE YES.',
    title: 'A place for\nevery little thing.',
    description:
      'Bring your passwords along. A few helpful tags, a little tidying, and everything feels right at home.',
    bg: colors.brandPeri,
    dark: true,
  },
  {
    art: artFind,
    eyebrow: 'A LITTLE HELP, RIGHT HERE',
    title: 'You know the one.\nLet’s find it.',
    description:
      'A name, a memory, a few words. Find what you need with a helper that never sees your secrets.',
    bg: colors.brandOrange,
    dark: true,
  },
];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onComplete }) => {
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  const isLast = index === slides.length - 1;

  const onText = colors.text;
  const mutedText = slide.dark ? colors.text : colors.textMuted;

  const handleNext = () => {
    if (!isLast) setIndex(index + 1);
    else onComplete();
  };

  return (
    <View style={[styles.container, { backgroundColor: slide.bg }]}>
      {/* Top brand + skip */}
      <View style={styles.top}>
        <View style={styles.brandRow}>
          <View style={styles.brandBadge}>
            <Text style={styles.brandBadgeText}>V</Text>
          </View>
          <Text style={[styles.wordmark, { color: onText }]}>
            Verma<Text style={{ color: slide.dark ? colors.paper : slide.bg === colors.paper ? colors.brandOrange : colors.text }}>.</Text>
          </Text>
        </View>

        <TouchableOpacity
          onPress={onComplete}
          style={styles.skipBtn}
          activeOpacity={0.7}
        >
          <Text style={[styles.skipText, { color: mutedText }]}>Explore demo</Text>
          <Icon name="import" size={13} color={mutedText} />
        </TouchableOpacity>
      </View>

      {/* Illustration */}
      <View style={styles.illustration}>
        <SvgXml xml={slide.art} width="100%" height="100%" />
      </View>

      {/* Copy */}
      <View style={styles.copy}>
        <Text style={[styles.eyebrow, { color: slide.dark ? colors.text : '#6B726B' }]}>
          {slide.eyebrow}
        </Text>
        <Text style={[styles.title, { color: onText }]}>{slide.title}</Text>
        <Text style={[styles.description, { color: mutedText }]}>
          {slide.description}
        </Text>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <View style={styles.progressRow}>
          <Text style={[styles.progressNumber, { color: onText }]}>
            0{index + 1}
            <Text style={styles.progressTotal}> / 03</Text>
          </Text>

          <View style={styles.dots}>
            {slides.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  slide.dark && styles.dotDark,
                  i === index && styles.dotActive,
                  i === index && {
                    backgroundColor: slide.dark ? colors.text : colors.brandOrange,
                  },
                ]}
              />
            ))}
          </View>

          {index > 0 ? (
            <TouchableOpacity
              onPress={() => setIndex(index - 1)}
              style={[styles.backBtn, slide.dark && styles.backBtnDark]}
              activeOpacity={0.7}
              accessibilityLabel="Previous introduction"
            >
              <Icon name="import" size={16} color={onText} />
            </TouchableOpacity>
          ) : (
            <View style={styles.backSpace} />
          )}
        </View>

        <TouchableOpacity
          onPress={handleNext}
          style={styles.primaryBtn}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>
            {isLast ? 'Create my demo vault' : 'Get to know Verma'}
          </Text>
          <Icon name="import" size={18} color={colors.surface} />
        </TouchableOpacity>

        <Text style={[styles.hint, { color: slide.dark ? colors.text : '#837B72' }]}>
          {isLast
            ? 'Your space. Your rules. Your Verma.'
            : 'Interactive concept · use sample details only'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
    minHeight: 70,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandBadge: {
    width: 28,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandBadgeText: {
    fontSize: typography.sizeMd,
    fontWeight: '800',
    color: colors.paper,
  },
  wordmark: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.xs,
    minHeight: 44,
  },
  skipText: {
    fontSize: typography.sizeXs,
    fontWeight: '600',
  },
  illustration: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: spacing.sm,
    minHeight: 220,
  },
  copy: {
    paddingHorizontal: 28,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.8,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 29,
    lineHeight: 35,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: 13,
  },
  description: {
    fontSize: typography.sizeSm,
    lineHeight: 22,
    maxWidth: 305,
  },
  controls: {
    paddingHorizontal: 27,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    marginBottom: 13,
  },
  progressNumber: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
    width: 52,
  },
  progressTotal: {
    fontSize: 11,
    fontWeight: '600',
    color: '#83796F',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: '#D5CFC7',
  },
  dotDark: {
    backgroundColor: 'rgba(255,255,255,0.44)',
  },
  dotActive: {
    width: 22,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: '#D5CFC7',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '180deg' }],
  },
  backBtnDark: {
    borderColor: 'rgba(41,38,33,0.27)',
  },
  backSpace: {
    width: 44,
    height: 44,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.text,
    borderRadius: radii.xxl,
    paddingVertical: 16,
    paddingHorizontal: 22,
    minHeight: 51,
  },
  primaryBtnText: {
    fontSize: typography.sizeSm,
    fontWeight: '700',
    color: colors.surface,
  },
  hint: {
    fontSize: typography.sizeXs,
    marginTop: 15,
    textAlign: 'center',
  },
});
