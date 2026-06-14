/**
 * Design tokens for Madad.
 *
 * The app is intentionally a single light theme: plain white surfaces,
 * Source Sans Pro (shipped as the "Source Sans 3" Google font) everywhere.
 */

export const Colors = {
  /** App + chat surface. Plain white, per design. */
  background: '#FFFFFF',
  /** Slightly off-white for the side panel / secondary surfaces. */
  surface: '#FAFAFA',
  /** Assistant bubble fill. */
  bubbleAssistant: '#F4F4F5',
  /** User bubble fill. */
  bubbleUser: '#111111',
  /** Hairline borders. */
  border: '#ECECEC',
  /** Primary text. */
  text: '#111111',
  /** Muted text (timestamps, placeholders, secondary labels). */
  textMuted: '#8A8A8E',
  /** Text on dark fills (user bubble, primary button). */
  textInverse: '#FFFFFF',
  /** Accent used for active states + send button. */
  accent: '#111111',
  /** Active row highlight in the drawer. */
  highlight: '#F0F0F0',
  danger: '#D7263D',
} as const;

/**
 * Font family names registered via `useFonts` in the root layout.
 * Keep these strings in sync with the imports in `app/_layout.tsx`.
 */
export const Font = {
  regular: 'SourceSans3_400Regular',
  semibold: 'SourceSans3_600SemiBold',
  bold: 'SourceSans3_700Bold',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
} as const;

/** Max readable width for chat content on wide (web/tablet) screens. */
export const MaxContentWidth = 760;
