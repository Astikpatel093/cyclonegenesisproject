// Cyclone AI Design System - Theme Provider & CSS Variables Generator
import { createContext, useContext } from 'react';
import { colorTokens, semanticSpacing, typographyTokens, elevationTokens, motionTokens, borderRadiusTokens, breakpointTokens, zIndexTokens } from './tokens';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedMode: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  colors: typeof colorTokens.semanticLight | typeof colorTokens.semanticDark;
  spacing: typeof semanticSpacing;
  typography: typeof typographyTokens.styles;
  elevation: typeof elevationTokens;
  motion: typeof motionTokens;
  borderRadius: typeof borderRadiusTokens;
  breakpoints: typeof breakpointTokens;
  zIndex: typeof zIndexTokens;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export function generateCSSVariables(mode: 'light' | 'dark' = 'dark'): string {
  const colors = mode === 'dark' ? colorTokens.semanticDark : colorTokens.semanticLight;
  let css = ':root {\n';

  Object.entries(colors).forEach(([key, value]) => {
    const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    css += `  --color-${cssKey}: ${value};\n`;
  });

  Object.entries(semanticSpacing).forEach(([key, value]) => {
    if (typeof value === 'string' && (value.endsWith('px') || value.endsWith('rem') || value.endsWith('%'))) {
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      css += `  --spacing-${cssKey}: ${value};\n`;
    }
  });

  Object.entries(borderRadiusTokens).forEach(([key, value]) => {
    const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    css += `  --radius-${cssKey}: ${value};\n`;
  });

  Object.entries(zIndexTokens).forEach(([key, value]) => {
    const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    css += `  --z-${cssKey}: ${value};\n`;
  });

  css += '}\n';
  return css;
}

export function cn(...classes: (string | boolean | undefined | null | Record<string, boolean>)[]): string {
  return classes
    .flatMap(cls => {
      if (!cls) return [];
      if (typeof cls === 'string') return cls;
      if (typeof cls === 'object') return Object.entries(cls).filter(([, v]) => v).map(([k]) => k);
      return [];
    })
    .join(' ');
}

export type ResponsiveValue<T> = T | { base?: T; sm?: T; md?: T; lg?: T; xl?: T; '2xl'?: T };

export function getResponsiveValue<T>(value: ResponsiveValue<T>, breakpoint: 'base' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' = 'base'): T {
  if (typeof value !== 'object' || value === null) return value;
  const breakpoints: ('base' | 'sm' | 'md' | 'lg' | 'xl' | '2xl')[] = ['base', 'sm', 'md', 'lg', 'xl', '2xl'];
  const currentIndex = breakpoints.indexOf(breakpoint);
  const obj = value as Record<string, T | undefined>;
  for (let i = currentIndex; i >= 0; i--) {
    const bp = breakpoints[i];
    if (bp in obj && obj[bp] !== undefined) return obj[bp]!;
  }
  return obj.base as T;
}

export function fluidType(min: number, max: number, minViewport = 320, maxViewport = 1440): string {
  const slope = (max - min) / (maxViewport - minViewport);
  const intercept = min - slope * minViewport;
  return `clamp(${min}px, ${intercept.toFixed(2)}px + ${(slope * 100).toFixed(2)}vw, ${max}px)`;
}

