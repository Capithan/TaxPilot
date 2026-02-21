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

import type {
  UIAction,
  UIBadge,
  UIBanner,
  UICard,
  UIField,
  UIListItem,
  UIProgressBar,
  UIResponse,
  UIResponseMeta,
  UIResponseType,
  UISection,
} from './types.js';

// ─── Action Builder ──────────────────────────────────────────────────────────

export function action(
  label: string,
  toolName: string,
  toolArgs: Record<string, unknown> = {},
  style: UIAction['style'] = 'primary',
  icon?: string,
): UIAction {
  return { label, toolName, toolArgs, style, icon };
}

// ─── Badge Builder ───────────────────────────────────────────────────────────

export function badge(
  text: string,
  variant: UIBadge['variant'] = 'neutral',
  icon?: string,
): UIBadge {
  return { text, variant, icon };
}

// ─── Progress Builder ────────────────────────────────────────────────────────

export function progress(current: number, total: number, label?: string): UIProgressBar {
  return {
    current,
    total,
    percent: total > 0 ? Math.round((current / total) * 100) : 0,
    label: label ?? `Step ${current} of ${total}`,
  };
}

// ─── List Item Builder ───────────────────────────────────────────────────────

export function listItem(
  text: string,
  opts: Partial<Omit<UIListItem, 'text'>> = {},
): UIListItem {
  return { text, ...opts };
}

// ─── Section Builder ─────────────────────────────────────────────────────────

export class SectionBuilder {
  private _section: UISection;

  constructor(title: string) {
    this._section = { title, items: [] };
  }

  icon(icon: string): this { this._section.icon = icon; return this; }

  item(text: string, opts: Partial<Omit<UIListItem, 'text'>> = {}): this {
    this._section.items.push({ text, ...opts });
    return this;
  }

  counter(done: number, total: number): this {
    this._section.counter = { done, total };
    return this;
  }

  build(): UISection { return this._section; }
}

export function section(title: string): SectionBuilder {
  return new SectionBuilder(title);
}

// ─── Card Builder ────────────────────────────────────────────────────────────

export class CardBuilder {
  private _card: UICard;

  constructor(title: string) {
    this._card = { title };
  }

  id(id: string): this { this._card.id = id; return this; }
  subtitle(s: string): this { this._card.subtitle = s; return this; }
  icon(i: string): this { this._card.icon = i; return this; }
  highlight(h: string): this { this._card.highlight = h; return this; }
  footer(f: string): this { this._card.footer = f; return this; }

  badge(text: string, variant: UIBadge['variant'] = 'neutral', icon?: string): this {
    this._card.badge = { text, variant, icon };
    return this;
  }

  field(label: string, value: string, icon?: string): this {
    if (!this._card.fields) this._card.fields = [];
    this._card.fields.push({ label, value, icon });
    return this;
  }

  section(title: string, fn: (sb: SectionBuilder) => void): this {
    if (!this._card.sections) this._card.sections = [];
    const sb = new SectionBuilder(title);
    fn(sb);
    this._card.sections.push(sb.build());
    return this;
  }

  addSection(s: UISection): this {
    if (!this._card.sections) this._card.sections = [];
    this._card.sections.push(s);
    return this;
  }

  action(
    label: string,
    toolName: string,
    toolArgs: Record<string, unknown> = {},
    style: UIAction['style'] = 'primary',
    icon?: string,
  ): this {
    if (!this._card.actions) this._card.actions = [];
    this._card.actions.push({ label, toolName, toolArgs, style, icon });
    return this;
  }

  build(): UICard { return this._card; }
}

export function card(title: string): CardBuilder {
  return new CardBuilder(title);
}

// ─── Response Builder ────────────────────────────────────────────────────────

export class ResponseBuilder {
  private _resp: UIResponse;

  constructor(type: UIResponseType, toolName: string) {
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

  title(t: string): this { this._resp.title = t; return this; }
  subtitle(s: string): this { this._resp.subtitle = s; return this; }
  message(m: string): this { this._resp.message = m; return this; }

  progress(current: number, total: number, label?: string): this {
    this._resp.progress = {
      current,
      total,
      percent: total > 0 ? Math.round((current / total) * 100) : 0,
      label: label ?? `Step ${current} of ${total}`,
    };
    return this;
  }

  banner(text: string, variant: UIBanner['variant'] = 'info', opts: Partial<UIBanner> = {}): this {
    this._resp.banner = { text, variant, ...opts };
    return this;
  }

  card(titleOrFn: string | ((cb: CardBuilder) => void), fn?: (cb: CardBuilder) => void): this {
    if (!this._resp.cards) this._resp.cards = [];
    if (typeof titleOrFn === 'function') {
      const cb = new CardBuilder('');
      titleOrFn(cb);
      this._resp.cards.push(cb.build());
    } else {
      const cb = new CardBuilder(titleOrFn);
      if (fn) fn(cb);
      this._resp.cards.push(cb.build());
    }
    return this;
  }

  addCard(c: UICard): this {
    if (!this._resp.cards) this._resp.cards = [];
    this._resp.cards.push(c);
    return this;
  }

  section(title: string, fn: (sb: SectionBuilder) => void): this {
    if (!this._resp.sections) this._resp.sections = [];
    const sb = new SectionBuilder(title);
    fn(sb);
    this._resp.sections.push(sb.build());
    return this;
  }

  addSection(s: UISection): this {
    if (!this._resp.sections) this._resp.sections = [];
    this._resp.sections.push(s);
    return this;
  }

  action(
    label: string,
    toolName: string,
    toolArgs: Record<string, unknown> = {},
    style: UIAction['style'] = 'primary',
    icon?: string,
  ): this {
    if (!this._resp.actions) this._resp.actions = [];
    this._resp.actions.push({ label, toolName, toolArgs, style, icon });
    return this;
  }

  data(d: Record<string, unknown>): this {
    this._resp.data = { ...this._resp.data, ...d };
    return this;
  }

  meta(m: Partial<UIResponseMeta>): this {
    this._resp._meta = { ...this._resp._meta, ...m };
    return this;
  }

  nextTools(...tools: string[]): this {
    this._resp._meta.nextSuggestedTools = tools;
    return this;
  }

  flowStage(stage: string): this {
    this._resp._meta.flowStage = stage;
    return this;
  }

  build(): UIResponse { return this._resp; }

  /**
   * Convenience: serialize to the MCP content block format.
   * Returns `{ content: [{ type: 'text', text: '<JSON>' }] }`.
   */
  toMcpContent(): { content: Array<{ type: 'text'; text: string }> } {
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(this._resp, null, 2) }],
    };
  }
}

/** Top-level entry point for all UI construction. */
export function response(type: UIResponseType, toolName: string): ResponseBuilder {
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
} as const;
