/**
 * Converts a UIResponse or StructuredUIResponse into clean, human-readable
 * text that ChatGPT can present conversationally.
 *
 * This is the text that goes into content[0].text in the MCP tool result.
 * structuredContent still carries the full component tree for UI-capable clients.
 */
// ─── Helpers ─────────────────────────────────────────────────────────────────
function line(text) {
    return text + '\n';
}
function heading(text) {
    return `\n${text}\n${'─'.repeat(Math.min(text.length, 40))}\n`;
}
function bullet(text, indent = 0) {
    return `${'  '.repeat(indent)}• ${text}\n`;
}
function field(label, value) {
    return `  ${label}: ${value}\n`;
}
// ─── StructuredUIResponse (intake formatters) ────────────────────────────────
function renderComponent(c) {
    if (!c || !c.type)
        return '';
    const type = c.type;
    switch (type) {
        case 'banner':
            return line(`💬 ${c.text || ''}`);
        case 'text_block':
            if (c.style === 'heading')
                return heading(c.text);
            if (c.style === 'subheading')
                return line(`  ${c.text}`);
            return line(c.text);
        case 'step_progress': {
            const steps = (c.steps || []);
            const current = steps.find(s => s.status === 'active');
            const done = steps.filter(s => s.status === 'done').length;
            return line(`📍 Progress: ${done}/${steps.length} steps completed${current ? ` — Currently on: ${current.label}` : ''}`);
        }
        case 'progress_bar': {
            const value = c.value || 0;
            const max = c.max || 100;
            const pct = Math.round((value / max) * 100);
            const lbl = c.label ? ` (${c.label})` : '';
            return line(`[${pct}%]${lbl}`);
        }
        case 'form_group': {
            let out = '';
            if (c.title)
                out += line(`\n📝 ${c.title}`);
            if (c.description)
                out += line(`   ${c.description}`);
            const fields = (c.fields || []);
            out += line('   Please provide the following:');
            fields.forEach(f => {
                const req = f.required ? ' (required)' : '';
                if (f.fieldType === 'select' && f.options) {
                    out += bullet(`${f.label}${req} — choose from: ${f.options.map(o => o.label).join(', ')}`, 2);
                }
                else {
                    const hint = f.placeholder ? ` (e.g. ${f.placeholder})` : '';
                    out += bullet(`${f.label}${req}${hint}`, 2);
                }
            });
            return out;
        }
        case 'selection_card': {
            let out = '';
            if (c.title)
                out += line(`\n❓ ${c.title}`);
            const options = (c.options || []);
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
            if (c.title)
                out += line(`\n📋 ${c.title}`);
            if (c.subtitle)
                out += line(`   ${c.subtitle}`);
            const options = (c.options || []);
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
            const title = c.title || '';
            const badge = c.badge;
            out += line(`\n📄 ${title}${badge?.text ? ` [${badge.text}]` : ''}`);
            const fields = (c.fields || []);
            fields.forEach(f => {
                const icon = f.icon ? `${f.icon} ` : '';
                out += field(`${icon}${f.label}`, f.value);
            });
            if (c.highlight)
                out += line(`  ℹ️ ${c.highlight}`);
            return out;
        }
        case 'button': {
            const label = c.label || '';
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
function renderStructured(resp) {
    let out = '';
    const components = resp.components;
    if (components && Array.isArray(components)) {
        for (const c of components) {
            out += renderComponent(c);
        }
    }
    // Add a data summary if present
    const data = resp.data;
    if (data) {
        const sessionId = data.sessionId;
        const clientId = data.clientId;
        if (sessionId)
            out += `\n[Session: ${sessionId}]\n`;
        if (clientId)
            out += `[Client: ${clientId}]\n`;
    }
    // Next tools hint
    const meta = resp._meta;
    if (meta?.nextSuggestedTools?.length) {
        out += `\nSuggested next: ${meta.nextSuggestedTools.join(', ')}\n`;
    }
    return out.trim();
}
// ─── UIResponse (builder-based formatters) ───────────────────────────────────
function renderUIResponse(resp) {
    let out = '';
    // Title / subtitle
    if (resp.title)
        out += heading(resp.title);
    if (resp.subtitle)
        out += line(resp.subtitle);
    // Banner
    const banner = resp.banner;
    if (banner?.text) {
        const icon = banner.icon || 'ℹ️';
        out += line(`${icon} ${banner.text}`);
    }
    // Progress
    const progress = resp.progress;
    if (progress) {
        const pct = progress.percent ?? (progress.total ? Math.round(((progress.current || 0) / progress.total) * 100) : 0);
        const lbl = progress.label || '';
        out += line(`Progress: ${pct}% ${lbl}`);
    }
    // Cards
    const cards = resp.cards;
    if (cards?.length) {
        for (const card of cards) {
            out += '\n';
            const badge = card.badge;
            out += line(`📄 ${card.title || 'Details'}${badge?.text ? ` [${badge.text}]` : ''}`);
            if (card.subtitle)
                out += line(`  ${card.subtitle}`);
            const fields = card.fields;
            if (fields?.length) {
                for (const f of fields) {
                    const icon = f.icon ? `${f.icon} ` : '';
                    out += field(`${icon}${f.label}`, f.value);
                }
            }
            const sections = card.sections;
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
            if (card.highlight)
                out += line(`  ℹ️ ${card.highlight}`);
            const actions = card.actions;
            if (actions?.length) {
                for (const a of actions) {
                    out += line(`  → ${a.label}`);
                }
            }
        }
    }
    // Standalone sections (outside cards)
    const sections = resp.sections;
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
    if (resp.message)
        out += line(`\n${resp.message}`);
    // Actions
    const actions = resp.actions;
    if (actions?.length) {
        out += '\n';
        for (const a of actions) {
            const icon = a.icon || '→';
            out += line(`${icon} ${a.label}`);
        }
    }
    // Data summary (key business values for ChatGPT context)
    const data = resp.data;
    if (data && Object.keys(data).length > 0) {
        out += '\n--- Data ---\n';
        for (const [key, val] of Object.entries(data)) {
            if (val === undefined || val === null)
                continue;
            if (typeof val === 'object') {
                out += field(key, JSON.stringify(val));
            }
            else {
                out += field(key, String(val));
            }
        }
    }
    // Next tools
    const meta = resp._meta;
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
export function toReadableText(resp) {
    if (!resp)
        return 'No data';
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
//# sourceMappingURL=toReadableText.js.map