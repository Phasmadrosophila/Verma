export const colors = {
  brandOrange: '#FE820E',
  brandPeri: '#607FF3',
  canvas: '#F7EDE3',
  paper: '#FFFCF8',
  surface: '#FFFFFF',
  text: '#292621',
  textMuted: '#716A61',
  warm: '#FFE0BF',
  assist: '#E8EAFE',
  border: '#DED4CA',
  cardBg: '#F5F1EC',
  badgeBg: '#F6F0E8',
  inputBg: '#F5F3F0',
  danger: '#D94838',
  success: '#2E8540',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radii = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 999,
};

// Design-B preview uses Google web fonts: body 'Parkinsans', brand 'Fredoka'
// (apps/mobile-preview/index.html, --font / --brand in theme-b.css).
// Kept as 'System' here: loading real fonts in Expo Go needs expo-font + the
// .ttf files bundled in assets/. Neither the package nor the font binaries are
// in-repo, so we fall back to System (no native dev build required).
// TODO: to match the preview exactly, add expo-font + Fredoka/Parkinsans .ttf
// files to assets/, load them via useFonts(), then set the two values below to
// 'Parkinsans' / 'Fredoka'. expo-font is Expo Go compatible; no dev build needed.
export const typography = {
  fontFamily: 'System', // body — preview: 'Parkinsans'
  fontBrand: 'System', // headings/wordmark — preview: 'Fredoka'
  sizeXs: 10,
  sizeSm: 12,
  sizeBase: 14,
  sizeMd: 16,
  sizeLg: 20,
  sizeXl: 24,
  sizeXxl: 28,
  sizeDisplay: 34,
};
