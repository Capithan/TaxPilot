/**
 * H&R Block Brand Theme — TaxPilot
 *
 * Centralized design tokens for consistent HRB-branded UI.
 * Used by both the frontend renderer and React components.
 *
 * Reference: H&R Block brand guidelines
 */
export declare const hrbTheme: {
    readonly colors: {
        readonly brand: {
            readonly primary: "#00A13A";
            readonly primaryDark: "#008830";
            readonly primaryLight: "#E6F4EA";
            readonly primaryMuted: "#66C285";
            readonly neon: "#00E043";
            readonly secondary: "#2D2A26";
            readonly accent: "#00A13A";
        };
        readonly surface: {
            readonly background: "#F5F0E8";
            readonly backgroundAlt: "#EDE7DA";
            readonly card: "#FFFFFF";
            readonly cardAlt: "#FFFDF9";
            readonly input: "#F0EDEA";
            readonly inputFocus: "#E6F4EA";
        };
        readonly text: {
            readonly primary: "#2D2A26";
            readonly secondary: "#5C5750";
            readonly muted: "#8A847B";
            readonly inverse: "#FFFFFF";
            readonly link: "#00A13A";
        };
        readonly border: {
            readonly default: "#D9D2C7";
            readonly light: "#E8E2D8";
            readonly focus: "#00A13A";
            readonly divider: "#EDE7DA";
        };
        readonly status: {
            readonly success: "#2E7D32";
            readonly successBg: "#E8F5E9";
            readonly warning: "#E65100";
            readonly warningBg: "#FFF3E0";
            readonly error: "#C62828";
            readonly errorBg: "#FFEBEE";
            readonly info: "#1565C0";
            readonly infoBg: "#E3F2FD";
            readonly neutral: "#8A847B";
            readonly neutralBg: "#F5F0E8";
            readonly brand: "#00A13A";
            readonly brandBg: "#E6F4EA";
        };
    };
    readonly typography: {
        readonly fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', sans-serif";
        readonly monoFamily: "'Cascadia Code', 'Consolas', 'Monaco', monospace";
        readonly size: {
            readonly xs: "0.72rem";
            readonly sm: "0.82rem";
            readonly base: "0.92rem";
            readonly md: "1.0rem";
            readonly lg: "1.15rem";
            readonly xl: "1.35rem";
            readonly '2xl': "1.55rem";
        };
        readonly weight: {
            readonly normal: "400";
            readonly medium: "500";
            readonly semibold: "600";
            readonly bold: "700";
        };
        readonly lineHeight: {
            readonly tight: "1.25";
            readonly normal: "1.5";
            readonly relaxed: "1.65";
        };
    };
    readonly spacing: {
        readonly xs: "4px";
        readonly sm: "8px";
        readonly md: "12px";
        readonly lg: "16px";
        readonly xl: "20px";
        readonly '2xl': "24px";
        readonly '3xl': "32px";
        readonly '4xl': "48px";
    };
    readonly radius: {
        readonly sm: "6px";
        readonly md: "8px";
        readonly lg: "12px";
        readonly xl: "16px";
        readonly full: "9999px";
    };
    readonly shadow: {
        readonly sm: "0 1px 2px rgba(45, 42, 38, 0.04)";
        readonly md: "0 2px 8px rgba(45, 42, 38, 0.06)";
        readonly lg: "0 4px 16px rgba(45, 42, 38, 0.08)";
        readonly xl: "0 8px 24px rgba(45, 42, 38, 0.10)";
        readonly focus: "0 0 0 3px rgba(0, 161, 58, 0.15)";
        readonly cardHover: "0 4px 20px rgba(45, 42, 38, 0.12)";
    };
    readonly transition: {
        readonly fast: "0.1s ease";
        readonly base: "0.2s ease";
        readonly slow: "0.3s ease";
    };
    readonly zIndex: {
        readonly dropdown: 10;
        readonly sticky: 20;
        readonly modal: 30;
        readonly tooltip: 40;
    };
};
/**
 * Maps badge/status variant names to colors from the theme.
 */
export declare function getVariantColors(variant: string): {
    bg: string;
    fg: string;
    border: string;
};
/**
 * CSS custom properties generated from theme — inject into :root
 */
export declare function getThemeCSSVars(): string;
//# sourceMappingURL=theme.d.ts.map