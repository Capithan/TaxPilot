/**
 * Converts a UIResponse or StructuredUIResponse into clean, human-readable
 * text that ChatGPT can present conversationally.
 *
 * This is the text that goes into content[0].text in the MCP tool result.
 * structuredContent still carries the full component tree for UI-capable clients.
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

function line(text: string): string {
  return text + '\n';
}

function heading(text: string): string {
  return `\n${text}\n${'─'.repeat(Math.min(text.length, 40))}\n`;
}

function bullet(text: string, indent = 0): string {
  return `${'  '.repeat(indent)}• ${text}\n`;
}

function field(label: string, value: string): string {
  return `  ${label}: ${value}\n`;
}

// ─── StructuredUIResponse (intake formatters) ────────────────────────────────

function renderComponent(c: Record<string, unknown>): string {
  if (!c || !c.type) return '';
  const type = c.type as string;

  switch (type) {
    case 'banner':
      return line(`💬 ${c.text || ''}`);

    case 'text_block':
      if (c.style === 'heading') return heading(c.text as string);
      if (c.style === 'subheading') return line(`  ${c.text}`);
      return line(c.text as string);

    case 'step_progress': {
      const steps = (c.steps || []) as Array<{ label: string; status: string }>;
      const current = steps.find(s => s.status === 'active');
      const done = steps.filter(s => s.status === 'done').length;
      return line(`📍 Progress: ${done}/${steps.length} steps completed${current ? ` — Currently on: ${current.label}` : ''}`);
    }

    case 'progress_bar': {
      const value = c.value as number || 0;
      const max = c.max as number || 100;
      const pct = Math.round((value / max) * 100);
      const lbl = c.label ? ` (${c.label})` : '';
      return line(`[${pct}%]${lbl}`);
    }

    case 'form_group': {
      let out = '';
      if (c.title) out += line(`\n📝 ${c.title}`);
      if (c.description) out += line(`   ${c.description}`);
      const fields = (c.fields || []) as Array<{ label: string; required?: boolean; fieldType?: string; placeholder?: string; options?: Array<{ label: string }> }>;
      out += line('   Please provide the following:');
      fields.forEach(f => {
        const req = f.required ? ' (required)' : '';
        if (f.fieldType === 'select' && f.options) {
          out += bullet(`${f.label}${req} — choose from: ${f.options.map(o => o.label).join(', ')}`, 2);
        } else {
          const hint = f.placeholder ? ` (e.g. ${f.placeholder})` : '';
          out += bullet(`${f.label}${req}${hint}`, 2);
        }
      });
      return out;
    }

    case 'selection_card': {
      let out = '';
      if (c.title) out += line(`\n❓ ${c.title}`);
      const options = (c.options || []) as Array<{ label: string; description?: string; icon?: string }>;
      options.forEach(o => {
        const icon = o.icon ? `${o.icon} ` : '';
        const desc = o.description ? ` — ${o.description}` : '';
        out += bullet(`${icon}${o.label}${desc}`, 2);
      });
      out += line('   Please choose one of the above options.');
      return out;
    }

    case 'multi_select': {
      let out = '';
      if (c.title) out += line(`\n📋 ${c.title}`);
      if (c.subtitle) out += line(`   ${c.subtitle}`);
      const options = (c.options || []) as Array<{ label: string; description?: string; icon?: string }>;
      options.forEach(o => {
        const icon = o.icon ? `${o.icon} ` : '';
        const desc = o.description ? ` — ${o.description}` : '';
        out += bullet(`${icon}${o.label}${desc}`, 2);
      });
      out += line('   Select all that apply (or say "none" to skip).');
      return out;
    }

    case 'info_card': {
      let out = '';
      const title = c.title as string || '';
      const badge = c.badge as { text?: string } | undefined;
      out += line(`\n📄 ${title}${badge?.text ? ` [${badge.text}]` : ''}`);
      const fields = (c.fields || []) as Array<{ label: string; value: string; icon?: string }>;
      fields.forEach(f => {
        const icon = f.icon ? `${f.icon} ` : '';
        out += field(`${icon}${f.label}`, f.value);
      });
      if (c.highlight) out += line(`  ℹ️ ${c.highlight}`);
      return out;
    }

    case 'button': {
      const label = c.label as string || '';
      return line(`  → ${label}`);
    }

    case 'divider': {
      const label = c.label ? ` ${c.label} ` : '';
      return line(`───${label}───`);
    }

    default:
      return '';
  }
}

function renderStructured(resp: Record<string, unknown>): string {
  let out = '';

  const components = resp.components as Array<Record<string, unknown>> | undefined;
  if (components && Array.isArray(components)) {
    for (const c of components) {
      out += renderComponent(c);
    }
  }

  // Add a data summary if present
  const data = resp.data as Record<string, unknown> | undefined;
  if (data) {
    const sessionId = data.sessionId as string | undefined;
    const clientId = data.clientId as string | undefined;
    if (sessionId) out += `\n[Session: ${sessionId}]\n`;
    if (clientId) out += `[Client: ${clientId}]\n`;
  }

  // Next tools hint
  const meta = resp._meta as { nextSuggestedTools?: string[] } | undefined;
  if (meta?.nextSuggestedTools?.length) {
    out += `\nSuggested next: ${meta.nextSuggestedTools.join(', ')}\n`;
  }

  return out.trim();
}

// ─── UIResponse (builder-based formatters) ───────────────────────────────────

function renderUIResponse(resp: Record<string, unknown>): string {
  let out = '';

  // Title / subtitle
  if (resp.title) out += heading(resp.title as string);
  if (resp.subtitle) out += line(resp.subtitle as string);

  // Banner
  const banner = resp.banner as { text?: string; variant?: string; icon?: string } | undefined;
  if (banner?.text) {
    const icon = banner.icon || 'ℹ️';
    out += line(`${icon} ${banner.text}`);
  }

  // Progress
  const progress = resp.progress as { current?: number; total?: number; percent?: number; label?: string } | undefined;
  if (progress) {
    const pct = progress.percent ?? (progress.total ? Math.round(((progress.current || 0) / progress.total) * 100) : 0);
    const lbl = progress.label || '';
    out += line(`Progress: ${pct}% ${lbl}`);
  }

  // Cards
  const cards = resp.cards as Array<Record<string, unknown>> | undefined;
  if (cards?.length) {
    for (const card of cards) {
      out += '\n';
      const badge = card.badge as { text?: string } | undefined;
      out += line(`📄 ${card.title || 'Details'}${badge?.text ? ` [${badge.text}]` : ''}`);
      if (card.subtitle) out += line(`  ${card.subtitle}`);

      const fields = card.fields as Array<{ label: string; value: string; icon?: string }> | undefined;
      if (fields?.length) {
        for (const f of fields) {
          const icon = f.icon ? `${f.icon} ` : '';
          out += field(`${icon}${f.label}`, f.value);
        }
      }

      const sections = card.sections as Array<{ title: string; items: Array<{ text: string; description?: string; icon?: string; status?: string }> }> | undefined;
      if (sections?.length) {
        for (const sec of sections) {
          out += line(`\n  ${sec.title}`);
          for (const item of sec.items || []) {
            const icon = item.icon || (item.status === 'done' ? '✅' : item.status === 'required' ? '⚠️' : '•');
            const desc = item.description ? ` — ${item.description}` : '';
            out += bullet(`${icon} ${item.text}${desc}`, 2);
          }
        }
      }

      if (card.highlight) out += line(`  ℹ️ ${card.highlight}`);

      const actions = card.actions as Array<{ label: string; toolName?: string }> | undefined;
      if (actions?.length) {
        for (const a of actions) {
          out += line(`  → ${a.label}`);
        }
      }
    }
  }

  // Standalone sections (outside cards)
  const sections = resp.sections as Array<{ title: string; icon?: string; items: Array<{ text: string; description?: string; icon?: string; status?: string }> }> | undefined;
  if (sections?.length) {
    for (const sec of sections) {
      const icon = sec.icon || '';
      out += line(`\n${icon} ${sec.title}`);
      for (const item of sec.items || []) {
        const sIcon = item.icon || (item.status === 'done' ? '✅' : item.status === 'required' ? '⚠️' : '•');
        const desc = item.description ? ` — ${item.description}` : '';
        out += bullet(`${sIcon} ${item.text}${desc}`, 1);
      }
    }
  }

  // Message
  if (resp.message) out += line(`\n${resp.message}`);

  // Actions
  const actions = resp.actions as Array<{ label: string; icon?: string }> | undefined;
  if (actions?.length) {
    out += '\n';
    for (const a of actions) {
      const icon = a.icon || '→';
      out += line(`${icon} ${a.label}`);
    }
  }

  // Data summary (key business values for ChatGPT context)
  const data = resp.data as Record<string, unknown> | undefined;
  if (data && Object.keys(data).length > 0) {
    out += '\n--- Data ---\n';
    for (const [key, val] of Object.entries(data)) {
      if (val === undefined || val === null) continue;
      if (typeof val === 'object') {
        out += field(key, JSON.stringify(val));
      } else {
        out += field(key, String(val));
      }
    }
  }

  // Next tools
  const meta = resp._meta as { nextSuggestedTools?: string[] } | undefined;
  if (meta?.nextSuggestedTools?.length) {
    out += `\nSuggested next: ${meta.nextSuggestedTools.join(', ')}\n`;
  }

  return out.trim();
}

// ─── Main Export ─────────────────────────────────────────────────────────────

/**
 * Convert any UIResponse or StructuredUIResponse into clean readable text.
 * Auto-detects the format based on the presence of `components` (structured)
 * vs `cards`/`type` (UIResponse builder format).
 */
export function toReadableText(resp: Record<string, unknown>): string {
  if (!resp) return 'No data';

  // StructuredUIResponse (has components array)  
  if (resp.components && Array.isArray(resp.components)) {
    return renderStructured(resp);
  }

  // UIResponse (has type + cards/sections/title built by ui.response())
  if (resp.type || resp.title || resp.cards) {
    return renderUIResponse(resp);
  }

  // Fallback: JSON
  return JSON.stringify(resp, null, 2);
}
