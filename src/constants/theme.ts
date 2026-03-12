// ─── Dark Theme Colors ────────────────────────────────────────────────────────
export const darkColors = {
  bg: '#0D0F14',
  surface: '#161923',
  surfaceElevated: '#1E2330',
  border: '#252A38',
  borderFocus: '#6C63FF',
  primary: '#6C63FF',
  primaryLight: '#8B85FF',
  accent: '#00D9AA',
  textPrimary: '#F0F2FF',
  textSecondary: '#8892AA',
  textMuted: '#535D78',
  error: '#FF4D6D',
  success: '#00D9AA',
  warning: '#FF8C42',
  lab: '#A855F7',
  tut: '#3B82F6',
  elective: '#F59E0B',
  project: '#10B981',
} as const;

// ─── Light Theme Colors ───────────────────────────────────────────────────────
export const lightColors = {
  bg: '#F5F7FF',
  surface: '#FFFFFF',
  surfaceElevated: '#EEF0FF',
  border: '#DDE1F0',
  borderFocus: '#6C63FF',
  primary: '#6C63FF',
  primaryLight: '#8B85FF',
  accent: '#00B899',
  textPrimary: '#0D0F14',
  textSecondary: '#4A5268',
  textMuted: '#9099B0',
  error: '#FF4D6D',
  success: '#00B899',
  warning: '#FF8C42',
  lab: '#A855F7',
  tut: '#3B82F6',
  elective: '#F59E0B',
  project: '#10B981',
} as const;

export const Colors = {
  light: lightColors,
  dark: darkColors,
};

export type ThemeColor = keyof (typeof lightColors);

// ─── Spacing ──────────────────────────────────────────────────────────────────
export const Spacing = {
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 20,
  six: 24,
  seven: 28,
  eight: 32,
  nine: 36,
  ten: 40,
};

// ─── Layout ───────────────────────────────────────────────────────────────────
export const BottomTabInset = 20;
export const MaxContentWidth = 1200;

// ─── Border Radius ────────────────────────────────────────────────────────────
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999,
} as const;

// ─── Department Options ───────────────────────────────────────────────────────
export const DEPARTMENT_OPTIONS = [
  { label: 'CSE', value: 'cse', icon: { family: 'MaterialCommunityIcons', name: 'laptop' } },
  { label: 'IT', value: 'it', icon: { family: 'MaterialCommunityIcons', name: 'web' } },
  { label: 'ECE', value: 'ece', icon: { family: 'MaterialCommunityIcons', name: 'satellite-variant' } },
  { label: 'Electrical', value: 'electrical', icon: { family: 'MaterialCommunityIcons', name: 'flash' } },
  { label: 'Mechanical', value: 'mechanical', icon: { family: 'MaterialCommunityIcons', name: 'cog' } },
  { label: 'Civil', value: 'civil', icon: { family: 'MaterialCommunityIcons', name: 'bridge' } },
  { label: 'Applied Science', value: 'appliedscience', icon: { family: 'MaterialCommunityIcons', name: 'chart-bar' } },
  { label: 'BCA', value: 'bca', icon: { family: 'MaterialCommunityIcons', name: 'school' } },
] as const;

export const DEPT_LABELS: Record<string, string> = {
  cse: 'Computer Science',
  it: 'Information Technology',
  ece: 'Electronics & Comm.',
  electrical: 'Electrical Engg.',
  mechanical: 'Mechanical Engg.',
  civil: 'Civil Engg.',
  ca: 'Computer Applications',
  bca: 'BCA',
  appliedscience: 'Applied Science',
};

// ─── Timetable Constants ──────────────────────────────────────────────────────
export const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;
export const TIME_SLOTS = ['08:30', '09:30', '10:30', '11:30', '12:30', '13:30', '14:30', '15:30'] as const;

export const Fonts = {
  mono: 'monospace',
};