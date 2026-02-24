/**
 * H&R Block Brand Theme — TaxPilot
 *
 * Centralized design tokens for consistent HRB-branded UI.
 * Used by both the frontend renderer and React components.
 *
 * Reference: H&R Block brand guidelines
 */
export const hrbTheme = {
    // ── Brand Colors ────────────────────────────────────────────────
    colors: {
        brand: {
            primary: '#00A13A', // H&R Block Green (BDS primary)
            primaryDark: '#008830', // BDS button hover
            primaryLight: '#E6F4EA', // BDS green-light bg
            primaryMuted: '#66C285', // BDS muted accent
            neon: '#00E043', // BDS neon theme
            secondary: '#2D2A26', // BDS black theme
            accent: '#00A13A', // BDS primary accent
        },
        // Surfaces
        surface: {
            background: '#F5F0E8', // Warm beige page bg
            backgroundAlt: '#EDE7DA', // Slightly darker beige
            card: '#FFFFFF', // White card bg
            cardAlt: '#FFFDF9', // Warm white
            input: '#F0EDEA', // Input field bg
            inputFocus: '#E6F4EA', // Green tint on focus
        },
        // Text
        text: {
            primary: '#2D2A26', // Dark charcoal
            secondary: '#5C5750', // Medium gray
            muted: '#8A847B', // Light gray
            inverse: '#FFFFFF', // White on green bg
            link: '#00A13A', // Green links
        },
        // Borders
        border: {
            default: '#D9D2C7', // Beige border
            light: '#E8E2D8', // Light border
            focus: '#00A13A', // Green focus ring
            divider: '#EDE7DA', // Section dividers
        },
        // Feedback / Status
        status: {
            success: '#2E7D32',
            successBg: '#E8F5E9',
            warning: '#E65100', // BDS warm warning
            warningBg: '#FFF3E0',
            error: '#C62828', // BDS error red
            errorBg: '#FFEBEE',
            info: '#1565C0',
            infoBg: '#E3F2FD',
            neutral: '#8A847B',
            neutralBg: '#F5F0E8',
            brand: '#00A13A',
            brandBg: '#E6F4EA',
        },
    },
    // ── Typography ──────────────────────────────────────────────────
    typography: {
        fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', sans-serif",
        monoFamily: "'Cascadia Code', 'Consolas', 'Monaco', monospace",
        size: {
            xs: '0.72rem', // 11.5px — captions, meta
            sm: '0.82rem', // 13px — secondary text
            base: '0.92rem', // 14.7px — body
            md: '1.0rem', // 16px — emphasis
            lg: '1.15rem', // 18.4px — card titles
            xl: '1.35rem', // 21.6px — page headings
            '2xl': '1.55rem', // 24.8px — hero headings
        },
        weight: {
            normal: '400',
            medium: '500',
            semibold: '600',
            bold: '700',
        },
        lineHeight: {
            tight: '1.25',
            normal: '1.5',
            relaxed: '1.65',
        },
    },
    // ── Spacing ─────────────────────────────────────────────────────
    spacing: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '24px',
        '3xl': '32px',
        '4xl': '48px',
    },
    // ── Border Radius ───────────────────────────────────────────────
    radius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        full: '9999px',
    },
    // ── Shadows ─────────────────────────────────────────────────────
    shadow: {
        sm: '0 1px 2px rgba(45, 42, 38, 0.04)',
        md: '0 2px 8px rgba(45, 42, 38, 0.06)',
        lg: '0 4px 16px rgba(45, 42, 38, 0.08)',
        xl: '0 8px 24px rgba(45, 42, 38, 0.10)',
        focus: '0 0 0 3px rgba(0, 161, 58, 0.15)',
        cardHover: '0 4px 20px rgba(45, 42, 38, 0.12)',
    },
    // ── Transitions ─────────────────────────────────────────────────
    transition: {
        fast: '0.1s ease',
        base: '0.2s ease',
        slow: '0.3s ease',
    },
    // ── Z-index layers ──────────────────────────────────────────────
    zIndex: {
        dropdown: 10,
        sticky: 20,
        modal: 30,
        tooltip: 40,
    },
};
/**
 * Maps badge/status variant names to colors from the theme.
 */
export function getVariantColors(variant) {
    const s = hrbTheme.colors.status;
    switch (variant) {
        case 'success': return { bg: s.successBg, fg: s.success, border: s.success };
        case 'warning': return { bg: s.warningBg, fg: s.warning, border: s.warning };
        case 'error': return { bg: s.errorBg, fg: s.error, border: s.error };
        case 'info': return { bg: s.infoBg, fg: s.info, border: s.info };
        case 'brand': return { bg: s.brandBg, fg: s.brand, border: s.brand };
        default: return { bg: s.neutralBg, fg: s.neutral, border: s.neutral };
    }
}
/**
 * CSS custom properties generated from theme — inject into :root
 */
export function getThemeCSSVars() {
    return `
    --hrb-primary: ${hrbTheme.colors.brand.primary};
    --hrb-primary-dark: ${hrbTheme.colors.brand.primaryDark};
    --hrb-primary-light: ${hrbTheme.colors.brand.primaryLight};
    --hrb-bg: ${hrbTheme.colors.surface.background};
    --hrb-bg-alt: ${hrbTheme.colors.surface.backgroundAlt};
    --hrb-surface: ${hrbTheme.colors.surface.card};
    --hrb-surface-alt: ${hrbTheme.colors.surface.cardAlt};
    --hrb-text: ${hrbTheme.colors.text.primary};
    --hrb-text-secondary: ${hrbTheme.colors.text.secondary};
    --hrb-text-muted: ${hrbTheme.colors.text.muted};
    --hrb-border: ${hrbTheme.colors.border.default};
    --hrb-border-light: ${hrbTheme.colors.border.light};
    --hrb-radius-sm: ${hrbTheme.radius.sm};
    --hrb-radius-md: ${hrbTheme.radius.md};
    --hrb-radius-lg: ${hrbTheme.radius.lg};
    --hrb-shadow-sm: ${hrbTheme.shadow.sm};
    --hrb-shadow-md: ${hrbTheme.shadow.md};
    --hrb-shadow-lg: ${hrbTheme.shadow.lg};
    --hrb-font: ${hrbTheme.typography.fontFamily};
  `;
}
//# sourceMappingURL=theme.js.map