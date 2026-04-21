import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, Settings, ThemeMode } from '../lib/api';
import { APP_CONFIG } from '../config';

const THEME_STORAGE_KEY = 'app-theme-preference';

const DEFAULT_SETTINGS: Settings = {
  aiEnabled: false,
  activeProvider: 'gemini',
  aiNextBestActionEnabled: true,
  aiRiskNarrativeEnabled: true,
  aiDuplicateDetectionEnabled: true,
  aiRequireHumanApproval: true,
  privacyMode: 'public-read',
  suiteName: APP_CONFIG.appName,
  portalName: APP_CONFIG.portalName,
  logoDataUrl: '',
  primaryColor: '#002045',
  brandDarkColor: '#1A365D',
  darkPrimaryColor: '#aac7ff',
  darkBrandDarkColor: '#d6e3ff',
  customFooter: '',
  helpContactEmail: '',
  themeMode: 'system',
  heroMediaUrl: '',
  heroMediaType: 'none',
  showRefreshPermissions: true,
  showRoleDebug: false,
  showPortfolioActions: true,
};

export type ResolvedTheme = 'light' | 'dark';

function readStoredTheme(): ThemeMode | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (raw === 'system' || raw === 'light' || raw === 'dark') return raw;
  return null;
}

function resolveTheme(mode: ThemeMode | undefined): ResolvedTheme {
  const effective = mode ?? 'system';
  if (effective === 'light' || effective === 'dark') return effective;
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

function applyResolvedTheme(resolved: ResolvedTheme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.classList.toggle('light', resolved === 'light');
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;
}

export function applyBrandingToDocument(
  settings: Pick<Settings, 'primaryColor' | 'brandDarkColor' | 'darkPrimaryColor' | 'darkBrandDarkColor' | 'themeMode'>,
  themeOverride?: ThemeMode,
): ResolvedTheme {
  if (typeof document === 'undefined') return 'light';
  const mode = themeOverride ?? settings.themeMode ?? 'system';
  const resolved = resolveTheme(mode);
  applyResolvedTheme(resolved);
  const root = document.documentElement;
  const lightPrimary = settings.primaryColor || DEFAULT_SETTINGS.primaryColor;
  const lightDark = settings.brandDarkColor || DEFAULT_SETTINGS.brandDarkColor;
  const darkPrimary = settings.darkPrimaryColor || DEFAULT_SETTINGS.darkPrimaryColor || lightPrimary;
  const darkHeadline = settings.darkBrandDarkColor || DEFAULT_SETTINGS.darkBrandDarkColor || lightDark;
  root.style.setProperty('--brand-primary', resolved === 'dark' ? (darkPrimary as string) : lightPrimary);
  root.style.setProperty('--brand-dark', resolved === 'dark' ? (darkHeadline as string) : lightDark);
  return resolved;
}

export type Branding = {
  suiteName: string;
  portalName: string;
  logoUrl: string;
};

type BrandingContextValue = {
  settings: Settings;
  setSettings: (next: Settings) => void;
  refreshSettings: () => Promise<void>;
  branding: Branding;
  themeMode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setThemeMode: (next: ThemeMode) => void;
};

const BrandingContext = createContext<BrandingContextValue | null>(null);

function buildBranding(settings: Settings): Branding {
  return {
    suiteName: settings.suiteName || APP_CONFIG.appName,
    portalName: settings.portalName || APP_CONFIG.portalName,
    logoUrl: settings.logoDataUrl || '',
  };
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS);
  // The user's per-device preference overrides the globally saved themeMode.
  const [localThemeMode, setLocalThemeMode] = useState<ThemeMode | null>(() => readStoredTheme());
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveTheme(readStoredTheme() ?? DEFAULT_SETTINGS.themeMode),
  );

  const effectiveThemeMode: ThemeMode = localThemeMode ?? settings.themeMode ?? 'system';

  const refreshSettings = useCallback(async () => {
    try {
      const response = await api.getSettings();
      setSettingsState(response);
      const mode = localThemeMode ?? response.themeMode ?? 'system';
      setResolvedTheme(applyBrandingToDocument(response, mode));
    } catch {
      applyBrandingToDocument(DEFAULT_SETTINGS, localThemeMode ?? 'system');
    }
  }, [localThemeMode]);

  useEffect(() => {
    void refreshSettings();
  }, [refreshSettings]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (effectiveThemeMode !== 'system') return;
      setResolvedTheme(applyBrandingToDocument(settings, effectiveThemeMode));
    };
    query.addEventListener?.('change', handler);
    return () => query.removeEventListener?.('change', handler);
  }, [settings, effectiveThemeMode]);

  const setThemeMode = useCallback((next: ThemeMode) => {
    setLocalThemeMode(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    }
    setResolvedTheme(applyBrandingToDocument(settings, next));
  }, [settings]);

  const setSettings = useCallback((next: Settings) => {
    setSettingsState(next);
    const mode = localThemeMode ?? next.themeMode ?? 'system';
    setResolvedTheme(applyBrandingToDocument(next, mode));
  }, [localThemeMode]);

  const branding = useMemo(() => buildBranding(settings), [settings]);

  const value = useMemo<BrandingContextValue>(() => ({
    settings,
    setSettings,
    refreshSettings,
    branding,
    themeMode: effectiveThemeMode,
    resolvedTheme,
    setThemeMode,
  }), [settings, setSettings, refreshSettings, branding, effectiveThemeMode, resolvedTheme, setThemeMode]);

  return createElement(BrandingContext.Provider, { value }, children);
}

/**
 * Returns the live branding/settings snapshot. Components mounted inside
 * BrandingProvider automatically re-render when settings are saved.
 *
 * Falls back to defaults (without subscribing) if called outside the provider,
 * which keeps isolated tests and pre-provider renders working.
 */
export function useBranding(): BrandingContextValue {
  const context = useContext(BrandingContext);
  if (context) return context;
  return {
    settings: DEFAULT_SETTINGS,
    setSettings: () => undefined,
    refreshSettings: async () => undefined,
    branding: buildBranding(DEFAULT_SETTINGS),
    themeMode: 'system',
    resolvedTheme: 'light',
    setThemeMode: () => undefined,
  };
}
