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
// ─── Action Builder ──────────────────────────────────────────────────────────
export function action(label, toolName, toolArgs = {}, style = 'primary', icon) {
    return { label, toolName, toolArgs, style, icon };
}
// ─── Badge Builder ───────────────────────────────────────────────────────────
export function badge(text, variant = 'neutral', icon) {
    return { text, variant, icon };
}
// ─── Progress Builder ────────────────────────────────────────────────────────
export function progress(current, total, label) {
    return {
        current,
        total,
        percent: total > 0 ? Math.round((current / total) * 100) : 0,
        label: label ?? `Step ${current} of ${total}`,
    };
}
// ─── List Item Builder ───────────────────────────────────────────────────────
export function listItem(text, opts = {}) {
    return { text, ...opts };
}
// ─── Section Builder ─────────────────────────────────────────────────────────
export class SectionBuilder {
    _section;
    constructor(title) {
        this._section = { title, items: [] };
    }
    icon(icon) { this._section.icon = icon; return this; }
    item(text, opts = {}) {
        this._section.items.push({ text, ...opts });
        return this;
    }
    counter(done, total) {
        this._section.counter = { done, total };
        return this;
    }
    build() { return this._section; }
}
export function section(title) {
    return new SectionBuilder(title);
}
// ─── Card Builder ────────────────────────────────────────────────────────────
export class CardBuilder {
    _card;
    constructor(title) {
        this._card = { title };
    }
    id(id) { this._card.id = id; return this; }
    subtitle(s) { this._card.subtitle = s; return this; }
    icon(i) { this._card.icon = i; return this; }
    highlight(h) { this._card.highlight = h; return this; }
    footer(f) { this._card.footer = f; return this; }
    badge(text, variant = 'neutral', icon) {
        this._card.badge = { text, variant, icon };
        return this;
    }
    field(label, value, icon) {
        if (!this._card.fields)
            this._card.fields = [];
        this._card.fields.push({ label, value, icon });
        return this;
    }
    section(title, fn) {
        if (!this._card.sections)
            this._card.sections = [];
        const sb = new SectionBuilder(title);
        fn(sb);
        this._card.sections.push(sb.build());
        return this;
    }
    addSection(s) {
        if (!this._card.sections)
            this._card.sections = [];
        this._card.sections.push(s);
        return this;
    }
    action(label, toolName, toolArgs = {}, style = 'primary', icon) {
        if (!this._card.actions)
            this._card.actions = [];
        this._card.actions.push({ label, toolName, toolArgs, style, icon });
        return this;
    }
    build() { return this._card; }
}
export function card(title) {
    return new CardBuilder(title);
}
// ─── Response Builder ────────────────────────────────────────────────────────
export class ResponseBuilder {
    _resp;
    constructor(type, toolName) {
        this._resp = {
            type,
            title: '',
            data: {},
            _meta: {
                toolName,
                timestamp: new Date().toISOString(),
            },
        };
    }
    title(t) { this._resp.title = t; return this; }
    subtitle(s) { this._resp.subtitle = s; return this; }
    message(m) { this._resp.message = m; return this; }
    progress(current, total, label) {
        this._resp.progress = {
            current,
            total,
            percent: total > 0 ? Math.round((current / total) * 100) : 0,
            label: label ?? `Step ${current} of ${total}`,
        };
        return this;
    }
    banner(text, variant = 'info', opts = {}) {
        this._resp.banner = { text, variant, ...opts };
        return this;
    }
    card(titleOrFn, fn) {
        if (!this._resp.cards)
            this._resp.cards = [];
        if (typeof titleOrFn === 'function') {
            const cb = new CardBuilder('');
            titleOrFn(cb);
            this._resp.cards.push(cb.build());
        }
        else {
            const cb = new CardBuilder(titleOrFn);
            if (fn)
                fn(cb);
            this._resp.cards.push(cb.build());
        }
        return this;
    }
    addCard(c) {
        if (!this._resp.cards)
            this._resp.cards = [];
        this._resp.cards.push(c);
        return this;
    }
    section(title, fn) {
        if (!this._resp.sections)
            this._resp.sections = [];
        const sb = new SectionBuilder(title);
        fn(sb);
        this._resp.sections.push(sb.build());
        return this;
    }
    addSection(s) {
        if (!this._resp.sections)
            this._resp.sections = [];
        this._resp.sections.push(s);
        return this;
    }
    action(label, toolName, toolArgs = {}, style = 'primary', icon) {
        if (!this._resp.actions)
            this._resp.actions = [];
        this._resp.actions.push({ label, toolName, toolArgs, style, icon });
        return this;
    }
    data(d) {
        this._resp.data = { ...this._resp.data, ...d };
        return this;
    }
    meta(m) {
        this._resp._meta = { ...this._resp._meta, ...m };
        return this;
    }
    nextTools(...tools) {
        this._resp._meta.nextSuggestedTools = tools;
        return this;
    }
    flowStage(stage) {
        this._resp._meta.flowStage = stage;
        return this;
    }
    build() { return this._resp; }
    /**
     * Convenience: serialize to the MCP content block format.
     * Returns `{ content: [{ type: 'text', text: '<JSON>' }] }`.
     */
    toMcpContent() {
        return {
            content: [{ type: 'text', text: JSON.stringify(this._resp, null, 2) }],
        };
    }
}
/** Top-level entry point for all UI construction. */
export function response(type, toolName) {
    return new ResponseBuilder(type, toolName);
}
// ─── Convenience namespace export ────────────────────────────────────────────
export const ui = {
    response,
    card,
    section,
    action,
    badge,
    progress,
    listItem,
};
//# sourceMappingURL=builders.js.map