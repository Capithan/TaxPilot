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
        input = `<select id="${id}" class="tp-input tp-select" ${required}>
          <option value="" disabled selected>${esc(c.placeholder || 'Select...')}</option>
          ${(c.options || []).map(o => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('')}
        </select>`;
        break;
      case 'textarea':
        input = `<textarea id="${id}" class="tp-input tp-textarea" placeholder="${esc(c.placeholder || '')}" rows="${c.rows || 3}" ${required}></textarea>`;
        break;
      case 'date':
        input = `<input type="date" id="${id}" class="tp-input" ${required}>`;
        break;
      case 'email':
        input = `<input type="email" id="${id}" class="tp-input" placeholder="${esc(c.placeholder || '')}" ${required}>`;
        break;
      case 'phone':
        input = `<input type="tel" id="${id}" class="tp-input" placeholder="${esc(c.placeholder || '')}" ${required}>`;
        break;
      case 'number':
        input = `<input type="number" id="${id}" class="tp-input" placeholder="${esc(c.placeholder || '')}" ${required}>`;
        break;
      default: // text
        input = `<input type="text" id="${id}" class="tp-input" placeholder="${esc(c.placeholder || '')}" ${required}>`;
    }

    const helpText = c.helpText ? `<div class="tp-field-help">${esc(c.helpText)}</div>` : '';

    this._pendingBinds.push(el => {
      const inp = el.querySelector(`#${id}`);
      if (inp) inp.addEventListener('change', () => {
        this.state.setFormValue(gid, c.id, inp.value);
      });
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
        const values = this.state.getFormValues(gid);
        // Merge form values into the action params
        if (c.action) {
          const action = { ...c.action };
          if (action.type === 'tool_call') {
            action.parameters = { ...(action.parameters || {}), ...values };
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
    const client = c.client || {};
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
