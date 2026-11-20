// Tokens from the "Online Fitting App — Mobile UI" design canvas.
export const colors = {
  ink: '#111114',
  text: '#2B2B33',
  muted: '#55555F',
  placeholder: '#8A8A94',
  border: '#D9D9E0',
  divider: '#E4E4EA',
  field: '#FAFAFB',
  surface: '#F4F4F6',
  white: '#FFFFFF',
  accent: '#5B3DF5',
  accentText: '#4A2FE0',
  accentSoft: '#F3F1FF',
  accentTint: '#EDEBFA',
  success: '#1F7A4D',
  successBright: '#2FBF71',
  danger: '#B42318',
  dangerSoft: '#FEF3F2',
  warning: '#FFC46B',
  dark: '#111114',
  darkRaised: '#1C1C21',
  darkMuted: '#C9C9D2',
} as const;

export const radius = { sm: 12, md: 14, lg: 16, xl: 20 } as const;

export const space = { xs: 6, sm: 8, md: 12, lg: 16, xl: 24 } as const;

export const type = {
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.4, color: colors.ink },
  hero: { fontSize: 34, fontWeight: '700', letterSpacing: -0.5, lineHeight: 38, color: colors.ink },
  body: { fontSize: 15, lineHeight: 22, color: colors.muted },
  label: { fontSize: 14, fontWeight: '600', color: colors.ink },
  small: { fontSize: 13, lineHeight: 18, color: colors.muted },
} as const;
