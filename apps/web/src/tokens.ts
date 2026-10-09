/**
 * Verma Design Tokens
 * Source of truth: docs/design-system.md & Figma nodes 26:125, 10:84
 */

export const colors = {
  brandOrange: '#FE820E',
  brandPeriwinkle: '#607FF3',
  canvas: '#F7EDE3',
  text: '#292621',
  textMuted: '#716A61',
  border: '#DED4CA',
  paper: '#FFFCF8',
  surface: '#FFFFFF',
  assistSurface: '#E8EAFE',
  warmSurface: '#FFE0BF',
} as const;

export const spacing = {
  space1: '4px',
  space2: '8px',
  space3: '12px',
  space4: '16px',
  space5: '20px',
  space6: '24px',
  space8: '32px',
  space10: '40px',
  space12: '48px',
  space16: '64px',
} as const;

export const radius = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '24px',
  xl: '32px',
  '2xl': '40px',
  pill: '999px',
} as const;

export const typography = {
  display: '"Fredoka", sans-serif',
  sans: '"Parkinsans", "Google Sans", system-ui, sans-serif',
  mono: '"IBM Plex Mono", ui-monospace, monospace',
} as const;

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  desktopRef: '1312px',
} as const;

export const elevation = {
  borderSubtle: '1px solid #DED4CA',
  shadowDemo: '0 12px 32px rgba(41, 38, 33, 0.07)',
} as const;

export const motion = {
  press: '120ms',
  small: '160ms',
  standard: '220ms',
  easeOut: 'cubic-bezier(0.23, 1, 0.32, 1)',
  easeInOut: 'cubic-bezier(0.77, 0, 0.175, 1)',
} as const;
