/**
 * TaxPilot UI Builder Library
 *
 * Fluent builder API for constructing UI components.
 * Provides type-safe, chainable methods instead of raw object literals.
 *
 * Usage:
 *   const response = ui.response('intake_start', 'start_intake')
 *     .title('📋 Tax Intake Started')
 *     .subtitle('Let\'s collect your information step by step')
 *     .progress(1, 9, 'Step 1 of 9')
 *     .card(c => c.title('Welcome').field('Session', sessionId))
 *     .action('Begin', 'process_intake_response', { sessionId }, 'primary', '▶️')
 *     .data({ sessionId, clientId })
 *     .build();
 */
import type { UIAction, UIBadge, UIBanner, UICard, UIListItem, UIProgressBar, UIResponse, UIResponseMeta, UIResponseType, UISection } from './types.js';
export declare function action(label: string, toolName: string, toolArgs?: Record<string, unknown>, style?: UIAction['style'], icon?: string): UIAction;
export declare function badge(text: string, variant?: UIBadge['variant'], icon?: string): UIBadge;
export declare function progress(current: number, total: number, label?: string): UIProgressBar;
export declare function listItem(text: string, opts?: Partial<Omit<UIListItem, 'text'>>): UIListItem;
export declare class SectionBuilder {
    private _section;
    constructor(title: string);
    icon(icon: string): this;
    item(text: string, opts?: Partial<Omit<UIListItem, 'text'>>): this;
    counter(done: number, total: number): this;
    build(): UISection;
}
export declare function section(title: string): SectionBuilder;
export declare class CardBuilder {
    private _card;
    constructor(title: string);
    id(id: string): this;
    subtitle(s: string): this;
    icon(i: string): this;
    highlight(h: string): this;
    footer(f: string): this;
    badge(text: string, variant?: UIBadge['variant'], icon?: string): this;
    field(label: string, value: string, icon?: string): this;
    section(title: string, fn: (sb: SectionBuilder) => void): this;
    addSection(s: UISection): this;
    action(label: string, toolName: string, toolArgs?: Record<string, unknown>, style?: UIAction['style'], icon?: string): this;
    build(): UICard;
}
export declare function card(title: string): CardBuilder;
export declare class ResponseBuilder {
    private _resp;
    constructor(type: UIResponseType, toolName: string);
    title(t: string): this;
    subtitle(s: string): this;
    message(m: string): this;
    progress(current: number, total: number, label?: string): this;
    banner(text: string, variant?: UIBanner['variant'], opts?: Partial<UIBanner>): this;
    card(titleOrFn: string | ((cb: CardBuilder) => void), fn?: (cb: CardBuilder) => void): this;
    addCard(c: UICard): this;
    section(title: string, fn: (sb: SectionBuilder) => void): this;
    addSection(s: UISection): this;
    action(label: string, toolName: string, toolArgs?: Record<string, unknown>, style?: UIAction['style'], icon?: string): this;
    data(d: Record<string, unknown>): this;
    meta(m: Partial<UIResponseMeta>): this;
    nextTools(...tools: string[]): this;
    flowStage(stage: string): this;
    build(): UIResponse;
    /**
     * Convenience: serialize to the MCP content block format.
     * Returns `{ content: [{ type: 'text', text: '<JSON>' }] }`.
     */
    toMcpContent(): {
        content: Array<{
            type: 'text';
            text: string;
        }>;
    };
}
/** Top-level entry point for all UI construction. */
export declare function response(type: UIResponseType, toolName: string): ResponseBuilder;
export declare const ui: {
    readonly response: typeof response;
    readonly card: typeof card;
    readonly section: typeof section;
    readonly action: typeof action;
    readonly badge: typeof badge;
    readonly progress: typeof progress;
    readonly listItem: typeof listItem;
};
//# sourceMappingURL=builders.d.ts.map