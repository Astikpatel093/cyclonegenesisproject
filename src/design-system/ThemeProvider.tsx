import { useMemo, useState, useEffect, type ReactNode } from 'react';
import { colorTokens, semanticSpacing, typographyTokens, elevationTokens, motionTokens, borderRadiusTokens, breakpointTokens, zIndexTokens } from './tokens';
import { ThemeContext, type ThemeMode } from './themeContext';
interface ThemeProviderProps {
  children: ReactNode;
  defaultMode?: ThemeMode;
  storageKey?: string;
}

export function ThemeProvider({ children, defaultMode = 'system', storageKey = 'cyclone-ai-theme' }: ThemeProviderProps) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(storageKey) as ThemeMode) || defaultMode;
    }
    return defaultMode;
  });

  const [resolvedMode, setResolvedMode] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const updateResolvedMode = () => {
      if (mode === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setResolvedMode(prefersDark ? 'dark' : 'light');
      } else {
        setResolvedMode(mode);
      }
    };

    updateResolvedMode();

    if (mode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', updateResolvedMode);
      return () => mediaQuery.removeEventListener('change', updateResolvedMode);
    }
  }, [mode]);

  useEffect(() => {
    const root = document.documentElement;
    const colors = resolvedMode === 'dark' ? colorTokens.semanticDark : colorTokens.semanticLight;

    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value);
    });

    root.setAttribute('data-theme', resolvedMode);
    root.setAttribute('data-theme-mode', mode);

    localStorage.setItem(storageKey, mode);
  }, [mode, resolvedMode, storageKey]);

  const toggleTheme = () => {
    setMode(prev => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'system';
      return 'light';
    });
  };

  const setTheme = (newMode: ThemeMode) => {
    setMode(newMode);
  };

  const contextValue = useMemo(() => ({
    mode,
    resolvedMode,
    toggleTheme,
    setTheme,
    colors: resolvedMode === 'dark' ? colorTokens.semanticDark : colorTokens.semanticLight,
    spacing: semanticSpacing,
    typography: typographyTokens.styles,
    elevation: elevationTokens,
    motion: motionTokens,
    borderRadius: borderRadiusTokens,
    breakpoints: breakpointTokens,
    zIndex: zIndexTokens,
  }), [mode, resolvedMode]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

