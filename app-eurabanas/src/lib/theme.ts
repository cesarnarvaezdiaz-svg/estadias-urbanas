export const colors = {
  navy: "#082956",
  navyDark: "#041C3D",
  blue: "#146BC7",
  sky: "#56B8EE",
  cyan: "#DDF4FF",
  background: "#F4F8FC",
  surface: "#FFFFFF",
  surfaceMuted: "#EAF1F8",
  text: "#10233C",
  textMuted: "#65758A",
  border: "#D8E3EF",
  success: "#16805C",
  successSoft: "#DDF5EB",
  warning: "#A8650A",
  warningSoft: "#FFF0D6",
  danger: "#C44343",
  dangerSoft: "#FDE5E5",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const shadow = {
  shadowColor: "#092A55",
  shadowOpacity: 0.09,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
} as const;
