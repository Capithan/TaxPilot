/**
 * H&R Block Brand Theme — TaxPilot
 *
 * Centralized design tokens for consistent HRB-branded UI.
 * Used by both the frontend renderer and React components.
 * Supports light and dark modes across Web, iOS, and Android.
 *
 * Reference: H&R Block brand guidelines
 */

import type { ThemeMode, Platform } from './components.types.js';

// ── Shared (mode-independent) tokens ──────────────────────────────

const sharedTokens = {
  typography: {
    fontFamily:     "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', sans-serif",
    monoFamily:     "'Cascadia Code', 'Consolas', 'Monaco', monospace",
    size: {
      xs:           '0.72rem',
      sm:           '0.82rem',
      base:         '0.92rem',
      md:           '1.0rem',
      lg:           '1.15rem',
      xl:           '1.35rem',
      '2xl':        '1.55rem',
    },
    weight: {
      normal:       '400',
      medium:       '500',
      semibold:     '600',
      bold:         '700',
    },
    lineHeight: {
      tight:        '1.25',
      normal:       '1.5',
      relaxed:      '1.65',
    },
  },
  spacing: {
    xs:            '4px',
    sm:            '8px',
    md:            '12px',
    lg:            '16px',
    xl:            '20px',
    '2xl':         '24px',
    '3xl':         '32px',
    '4xl':         '48px',
  },
  radius: {
    sm:            '6px',
    md:            '8px',
    lg:            '12px',
    xl:            '16px',
    full:          '9999px',
  },
  transition: {
    fast:          '0.1s ease',
    base:          '0.2s ease',
    slow:          '0.3s ease',
  },
  zIndex: {
    dropdown:      10,
    sticky:        20,
    modal:         30,
    tooltip:       40,
  },
} as const;

// ── Light-mode color palette ──────────────────────────────────────

const lightColors = {
  brand: {
    primary:       '#00A13A',
    primaryDark:   '#008830',
    primaryLight:  '#E6F4EA',
    primaryMuted:  '#66C285',
    neon:          '#00E043',
    secondary:     '#2D2A26',
    accent:        '#00A13A',
  },
  surface: {
    background:    '#F5F0E8',
    backgroundAlt: '#EDE7DA',
    card:          '#FFFFFF',
    cardAlt:       '#FFFDF9',
    input:         '#F0EDEA',
    inputFocus:    '#E6F4EA',
  },
  text: {
    primary:       '#2D2A26',
    secondary:     '#5C5750',
    muted:         '#8A847B',
    inverse:       '#FFFFFF',
    link:          '#00A13A',
  },
  border: {
    default:       '#D9D2C7',
    light:         '#E8E2D8',
    focus:         '#00A13A',
    divider:       '#EDE7DA',
  },
  status: {
    success:       '#2E7D32',
    successBg:     '#E8F5E9',
    warning:       '#E65100',
    warningBg:     '#FFF3E0',
    error:         '#C62828',
    errorBg:       '#FFEBEE',
    info:          '#1565C0',
    infoBg:        '#E3F2FD',
    neutral:       '#8A847B',
    neutralBg:     '#F5F0E8',
    brand:         '#00A13A',
    brandBg:       '#E6F4EA',
  },
} as const;

const lightShadow = {
  sm:            '0 1px 2px rgba(45, 42, 38, 0.04)',
  md:            '0 2px 8px rgba(45, 42, 38, 0.06)',
  lg:            '0 4px 16px rgba(45, 42, 38, 0.08)',
  xl:            '0 8px 24px rgba(45, 42, 38, 0.10)',
  focus:         '0 0 0 3px rgba(0, 161, 58, 0.15)',
  cardHover:     '0 4px 20px rgba(45, 42, 38, 0.12)',
} as const;

// ── Dark-mode color palette ───────────────────────────────────────

const darkColors = {
  brand: {
    primary:       '#00C853',    // brighter green for dark bg
    primaryDark:   '#00A13A',
    primaryLight:  '#1A3A2A',    // muted dark green bg
    primaryMuted:  '#4CAF50',
    neon:          '#69F0AE',
    secondary:     '#E0DDD8',
    accent:        '#00C853',
  },
  surface: {
    background:    '#121212',    // Material dark bg
    backgroundAlt: '#1E1E1E',
    card:          '#1E1E1E',
    cardAlt:       '#252525',
    input:         '#2C2C2C',
    inputFocus:    '#1A3A2A',
  },
  text: {
    primary:       '#E0DDD8',
    secondary:     '#B0ACA5',
    muted:         '#7A7670',
    inverse:       '#121212',
    link:          '#69F0AE',
  },
  border: {
    default:       '#3A3A3A',
    light:         '#333333',
    focus:         '#00C853',
    divider:       '#2C2C2C',
  },
  status: {
    success:       '#66BB6A',
    successBg:     '#1B2E1B',
    warning:       '#FFA726',
    warningBg:     '#2E2A1A',
    error:         '#EF5350',
    errorBg:       '#2E1A1A',
    info:          '#42A5F5',
    infoBg:        '#1A2230',
    neutral:       '#9E9E9E',
    neutralBg:     '#2C2C2C',
    brand:         '#00C853',
    brandBg:       '#1A3A2A',
  },
} as const;

const darkShadow = {
  sm:            '0 1px 2px rgba(0, 0, 0, 0.20)',
  md:            '0 2px 8px rgba(0, 0, 0, 0.30)',
  lg:            '0 4px 16px rgba(0, 0, 0, 0.35)',
  xl:            '0 8px 24px rgba(0, 0, 0, 0.40)',
  focus:         '0 0 0 3px rgba(0, 200, 83, 0.25)',
  cardHover:     '0 4px 20px rgba(0, 0, 0, 0.45)',
} as const;

// ── Combined theme objects ────────────────────────────────────────

export const hrbThemeLight = {
  mode: 'light' as const,
  colors:     lightColors,
  shadow:     lightShadow,
  ...sharedTokens,
};

export const hrbThemeDark = {
  mode: 'dark' as const,
  colors:     darkColors,
  shadow:     darkShadow,
  ...sharedTokens,
};

/** The full theme type */
export type HrbTheme = typeof hrbThemeLight | typeof hrbThemeDark;

/**
 * Get the theme object for a given mode.
 * Defaults to 'light' when mode is undefined.
 */
export function getTheme(mode?: ThemeMode): typeof hrbThemeLight & { mode: ThemeMode } {
  return (mode === 'dark' ? hrbThemeDark : hrbThemeLight) as typeof hrbThemeLight & { mode: ThemeMode };
}

/**
 * Legacy default export — light theme (backward compatible).
 */
export const hrbTheme = hrbThemeLight;

/**
 * Maps badge/status variant names to colors from the theme.
 */
export function getVariantColors(variant: string, mode?: ThemeMode): { bg: string; fg: string; border: string } {
  const theme = getTheme(mode);
  const s = theme.colors.status;
  switch (variant) {
    case 'success': return { bg: s.successBg, fg: s.success, border: s.success };
    case 'warning': return { bg: s.warningBg, fg: s.warning, border: s.warning };
    case 'error':   return { bg: s.errorBg, fg: s.error, border: s.error };
    case 'info':    return { bg: s.infoBg, fg: s.info, border: s.info };
    case 'brand':   return { bg: s.brandBg, fg: s.brand, border: s.brand };
    default:        return { bg: s.neutralBg, fg: s.neutral, border: s.neutral };
  }
}

/**
 * CSS custom properties generated from theme — inject into :root.
 * When mode is 'dark', returns dark-mode tokens.
 */
export function getThemeCSSVars(mode?: ThemeMode): string {
  const theme = getTheme(mode);
  return `
    --hrb-primary: ${theme.colors.brand.primary};
    --hrb-primary-dark: ${theme.colors.brand.primaryDark};
    --hrb-primary-light: ${theme.colors.brand.primaryLight};
    --hrb-bg: ${theme.colors.surface.background};
    --hrb-bg-alt: ${theme.colors.surface.backgroundAlt};
    --hrb-surface: ${theme.colors.surface.card};
    --hrb-surface-alt: ${theme.colors.surface.cardAlt};
    --hrb-text: ${theme.colors.text.primary};
    --hrb-text-secondary: ${theme.colors.text.secondary};
    --hrb-text-muted: ${theme.colors.text.muted};
    --hrb-border: ${theme.colors.border.default};
    --hrb-border-light: ${theme.colors.border.light};
    --hrb-radius-sm: ${theme.radius.sm};
    --hrb-radius-md: ${theme.radius.md};
    --hrb-radius-lg: ${theme.radius.lg};
    --hrb-shadow-sm: ${theme.shadow.sm};
    --hrb-shadow-md: ${theme.shadow.md};
    --hrb-shadow-lg: ${theme.shadow.lg};
    --hrb-font: ${theme.typography.fontFamily};
  `;
}

/**
 * Platform-specific style hints.
 * Returns a CSS block with platform adjustments (safe areas, tap targets, etc.).
 */
export function getPlatformCSS(platform?: Platform): string {
  switch (platform) {
    case 'ios':
      return `
        /* iOS safe-area insets */
        body { padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom); }
        .tp-btn { min-height: 44px; }  /* Apple HIG tap target */
        .tp-input { font-size: 16px; } /* Prevent zoom on focus */
      `;
    case 'android':
      return `
        /* Android Material touch ripple & sizing */
        .tp-btn { min-height: 48px; } /* Material Design tap target */
        .tp-btn:active { opacity: 0.75; }
        .tp-sopt:active, .tp-mopt:active { background: rgba(0,0,0,0.08); }
      `;
    default:
      return `
        /* Web hover states */
        .tp-btn:hover { filter: brightness(1.05); }
        .tp-sopt:hover { border-color: var(--hrb-primary, #00A13A); }
        .tp-mopt:hover { border-color: var(--hrb-primary, #00A13A); }
      `;
  }
}
