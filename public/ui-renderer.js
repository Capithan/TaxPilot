/**
 * TaxPilot Structured UI Renderer
 *
 * Interprets StructuredUIResponse JSON from the assistant and renders
 * interactive, HRB-branded HTML components inside the chat window.
 *
 * Usage:
 *   const renderer = new TaxPilotRenderer({ onAction, onNavigate });
 *   const html = renderer.render(structuredResponse);
 *   messageContentDiv.innerHTML = html;
 *   renderer.bind(messageContentDiv);         // wire up event handlers
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Session State Manager
// ═══════════════════════════════════════════════════════════════════════════════
class SessionStateManager {
  constructor() {
    this._state = {
      screen: 'home',
      sessionId: null,
      clientId: null,
      intakeProgress: 0,
      currentIntakeStep: null,
      taxProId: null,
      appointmentId: null,
      formData: {},
      selections: {},
    };
    this._listeners = [];
  }

  get state() { return { ...this._state }; }

  update(patch) {
    if (!patch || typeof patch !== 'object') return;
    this._state = { ...this._state, ...patch };
    this._listeners.forEach(fn => fn(this._state));
  }

  onUpdate(fn) {
    this._listeners.push(fn);
    return () => { this._listeners = this._listeners.filter(l => l !== fn); };
  }

  reset() {
    this._state = {
      screen: 'home', sessionId: null, clientId: null,
      intakeProgress: 0, currentIntakeStep: null,
      taxProId: null, appointmentId: null,
      formData: {}, selections: {},
    };
    this._listeners.forEach(fn => fn(this._state));
  }

  setFormValue(groupId, fieldId, value) {
    if (!this._state.formData[groupId]) this._state.formData[groupId] = {};
    this._state.formData[groupId][fieldId] = value;
  }

  getFormValues(groupId) { return this._state.formData[groupId] || {}; }

  toggleSelection(groupId, itemId) {
    if (!this._state.selections[groupId]) this._state.selections[groupId] = new Set();
    const set = this._state.selections[groupId];
    if (set.has(itemId)) set.delete(itemId); else set.add(itemId);
    return [...set];
  }

  setSelection(groupId, itemId) {
    this._state.selections[groupId] = new Set([itemId]);
    return [itemId];
  }

  getSelections(groupId) {
    return this._state.selections[groupId] ? [...this._state.selections[groupId]] : [];
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
// Renderer
// ═══════════════════════════════════════════════════════════════════════════════
class TaxPilotRenderer {
  /**
   * @param {Object} opts
   * @param {Function} opts.onAction   – called when a UI action fires
   *                                     (action) => void
   * @param {Function} opts.onNavigate – called when the screen changes
   *                                     (screen) => void
   * @param {SessionStateManager} opts.state
   */
  constructor(opts = {}) {
    this.onAction = opts.onAction || (() => {});
    this.onNavigate = opts.onNavigate || (() => {});
    this.state = opts.state || new SessionStateManager();
    this._pendingBinds = [];
  }

  // ─── Entry point ────────────────────────────────────────────────
  /**
   * Attempt to parse JSON from an assistant message, detect if it is a
   * StructuredUIResponse (has `_meta.renderer === "structured_ui"` or
   * a `components` array), and render it.  Returns null if text is not
   * structured UI JSON.
   */
  tryParse(text) {
    // Try to extract JSON block from the message (may be wrapped in ```json)
    let json = text;
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) json = fenced[1].trim();

    // Also try finding raw JSON object
    if (!json.startsWith('{')) {
      const idx = json.indexOf('{');
      if (idx !== -1) json = json.slice(idx);
    }

    try {
      const obj = JSON.parse(json);
      if (obj && Array.isArray(obj.components) && obj.screen) return obj;
      if (obj && obj._meta && obj._meta.renderer === 'structured_ui') return obj;
    } catch { /* not JSON */ }
    return null;
  }

  /**
   * Render a StructuredUIResponse to an HTML string.
   * Call `bind(containerEl)` afterwards to attach event handlers.
   */
  render(response) {
    if (!response || !response.components) return '';
    this._pendingBinds = [];

    // Apply state updates
    if (response.stateUpdates) {
      this.state.update(response.stateUpdates);
      if (response.stateUpdates.screen) {
        this.onNavigate(response.stateUpdates.screen);
      }
    }

    const parts = response.components.map(c => this._renderComponent(c));
    return `<div class="tp-structured" data-screen="${response.screen || ''}">${parts.join('')}</div>`;
  }

  /** Attach event listeners to rendered HTML inside containerEl */
  bind(container) {
    if (!container) return;
    this._pendingBinds.forEach(fn => fn(container));
    this._pendingBinds = [];
  }

  // ─── Component dispatcher ──────────────────────────────────────
  _renderComponent(c) {
    if (!c || !c.type) return '';
    switch (c.type) {
      case 'button':            return this._renderButton(c);
      case 'form_field':        return this._renderFormField(c);
      case 'form_group':        return this._renderFormGroup(c);
      case 'multi_select':      return this._renderMultiSelect(c);
      case 'selection_card':    return this._renderSelectionCard(c);
      case 'status_badge':      return this._renderStatusBadge(c);
      case 'step_progress':     return this._renderStepProgress(c);
      case 'progress_bar':      return this._renderProgressBar(c);
      case 'info_card':         return this._renderInfoCard(c);
      case 'appointment_summary': return this._renderAppointmentSummary(c);
      case 'tax_pro_card':      return this._renderTaxProCard(c);
      case 'checklist':         return this._renderChecklist(c);
      case 'banner':            return this._renderBanner(c);
      case 'divider':           return this._renderDivider(c);
      case 'text_block':        return this._renderTextBlock(c);
      case 'carousel':          return this._renderCarousel(c);
      case 'accordion':         return this._renderAccordion(c);
      case 'tooltip':           return this._renderTooltip(c);
      case 'notification':      return this._renderNotification(c);
      case 'alert':             return this._renderAlert(c);
      case 'tab_group':         return this._renderTabGroup(c);
      case 'stat_card':         return this._renderStatCard(c);
      default:                  return `<!-- unknown component: ${c.type} -->`;
    }
  }

  // ─── Buttons ───────────────────────────────────────────────────
  _renderButton(c) {
    const id = this._uid('btn');
    const variantClass = c.variant === 'danger' ? 'tp-btn--danger'
      : c.variant === 'secondary' ? 'tp-btn--secondary'
      : c.variant === 'ghost' ? 'tp-btn--ghost'
      : 'tp-btn--primary';
    const sizeClass = c.size === 'sm' ? 'tp-btn--sm' : c.size === 'lg' ? 'tp-btn--lg' : '';
    const disabled = c.disabled ? 'disabled' : '';
    const icon = c.icon ? `<span class="tp-btn-icon">${c.icon}</span>` : '';
    const loading = c.loading ? '<span class="tp-btn-spinner"></span>' : '';

    this._pendingBinds.push(el => {
      const btn = el.querySelector(`#${id}`);
      if (btn) btn.addEventListener('click', () => this._handleAction(c.action));
    });

    return `<button id="${id}" class="tp-btn ${variantClass} ${sizeClass}" ${disabled}>
      ${loading}${icon}<span>${esc(c.label)}</span>
    </button>`;
  }

  // ─── Form Field ────────────────────────────────────────────────
  _renderFormField(c, groupId) {
    const id = this._uid('field');
    const gid = groupId || '__global';
    const required = c.required ? 'required' : '';
    const requiredMark = c.required ? '<span class="tp-required">*</span>' : '';
    let input = '';

    switch (c.fieldType) {
      case 'select':
        input = `<select id="${id}" data-field-id="${esc(c.id)}" class="tp-input tp-select" ${required}>
          <option value="" disabled selected>${esc(c.placeholder || 'Select...')}</option>
          ${(c.options || []).map(o => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('')}
        </select>`;
        break;
      case 'textarea':
        input = `<textarea id="${id}" data-field-id="${esc(c.id)}" class="tp-input tp-textarea" placeholder="${esc(c.placeholder || '')}" rows="${c.rows || 3}" ${required}></textarea>`;
        break;
      case 'date': {
        // Use three <select> dropdowns — works reliably on every mobile browser.
        // A hidden <input> carries the combined YYYY-MM-DD value for the DOM-flush
        // path that the form submit handler uses.
        const monId = this._uid('dmon');
        const dayId = this._uid('dday');
        const yrId  = this._uid('dyr');
        const monthNames = ['January','February','March','April','May','June',
                            'July','August','September','October','November','December'];
        const monthOpts = monthNames.map((m, i) =>
          `<option value="${String(i + 1).padStart(2, '0')}">${m}</option>`
        ).join('');
        const dayOpts = Array.from({ length: 31 }, (_, i) =>
          `<option value="${String(i + 1).padStart(2, '0')}">${i + 1}</option>`
        ).join('');
        const curYear = new Date().getFullYear();
        const yearOpts = Array.from({ length: 101 }, (_, i) => curYear - 16 - i)
          .map(y => `<option value="${y}">${y}</option>`).join('');
        input =
          `<div class="tp-date-selects">` +
          `<input type="hidden" id="${id}" data-field-id="${esc(c.id)}" value="">` +
          `<select id="${monId}" class="tp-input tp-select tp-date-sel" aria-label="Month">` +
            `<option value="" disabled selected>Month</option>${monthOpts}` +
          `</select>` +
          `<select id="${dayId}" class="tp-input tp-select tp-date-sel" aria-label="Day">` +
            `<option value="" disabled selected>Day</option>${dayOpts}` +
          `</select>` +
          `<select id="${yrId}" class="tp-input tp-select tp-date-sel" aria-label="Year">` +
            `<option value="" disabled selected>Year</option>${yearOpts}` +
          `</select>` +
          `</div>`;
        // Bind: combine the three selects into a single YYYY-MM-DD string
        this._pendingBinds.push(el => {
          const hidden = el.querySelector(`#${id}`);
          const mon    = el.querySelector(`#${monId}`);
          const day    = el.querySelector(`#${dayId}`);
          const yr     = el.querySelector(`#${yrId}`);
          const combine = () => {
            const m = mon ? mon.value : '', d = day ? day.value : '', y = yr ? yr.value : '';
            const val = (m && d && y) ? `${y}-${m}-${d}` : '';
            if (hidden) hidden.value = val;
            this.state.setFormValue(gid, c.id, val);
          };
          [mon, day, yr].forEach(sel => {
            if (sel) {
              sel.addEventListener('change', combine);
              sel.addEventListener('input', combine);
            }
          });
        });
        break;
      }
      case 'email':
        input = `<input type="email" id="${id}" data-field-id="${esc(c.id)}" class="tp-input" placeholder="${esc(c.placeholder || '')}" ${required}>`;
        break;
      case 'phone':
        input = `<input type="tel" id="${id}" data-field-id="${esc(c.id)}" class="tp-input" placeholder="${esc(c.placeholder || '')}" ${required}>`;
        break;
      case 'number':
        input = `<input type="number" id="${id}" data-field-id="${esc(c.id)}" class="tp-input" placeholder="${esc(c.placeholder || '')}" ${required}>`;
        break;
      default: // text
        input = `<input type="text" id="${id}" data-field-id="${esc(c.id)}" class="tp-input" placeholder="${esc(c.placeholder || '')}" ${required}>`;
    }

    const helpText = c.helpText ? `<div class="tp-field-help">${esc(c.helpText)}</div>` : '';

    this._pendingBinds.push(el => {
      const inp = el.querySelector(`#${id}`);
      if (inp) {
        // Use 'input' (fires on every keystroke/selection) so mobile users who tap
        // Submit without blurring the last field still have their value captured.
        const update = () => this.state.setFormValue(gid, c.id, inp.value);
        inp.addEventListener('input', update);
        inp.addEventListener('change', update); // covers selects/date pickers
      }
    });

    return `<div class="tp-field">
      <label class="tp-field-label" for="${id}">${esc(c.label)}${requiredMark}</label>
      ${input}
      ${helpText}
    </div>`;
  }

  // ─── Form Group ────────────────────────────────────────────────
  _renderFormGroup(c) {
    const gid = this._uid('fgroup');
    const title = c.title ? `<div class="tp-form-title">${esc(c.title)}</div>` : '';
    const description = c.description ? `<div class="tp-form-desc">${esc(c.description)}</div>` : '';
    const fields = (c.fields || []).map(f => this._renderFormField(f, gid)).join('');
    const submitLabel = c.submitLabel || 'Submit';
    const submitId = this._uid('fsubmit');

    this._pendingBinds.push(el => {
      const btn = el.querySelector(`#${submitId}`);
      if (btn) btn.addEventListener('click', () => {
        // Flush any un-blurred field values directly from the DOM before reading state.
        // This ensures the last focused input on mobile (never blurred before tap) is captured.
        el.querySelectorAll(`[data-group="${gid}"] [data-field-id]`).forEach(inp => {
          this.state.setFormValue(gid, inp.dataset.fieldId, inp.value);
        });
        const values = this.state.getFormValues(gid);

        // Disable button + show loading; store original label so it can be
        // restored by the error handler in chat.html if the REST call fails.
        btn.setAttribute('data-original-label', btn.textContent.trim());
        btn.setAttribute('data-form-pending', 'true');
        btn.disabled = true;
        btn.innerHTML = '<span class="tp-btn-spinner"></span> Sending…';

        if (c.action) {
          const action = { ...c.action };
          if (action.type === 'tool_call') {
            action.parameters = { ...(action.parameters || {}), formData: values };
          } else if (action.type === 'submit_form') {
            action.formData = values;
          }
          this._handleAction(action);
        }
      });
    });

    return `<div class="tp-form-group" data-group="${gid}">
      ${title}${description}
      <div class="tp-form-fields">${fields}</div>
      <button id="${submitId}" class="tp-btn tp-btn--primary tp-form-submit">${esc(submitLabel)}</button>
    </div>`;
  }

  // ─── Multi-Select ──────────────────────────────────────────────
  _renderMultiSelect(c) {
    const gid = this._uid('msel');
    const title = c.title ? `<div class="tp-multisel-title">${esc(c.title)}</div>` : '';
    const subtitle = c.subtitle ? `<div class="tp-multisel-sub">${esc(c.subtitle)}</div>` : '';
    const isMulti = c.multiSelect !== false;
    const submitLabel = c.submitLabel || 'Continue';
    const submitId = this._uid('msubmit');

    const options = (c.options || []).map(opt => {
      const oid = this._uid('mopt');
      const icon = opt.icon ? `<span class="tp-mopt-icon">${opt.icon}</span>` : '';
      const badge = opt.badge ? `<span class="tp-mopt-badge">${esc(opt.badge)}</span>` : '';
      const desc = opt.description ? `<div class="tp-mopt-desc">${esc(opt.description)}</div>` : '';

      this._pendingBinds.push(el => {
        const optEl = el.querySelector(`#${oid}`);
        if (optEl) optEl.addEventListener('click', () => {
          if (isMulti) {
            this.state.toggleSelection(gid, opt.id);
            optEl.classList.toggle('tp-mopt--selected');
          } else {
            // Single-select: deselect siblings
            const parent = optEl.parentElement;
            parent.querySelectorAll('.tp-mopt--selected').forEach(s => s.classList.remove('tp-mopt--selected'));
            this.state.setSelection(gid, opt.id);
            optEl.classList.add('tp-mopt--selected');
          }
        });
      });

      return `<div id="${oid}" class="tp-mopt" data-value="${esc(opt.id)}">
        <div class="tp-mopt-header">
          ${icon}
          <div class="tp-mopt-text">
            <div class="tp-mopt-label">${esc(opt.label)}${badge}</div>
            ${desc}
          </div>
          <div class="tp-mopt-check"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>
        </div>
      </div>`;
    }).join('');

    this._pendingBinds.push(el => {
      const btn = el.querySelector(`#${submitId}`);
      if (btn) btn.addEventListener('click', () => {
        const selected = this.state.getSelections(gid);
        if (c.minSelect && selected.length < c.minSelect) return;

        // Disable button + show loading; store original label for error restore
        btn.setAttribute('data-original-label', btn.textContent.trim());
        btn.setAttribute('data-form-pending', 'true');
        btn.disabled = true;
        btn.innerHTML = '<span class="tp-btn-spinner"></span> Sending…';

        if (c.action) {
          const action = { ...c.action };
          if (action.type === 'tool_call') {
            action.parameters = { ...(action.parameters || {}), selections: selected };
          }
          this._handleAction(action);
        }
      });
    });

    return `<div class="tp-multisel" data-group="${gid}">
      ${title}${subtitle}
      <div class="tp-multisel-options">${options}</div>
      <button id="${submitId}" class="tp-btn tp-btn--primary">${esc(submitLabel)}</button>
    </div>`;
  }

  // ─── Selection Card  (single-select grid) ─────────────────────
  _renderSelectionCard(c) {
    const gid = this._uid('sel');
    const title = c.title ? `<div class="tp-sel-title">${esc(c.title)}</div>` : '';
    const options = (c.options || []).map(opt => {
      const oid = this._uid('sopt');
      const icon = opt.icon ? `<span class="tp-sopt-icon">${opt.icon}</span>` : '';
      const badge = opt.badge ? `<span class="tp-sopt-badge">${esc(opt.badge)}</span>` : '';
      const desc = opt.description ? `<div class="tp-sopt-desc">${esc(opt.description)}</div>` : '';

      this._pendingBinds.push(el => {
        const optEl = el.querySelector(`#${oid}`);
        if (optEl) optEl.addEventListener('click', () => {
          // Visually select
          const parent = optEl.closest('.tp-sel-options');
          parent.querySelectorAll('.tp-sopt--selected').forEach(s => s.classList.remove('tp-sopt--selected'));
          optEl.classList.add('tp-sopt--selected');
          // Fire action with selection
          if (c.action) {
            const action = { ...c.action };
            if (action.type === 'tool_call') {
              action.parameters = { ...(action.parameters || {}), selection: opt.id };
            } else if (action.type === 'send_message') {
              action.text = opt.label;
            }
            this._handleAction(action);
          }
        });
      });

      return `<div id="${oid}" class="tp-sopt" data-value="${esc(opt.id)}">
        ${icon}
        <div class="tp-sopt-text">
          <div class="tp-sopt-label">${esc(opt.label)}${badge}</div>
          ${desc}
        </div>
      </div>`;
    }).join('');

    return `<div class="tp-sel" data-group="${gid}">
      ${title}
      <div class="tp-sel-options">${options}</div>
    </div>`;
  }

  // ─── Status Badge ──────────────────────────────────────────────
  _renderStatusBadge(c) {
    const v = c.variant || 'info';
    const icon = c.icon ? `<span class="tp-badge-icon">${c.icon}</span>` : '';
    return `<span class="tp-badge tp-badge--${v}">${icon}${esc(c.text)}</span>`;
  }

  // ─── Step Progress ─────────────────────────────────────────────
  _renderStepProgress(c) {
    const steps = (c.steps || []).map((s, i) => {
      const cls = s.status === 'done' ? 'tp-step--done'
        : s.status === 'active' ? 'tp-step--active'
        : 'tp-step--upcoming';
      const icon = s.status === 'done' ? (s.icon || '✓') : String(i + 1);
      const line = i < (c.steps || []).length - 1
        ? `<div class="tp-step-line ${s.status === 'done' ? 'tp-step-line--done' : ''}"></div>`
        : '';
      return `<div class="tp-step ${cls}">
        <div class="tp-step-dot">${icon}</div>
        <div class="tp-step-label">${esc(s.label)}</div>
      </div>${line}`;
    }).join('');

    return `<div class="tp-steps">${steps}</div>`;
  }

  // ─── Progress Bar ──────────────────────────────────────────────
  _renderProgressBar(c) {
    const pct = c.max ? Math.round((c.value / c.max) * 100) : c.value;
    const label = c.label || '';
    return `<div class="tp-progress">
      <div class="tp-progress-header">
        <span class="tp-progress-label">${esc(label)}</span>
        <span class="tp-progress-pct">${pct}%</span>
      </div>
      <div class="tp-progress-track">
        <div class="tp-progress-fill" style="width:${pct}%"></div>
      </div>
    </div>`;
  }

  // ─── Info Card ─────────────────────────────────────────────────
  _renderInfoCard(c) {
    const badge = c.badge
      ? `<span class="tp-badge tp-badge--${c.badge.variant || 'info'}">${esc(c.badge.text)}</span>`
      : '';
    const highlight = c.highlight
      ? `<div class="tp-card-highlight">${esc(c.highlight)}</div>`
      : '';
    const fields = (c.fields || []).map(f => {
      const icon = f.icon ? `<span class="tp-cardfield-icon">${f.icon}</span>` : '';
      return `<div class="tp-cardfield">
        ${icon}
        <span class="tp-cardfield-label">${esc(f.label)}</span>
        <span class="tp-cardfield-value">${esc(f.value)}</span>
      </div>`;
    }).join('');

    return `<div class="tp-card">
      <div class="tp-card-head">
        <div class="tp-card-title">${esc(c.title)}</div>
        ${badge}
      </div>
      <div class="tp-card-fields">${fields}</div>
      ${highlight}
    </div>`;
  }

  // ─── Appointment Summary ───────────────────────────────────────
  _renderAppointmentSummary(c) {
    const apt = c.appointment || {};
    const pro = c.taxPro || {};
    const extra = c.extras || {};

    const confId = extra.confirmationId
      ? `<div class="tp-appt-confid">Confirmation: <strong>${esc(extra.confirmationId)}</strong></div>`
      : '';

    const starsFull = Math.floor(pro.rating || 0);
    const starsEl = '★'.repeat(starsFull) + (pro.rating % 1 >= 0.5 ? '½' : '');

    const specialties = (pro.specializations || []).map(s =>
      `<span class="tp-badge tp-badge--info">${esc(s)}</span>`
    ).join(' ');

    const actions = (extra.actions || []).map(a => this._renderComponent(a)).join('');

    return `<div class="tp-appt-summary">
      ${confId}
      <div class="tp-appt-sections">
        <div class="tp-appt-section">
          <div class="tp-appt-section-title">📅 Appointment Details</div>
          <div class="tp-cardfield"><span class="tp-cardfield-icon">📆</span><span class="tp-cardfield-label">Date</span><span class="tp-cardfield-value">${esc(apt.date || '')}</span></div>
          <div class="tp-cardfield"><span class="tp-cardfield-icon">🕐</span><span class="tp-cardfield-label">Time</span><span class="tp-cardfield-value">${esc(apt.time || '')}</span></div>
          <div class="tp-cardfield"><span class="tp-cardfield-icon">⏱</span><span class="tp-cardfield-label">Duration</span><span class="tp-cardfield-value">${esc(apt.duration || '')}</span></div>
          <div class="tp-cardfield"><span class="tp-cardfield-icon">${apt.type === 'Virtual' ? '💻' : '🏢'}</span><span class="tp-cardfield-label">Type</span><span class="tp-cardfield-value">${esc(apt.type || '')}</span></div>
          ${apt.location ? `<div class="tp-cardfield"><span class="tp-cardfield-icon">📍</span><span class="tp-cardfield-label">Location</span><span class="tp-cardfield-value">${esc(apt.location)}</span></div>` : ''}
        </div>
        <div class="tp-appt-section">
          <div class="tp-appt-section-title">👨‍💼 Your Tax Professional</div>
          <div class="tp-appt-pro-header">
            <div class="tp-appt-pro-info">
              <div class="tp-appt-pro-name">${esc(pro.name || '')}</div>
              <div class="tp-appt-pro-title">${esc(pro.title || '')}</div>
              <div class="tp-appt-pro-rating"><span class="tp-stars">${starsEl}</span> ${pro.rating || ''}</div>
            </div>
          </div>
          <div class="tp-appt-pro-specs">${specialties}</div>
        </div>
      </div>
      ${actions ? `<div class="tp-appt-actions">${actions}</div>` : ''}
    </div>`;
  }

  // ─── Tax Pro Card ──────────────────────────────────────────────
  _renderTaxProCard(c) {
    const pro = c.taxPro || {};
    const recommended = c.recommended ? '<div class="tp-pro-recommended">⭐ Best Match</div>' : '';
    const reason = c.matchReason ? `<div class="tp-pro-reason">${esc(c.matchReason)}</div>` : '';
    const starsFull = Math.floor(pro.rating || 0);
    const starsEl = '★'.repeat(starsFull) + (pro.rating % 1 >= 0.5 ? '½' : '');
    const specialties = (pro.specializations || []).map(s =>
      `<span class="tp-badge tp-badge--info">${esc(s)}</span>`
    ).join(' ');
    const avail = pro.availability
      ? `<div class="tp-pro-avail">📅 ${esc(pro.availability)}</div>`
      : '';
    const actions = (c.actions || []).map(a => this._renderComponent(a)).join('');

    return `<div class="tp-pro-card ${c.recommended ? 'tp-pro-card--recommended' : ''}">
      ${recommended}
      <div class="tp-pro-header">
        <div class="tp-pro-avatar">${(pro.name || 'T').charAt(0)}</div>
        <div class="tp-pro-info">
          <div class="tp-pro-name">${esc(pro.name || '')}</div>
          <div class="tp-pro-title">${esc(pro.title || '')}</div>
          <div class="tp-pro-rating"><span class="tp-stars">${starsEl}</span> ${pro.rating || ''}</div>
        </div>
      </div>
      <div class="tp-pro-specs">${specialties}</div>
      ${reason}${avail}
      ${actions ? `<div class="tp-pro-actions">${actions}</div>` : ''}
    </div>`;
  }

  // ─── Checklist ─────────────────────────────────────────────────
  _renderChecklist(c) {
    const icon = c.icon ? `<span class="tp-checklist-icon">${c.icon}</span>` : '';
    const counter = c.counter
      ? `<span class="tp-checklist-counter">${c.counter.done}/${c.counter.total}</span>`
      : '';
    const items = (c.items || []).map(item => {
      const statusCls = item.status === 'collected' ? 'tp-chk--done'
        : item.status === 'pending' ? 'tp-chk--pending'
        : 'tp-chk--required';
      const statusIcon = item.status === 'collected' ? '✓'
        : item.status === 'pending' ? '○'
        : '!';
      const desc = item.description ? `<div class="tp-chk-desc">${esc(item.description)}</div>` : '';
      const actions = (item.actions || []).map(a => this._renderComponent(a)).join('');
      return `<div class="tp-chk-item ${statusCls}">
        <div class="tp-chk-status">${statusIcon}</div>
        <div class="tp-chk-body">
          <div class="tp-chk-text">${esc(item.text)}</div>
          ${desc}
        </div>
        ${actions ? `<div class="tp-chk-actions">${actions}</div>` : ''}
      </div>`;
    }).join('');

    return `<div class="tp-checklist">
      <div class="tp-checklist-header">
        ${icon}<span class="tp-checklist-title">${esc(c.title)}</span>${counter}
      </div>
      <div class="tp-checklist-items">${items}</div>
    </div>`;
  }

  // ─── Banner ────────────────────────────────────────────────────
  _renderBanner(c) {
    const v = c.variant || 'info';
    const icon = c.icon ? `<span class="tp-banner-icon">${c.icon}</span>` : '';
    const dismissId = c.dismissible ? this._uid('bdis') : null;
    const dismiss = c.dismissible
      ? `<button id="${dismissId}" class="tp-banner-dismiss">&times;</button>`
      : '';

    if (dismissId) {
      this._pendingBinds.push(el => {
        const btn = el.querySelector(`#${dismissId}`);
        if (btn) btn.addEventListener('click', () => {
          btn.closest('.tp-banner').style.display = 'none';
        });
      });
    }

    return `<div class="tp-banner tp-banner--${v}">
      ${icon}<span class="tp-banner-text">${esc(c.text)}</span>${dismiss}
    </div>`;
  }

  // ─── Divider ───────────────────────────────────────────────────
  _renderDivider(c) {
    const label = c.label ? `<span class="tp-divider-label">${esc(c.label)}</span>` : '';
    return `<div class="tp-divider">${label}</div>`;
  }

  // ─── Text Block ────────────────────────────────────────────────
  _renderTextBlock(c) {
    const cls = c.style === 'heading' ? 'tp-text--heading'
      : c.style === 'subheading' ? 'tp-text--subheading'
      : c.style === 'caption' ? 'tp-text--caption'
      : 'tp-text--body';
    return `<div class="tp-text ${cls}">${esc(c.text)}</div>`;
  }

  // ─── Carousel ──────────────────────────────────────────────────
  _renderCarousel(c) {
    const items = (c.items || []).map(item => {
      return `<div class="tp-carousel-item">${this._renderComponent(item)}</div>`;
    }).join('');

    const cid = this._uid('carousel');

    this._pendingBinds.push(el => {
      const track = el.querySelector(`#${cid}`);
      if (!track) return;
      const prevBtn = track.parentElement.querySelector('.tp-carousel-prev');
      const nextBtn = track.parentElement.querySelector('.tp-carousel-next');
      if (prevBtn) prevBtn.addEventListener('click', () => { track.scrollBy({ left: -300, behavior: 'smooth' }); });
      if (nextBtn) nextBtn.addEventListener('click', () => { track.scrollBy({ left: 300, behavior: 'smooth' }); });
    });

    return `<div class="tp-carousel">
      <button class="tp-carousel-nav tp-carousel-prev">&lsaquo;</button>
      <div class="tp-carousel-track" id="${cid}">${items}</div>
      <button class="tp-carousel-nav tp-carousel-next">&rsaquo;</button>
    </div>`;
  }

  // ─── Accordion (BDS hrb-accordion pattern) ─────────────────
  _renderAccordion(c) {
    const items = (c.items || []).map((item, i) => {
      const id = this._uid('acc');
      const contentId = this._uid('accp');
      const expanded = item.expanded ? 'true' : 'false';
      const openClass = item.expanded ? ' tp-acc-item--open' : '';
      const icon = item.icon ? `<span class="tp-acc-icon">${item.icon}</span>` : '';
      const badge = item.badge ? `<span class="tp-badge tp-badge--info">${esc(item.badge)}</span>` : '';
      const content = item.components
        ? item.components.map(sub => this._renderComponent(sub)).join('')
        : `<div class="tp-acc-text">${esc(item.content || '')}</div>`;

      this._pendingBinds.push(el => {
        const trigger = el.querySelector(`#${id}`);
        if (trigger) trigger.addEventListener('click', () => {
          const panel = el.querySelector(`#${contentId}`);
          const parent = trigger.closest('.tp-acc-item');
          const isOpen = parent.classList.toggle('tp-acc-item--open');
          trigger.setAttribute('aria-expanded', isOpen);
          panel.hidden = !isOpen;
        });
      });

      return `<div class="tp-acc-item${openClass}">
        <button id="${id}" class="tp-acc-trigger" aria-expanded="${expanded}" aria-controls="${contentId}">
          ${icon}<span class="tp-acc-title">${esc(item.title)}</span>${badge}
          <svg class="tp-acc-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div id="${contentId}" class="tp-acc-panel" role="region" ${item.expanded ? '' : 'hidden'}>
          ${content}
        </div>
      </div>`;
    }).join('');

    const title = c.title ? `<div class="tp-acc-group-title">${esc(c.title)}</div>` : '';
    return `<div class="tp-accordion">${title}${items}</div>`;
  }

  // ─── Tooltip (wraps child text with hover info) ───────────────
  _renderTooltip(c) {
    const position = c.position || 'top';
    const text = c.text || '';
    const tip = c.tooltip || '';
    return `<span class="tp-tooltip">
      <span>${esc(text)}</span>
      <span class="tp-tooltip-text tp-tooltip--${position}">${esc(tip)}</span>
    </span>`;
  }

  // ─── Notification (triggers a toast in the UI) ────────────────
  _renderNotification(c) {
    const type = c.variant || 'info';
    const duration = c.duration || 4000;
    // Fire the toast when this component is bound
    this._pendingBinds.push(() => {
      if (typeof showToast === 'function') {
        showToast(c.message || c.text || '', type, duration);
      }
    });
    // Also render an inline message if showInline is set
    if (c.showInline) {
      const icon = c.icon || '';
      return `<div class="tp-banner tp-banner--${type}">
        ${icon ? `<span class="tp-banner-icon">${icon}</span>` : ''}<span class="tp-banner-text">${esc(c.message || c.text || '')}</span>
      </div>`;
    }
    return ''; // Toast-only, no inline content
  }

  // ─── Alert (inline alert box, distinct from banner) ───────────
  _renderAlert(c) {
    const v = c.variant || 'info';
    const icon = c.icon ? `<span class="tp-alert-icon">${c.icon}</span>` : '';
    const title = c.title ? `<div class="tp-alert-title">${esc(c.title)}</div>` : '';
    const actions = (c.actions || []).map(a => this._renderComponent(a)).join('');
    const dismissId = c.dismissible ? this._uid('adis') : null;
    const dismiss = c.dismissible
      ? `<button id="${dismissId}" class="tp-alert-dismiss" aria-label="Dismiss">&times;</button>`
      : '';

    if (dismissId) {
      this._pendingBinds.push(el => {
        const btn = el.querySelector(`#${dismissId}`);
        if (btn) btn.addEventListener('click', () => {
          btn.closest('.tp-alert').style.display = 'none';
        });
      });
    }

    return `<div class="tp-alert tp-alert--${v}" role="alert">
      ${icon}
      <div class="tp-alert-body">
        ${title}
        <div class="tp-alert-message">${esc(c.text || c.message || '')}</div>
        ${actions ? `<div class="tp-alert-actions">${actions}</div>` : ''}
      </div>
      ${dismiss}
    </div>`;
  }

  // ─── Tab Group ─────────────────────────────────────────────────
  _renderTabGroup(c) {
    const gid = this._uid('tabs');
    const tabs = (c.tabs || []).map((tab, i) => {
      const tid = this._uid('tab');
      const pid = this._uid('tpanel');
      const active = i === 0;
      const content = (tab.components || []).map(sub => this._renderComponent(sub)).join('')
        || `<div class="tp-text tp-text--body">${esc(tab.content || '')}</div>`;

      this._pendingBinds.push(el => {
        const tabBtn = el.querySelector(`#${tid}`);
        if (tabBtn) tabBtn.addEventListener('click', () => {
          // Deactivate siblings
          const group = tabBtn.closest('.tp-tabs');
          group.querySelectorAll('.tp-tab--active').forEach(t => t.classList.remove('tp-tab--active'));
          group.querySelectorAll('.tp-tab-panel--active').forEach(p => {
            p.classList.remove('tp-tab-panel--active');
            p.hidden = true;
          });
          // Activate this tab
          tabBtn.classList.add('tp-tab--active');
          tabBtn.setAttribute('aria-selected', 'true');
          const panel = group.querySelector(`#${pid}`);
          if (panel) {
            panel.classList.add('tp-tab-panel--active');
            panel.hidden = false;
          }
        });
      });

      return {
        tab: `<button id="${tid}" class="tp-tab${active ? ' tp-tab--active' : ''}" role="tab" aria-selected="${active}" aria-controls="${pid}">${tab.icon ? `<span class="tp-tab-icon">${tab.icon}</span>` : ''}${esc(tab.label)}</button>`,
        panel: `<div id="${pid}" class="tp-tab-panel${active ? ' tp-tab-panel--active' : ''}" role="tabpanel" ${active ? '' : 'hidden'}>${content}</div>`,
      };
    });

    const title = c.title ? `<div class="tp-tabs-title">${esc(c.title)}</div>` : '';
    return `<div class="tp-tabs" data-group="${gid}">
      ${title}
      <div class="tp-tab-list" role="tablist">${tabs.map(t => t.tab).join('')}</div>
      <div class="tp-tab-panels">${tabs.map(t => t.panel).join('')}</div>
    </div>`;
  }

  // ─── Stat Card (key metric display) ───────────────────────────
  _renderStatCard(c) {
    const icon = c.icon ? `<span class="tp-stat-icon">${c.icon}</span>` : '';
    const trend = c.trend
      ? `<span class="tp-stat-trend tp-stat-trend--${c.trend.direction || 'neutral'}">${c.trend.direction === 'up' ? '↑' : c.trend.direction === 'down' ? '↓' : '→'} ${esc(c.trend.text || '')}</span>`
      : '';
    return `<div class="tp-stat-card">
      ${icon}
      <div class="tp-stat-value">${esc(c.value)}</div>
      <div class="tp-stat-label">${esc(c.label)}</div>
      ${trend}
    </div>`;
  }

  // ─── Action handler ────────────────────────────────────────────
  _handleAction(action) {
    if (!action) return;
    this.onAction(action);
  }

  // ─── Utilities ─────────────────────────────────────────────────
  _uid(prefix) {
    return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
// Helper
// ═══════════════════════════════════════════════════════════════════════════════
function esc(text) {
  if (typeof text !== 'string') return String(text ?? '');
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}


// ═══════════════════════════════════════════════════════════════════════════════
// Screen ↔ Flow mapping  (maps session screens to the flow-stages bar)
// ═══════════════════════════════════════════════════════════════════════════════
const SCREEN_TO_STAGE = {
  home: 'welcome',
  service_selection: 'welcome',
  intake: 'intake',
  summary: 'summary',
  document_checklist: 'checklist',
  taxpro_matching: 'routing',
  appointment_booking: 'appointment',
  confirmation: 'complete',
  complete: 'complete',
};


// ═══════════════════════════════════════════════════════════════════════════════
// Export to global scope for chat.html
// ═══════════════════════════════════════════════════════════════════════════════
window.TaxPilotRenderer = TaxPilotRenderer;
window.SessionStateManager = SessionStateManager;
window.SCREEN_TO_STAGE = SCREEN_TO_STAGE;
