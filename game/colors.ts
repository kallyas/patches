/**
 * Soft, calming pastel palette for placed patches. Each patch gets a color
 * based on its index. Palette has 12 entries — far more than the max ~12
 * patches a 6x6 grid produces.
 */
/**
 * Saturated chip colors. Used both for the clue chip (number on color) and
 * the placed patch fill. Patch fill is rendered at lower opacity so the chip
 * pops within the placed patch.
 */
export const PATCH_COLORS_LIGHT = [
  '#E5615C', // coral red
  '#3FA9C9', // teal
  '#5BA56C', // green
  '#E89B4A', // amber
  '#3D8DD9', // blue
  '#C7973A', // mustard
  '#7B6BD0', // violet
  '#1F3A6B', // navy
  '#5FA28A', // sage
  '#9C7561', // taupe
  '#D78CB0', // pink
  '#7A8893', // slate
] as const;

export const PATCH_COLORS_DARK = [
  '#E5615C',
  '#3FA9C9',
  '#5BA56C',
  '#E89B4A',
  '#3D8DD9',
  '#C7973A',
  '#7B6BD0',
  '#3F5C8C',
  '#5FA28A',
  '#9C7561',
  '#D78CB0',
  '#9CABB7',
] as const;

/**
 * Soft fill colors used as the patch background — same hue as the chip but
 * pastel. Pre-mixed (rather than alpha) so they look right against any
 * board background.
 */
export const PATCH_FILLS_LIGHT = [
  '#FAD9D7',
  '#D6ECF3',
  '#DBEDDF',
  '#FAE3CC',
  '#D5E3F5',
  '#F0E1BE',
  '#DDD8F0',
  '#C9D2E0',
  '#D9EAE3',
  '#E5DAD3',
  '#F4DDE7',
  '#DDE2E6',
] as const;

export const PATCH_FILLS_DARK = [
  '#3F2421',
  '#1E3540',
  '#23382A',
  '#3D2C1B',
  '#1E2D43',
  '#3A2F1A',
  '#26213D',
  '#1A2333',
  '#1F3530',
  '#2E251F',
  '#3A2230',
  '#222830',
] as const;

export function patchColor(index: number, scheme: 'light' | 'dark'): string {
  const palette = scheme === 'dark' ? PATCH_COLORS_DARK : PATCH_COLORS_LIGHT;
  return palette[index % palette.length];
}

export function patchFill(index: number, scheme: 'light' | 'dark'): string {
  const palette = scheme === 'dark' ? PATCH_FILLS_DARK : PATCH_FILLS_LIGHT;
  return palette[index % palette.length];
}

/** Game-specific theme colors layered on top of the existing app theme. */
export const GameColors = {
  light: {
    bg: '#F4F1EA',
    surface: '#FFFFFF',
    cellBorder: '#E5E0D8',
    cellBg: '#FBFAF5',
    gridLine: 'rgba(0,0,0,0.07)',
    text: '#1F2024',
    textMuted: '#6E6A60',
    accent: '#0A66C2', // LinkedIn-ish blue
    accentSoft: '#E1EEF9',
    danger: '#C2410C',
    dangerSoft: '#FCE7DA',
    success: '#15803D',
    dragValid: 'rgba(34, 197, 94, 0.22)',
    dragInvalid: 'rgba(239, 68, 68, 0.22)',
    dragValidBorder: '#22C55E',
    dragInvalidBorder: '#EF4444',
  },
  dark: {
    bg: '#0F1115',
    surface: '#161A20',
    cellBorder: '#272C34',
    cellBg: '#1A1F26',
    gridLine: 'rgba(255,255,255,0.06)',
    text: '#ECEDEE',
    textMuted: '#9BA1A6',
    accent: '#4D9EE8',
    accentSoft: '#1E2A3A',
    danger: '#F97316',
    dangerSoft: '#3A2218',
    success: '#22C55E',
    dragValid: 'rgba(34, 197, 94, 0.30)',
    dragInvalid: 'rgba(239, 68, 68, 0.32)',
    dragValidBorder: '#22C55E',
    dragInvalidBorder: '#EF4444',
  },
};

export type GameColorScheme = keyof typeof GameColors;
