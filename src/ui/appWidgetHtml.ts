/**
 * MCP Apps Widget Template — ChatGPT App UI
 *
 * Returns a self-contained HTML document with inline CSS + JavaScript.
 * ChatGPT loads this via resources/read and then delivers tool data
 * to the iframe via the MCP Apps bridge (postMessage).
 *
 * Architecture (per https://developers.openai.com/apps-sdk/build/chatgpt-ui/):
 *   1. ChatGPT calls resources/read → gets this template (text/html;profile=mcp-app)
 *   2. ChatGPT sends structuredContent via ui/notifications/tool-result
 *   3. window.openai.toolOutput has the initial structuredContent
 *   4. Widget JS reads data and renders HRB-branded components
 */

export const APP_WIDGET_MIME_TYPE = 'text/html;profile=mcp-app';

export function getAppWidgetHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>TaxPilot — H&amp;R Block</title>
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --hrb-green: #00A13A; --hrb-green-dark: #008830; --hrb-green-light: #E6F5EC;
  --hrb-beige: #F5F0E8; --hrb-beige-dark: #EDE5D8;
  --hrb-text: #1a1a1a; --hrb-text-light: #555; --hrb-text-muted: #888;
  --hrb-border: #e0ddd5; --hrb-white: #ffffff;
  --hrb-danger: #D32F2F; --hrb-warning: #F9A825; --hrb-info: #1976D2;
  --hrb-radius: 12px; --hrb-radius-sm: 8px;
  --hrb-shadow: 0 2px 8px rgba(0,0,0,0.08); --hrb-shadow-lg: 0 4px 16px rgba(0,0,0,0.12);
}
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px; line-height: 1.5; color: var(--hrb-text);
  background: transparent; padding: 0; margin: 0; overflow-x: hidden;
}
#widget-root { max-width: 520px; margin: 0 auto; padding: 16px; }
.tp-structured { display: flex; flex-direction: column; gap: 12px; }

/* Loading state */
.tp-loading { text-align: center; padding: 40px 20px; color: var(--hrb-text-muted); }
.tp-loading-icon { font-size: 32px; margin-bottom: 8px; }
.tp-loading-text { font-size: 14px; }

/* Buttons */
.tp-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 10px 20px; border: none; border-radius: var(--hrb-radius-sm); font-size: 14px; font-weight: 600; line-height: 1.4; }
.tp-btn--primary { background: var(--hrb-green); color: #fff; }
.tp-btn--secondary { background: var(--hrb-beige); color: var(--hrb-text); border: 1px solid var(--hrb-border); }
.tp-btn--danger { background: var(--hrb-danger); color: #fff; }
.tp-btn--ghost { background: transparent; color: var(--hrb-green); }
.tp-btn--sm { padding: 6px 12px; font-size: 12px; }
.tp-btn--lg { padding: 14px 28px; font-size: 16px; }
.tp-btn-icon { font-size: 1.1em; }

/* Form Fields */
.tp-field { display: flex; flex-direction: column; gap: 4px; }
.tp-field-label { font-size: 13px; font-weight: 600; color: var(--hrb-text); }
.tp-required { color: var(--hrb-danger); margin-left: 2px; }
.tp-input { padding: 10px 12px; border: 1.5px solid var(--hrb-border); border-radius: var(--hrb-radius-sm); font-size: 14px; background: var(--hrb-white); color: var(--hrb-text); }
.tp-field-help { font-size: 12px; color: var(--hrb-text-muted); }

/* Form Group */
.tp-form-group { background: var(--hrb-white); border: 1px solid var(--hrb-border); border-radius: var(--hrb-radius); padding: 20px; }
.tp-form-title { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
.tp-form-desc { font-size: 13px; color: var(--hrb-text-light); margin-bottom: 16px; }
.tp-form-fields { display: flex; flex-direction: column; gap: 14px; margin-bottom: 16px; }

/* Multi-Select */
.tp-multisel-title { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
.tp-multisel-sub { font-size: 13px; color: var(--hrb-text-light); margin-bottom: 12px; }
.tp-multisel-options { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
.tp-mopt { padding: 14px 16px; border: 2px solid var(--hrb-border); border-radius: var(--hrb-radius-sm); background: var(--hrb-white); }
.tp-mopt-header { display: flex; align-items: center; gap: 12px; }
.tp-mopt-icon { font-size: 22px; flex-shrink: 0; }
.tp-mopt-text { flex: 1; }
.tp-mopt-label { font-weight: 600; font-size: 14px; display: flex; align-items: center; gap: 8px; }
.tp-mopt-desc { font-size: 12px; color: var(--hrb-text-light); margin-top: 2px; }
.tp-mopt-badge { font-size: 10px; padding: 2px 6px; border-radius: 4px; background: var(--hrb-green); color: #fff; font-weight: 600; }
.tp-mopt-check { width: 22px; height: 22px; border-radius: 50%; border: 2px solid var(--hrb-border); display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: transparent; }

/* Selection Card */
.tp-sel-title { font-size: 15px; font-weight: 600; margin-bottom: 10px; }
.tp-sel-options { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; }
.tp-sopt { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border: 2px solid var(--hrb-border); border-radius: var(--hrb-radius-sm); background: var(--hrb-white); }
.tp-sopt-icon { font-size: 24px; }
.tp-sopt-label { font-weight: 600; font-size: 14px; display: flex; align-items: center; gap: 6px; }
.tp-sopt-desc { font-size: 12px; color: var(--hrb-text-light); margin-top: 2px; }
.tp-sopt-badge { font-size: 10px; padding: 2px 6px; border-radius: 4px; background: var(--hrb-green); color: #fff; font-weight: 600; }

/* Badges */
.tp-badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
.tp-badge-icon { font-size: 1em; }
.tp-badge--success { background: #E8F5E9; color: #2E7D32; }
.tp-badge--warning { background: #FFF8E1; color: #F57F17; }
.tp-badge--error { background: #FFEBEE; color: #C62828; }
.tp-badge--info { background: #E3F2FD; color: #1565C0; }
.tp-badge--neutral { background: #F5F5F5; color: #616161; }
.tp-badge--brand { background: var(--hrb-green-light); color: var(--hrb-green-dark); }

/* Step Progress */
.tp-steps { display: flex; align-items: flex-start; gap: 0; margin: 8px 0; overflow-x: auto; }
.tp-step { display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 56px; }
.tp-step-dot { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; border: 2px solid var(--hrb-border); color: var(--hrb-text-muted); background: var(--hrb-white); }
.tp-step--done .tp-step-dot { background: var(--hrb-green); color: #fff; border-color: var(--hrb-green); }
.tp-step--active .tp-step-dot { border-color: var(--hrb-green); color: var(--hrb-green); background: var(--hrb-green-light); }
.tp-step-label { font-size: 10px; text-align: center; color: var(--hrb-text-muted); white-space: nowrap; }
.tp-step--active .tp-step-label { color: var(--hrb-green); font-weight: 600; }
.tp-step--done .tp-step-label { color: var(--hrb-text); }
.tp-step-line { flex: 1; height: 2px; background: var(--hrb-border); margin-top: 14px; min-width: 16px; align-self: stretch; }
.tp-step-line--done { background: var(--hrb-green); }

/* Progress Bar */
.tp-progress { margin: 4px 0; }
.tp-progress-header { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px; }
.tp-progress-label { color: var(--hrb-text-light); }
.tp-progress-pct { font-weight: 700; color: var(--hrb-green); }
.tp-progress-track { height: 8px; background: var(--hrb-beige); border-radius: 4px; overflow: hidden; }
.tp-progress-fill { height: 100%; background: var(--hrb-green); border-radius: 4px; }

/* Info Card */
.tp-card { background: var(--hrb-white); border: 1px solid var(--hrb-border); border-radius: var(--hrb-radius); padding: 16px; box-shadow: var(--hrb-shadow); }
.tp-card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.tp-card-title { font-size: 16px; font-weight: 700; }
.tp-card-fields { display: flex; flex-direction: column; gap: 8px; }
.tp-cardfield { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.tp-cardfield-icon { font-size: 15px; width: 20px; text-align: center; flex-shrink: 0; }
.tp-cardfield-label { color: var(--hrb-text-light); min-width: 90px; }
.tp-cardfield-value { font-weight: 600; color: var(--hrb-text); flex: 1; }
.tp-card-highlight { margin-top: 12px; padding: 10px 14px; background: #FFF8E1; border-left: 3px solid var(--hrb-warning); border-radius: 4px; font-size: 13px; color: #5D4037; }

/* Appointment Summary */
.tp-appt-summary { background: var(--hrb-white); border: 2px solid var(--hrb-green); border-radius: var(--hrb-radius); padding: 20px; box-shadow: var(--hrb-shadow-lg); }
.tp-appt-confid { text-align: center; font-size: 13px; color: var(--hrb-text-light); padding-bottom: 12px; border-bottom: 1px solid var(--hrb-border); margin-bottom: 16px; }
.tp-appt-sections { display: flex; flex-direction: column; gap: 16px; }
.tp-appt-section-title { font-size: 14px; font-weight: 700; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
.tp-appt-pro-header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.tp-appt-pro-name { font-size: 15px; font-weight: 700; }
.tp-appt-pro-title { font-size: 12px; color: var(--hrb-text-light); }
.tp-appt-pro-rating { font-size: 12px; color: var(--hrb-warning); }
.tp-appt-pro-specs { display: flex; flex-wrap: wrap; gap: 4px; }
.tp-stars { color: var(--hrb-warning); }

/* Tax Pro Card */
.tp-pro-card { background: var(--hrb-white); border: 1px solid var(--hrb-border); border-radius: var(--hrb-radius); padding: 16px; box-shadow: var(--hrb-shadow); }
.tp-pro-card--recommended { border-color: var(--hrb-green); border-width: 2px; }
.tp-pro-recommended { font-size: 12px; font-weight: 700; color: var(--hrb-green); margin-bottom: 8px; display: flex; align-items: center; gap: 4px; }
.tp-pro-header { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
.tp-pro-avatar { width: 40px; height: 40px; border-radius: 50%; background: var(--hrb-green); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 18px; flex-shrink: 0; }
.tp-pro-name { font-size: 15px; font-weight: 700; }
.tp-pro-title { font-size: 12px; color: var(--hrb-text-light); }
.tp-pro-rating { font-size: 12px; }
.tp-pro-specs { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; }
.tp-pro-reason { font-size: 12px; color: var(--hrb-text-light); font-style: italic; margin-bottom: 8px; }
.tp-pro-avail { font-size: 12px; color: var(--hrb-green); margin-bottom: 8px; }

/* Checklist */
.tp-checklist { background: var(--hrb-white); border: 1px solid var(--hrb-border); border-radius: var(--hrb-radius); overflow: hidden; }
.tp-checklist-header { display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: var(--hrb-beige); font-weight: 700; font-size: 14px; }
.tp-checklist-icon { font-size: 18px; }
.tp-checklist-counter { margin-left: auto; font-size: 12px; font-weight: 600; background: var(--hrb-green); color: #fff; padding: 2px 8px; border-radius: 10px; }
.tp-checklist-items { padding: 4px 0; }
.tp-chk-item { display: flex; align-items: flex-start; gap: 10px; padding: 10px 16px; border-bottom: 1px solid #f0ede5; }
.tp-chk-item:last-child { border-bottom: none; }
.tp-chk-status { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; margin-top: 1px; }
.tp-chk--done .tp-chk-status { background: var(--hrb-green); color: #fff; }
.tp-chk--pending .tp-chk-status { border: 2px solid var(--hrb-warning); color: var(--hrb-warning); }
.tp-chk--required .tp-chk-status { border: 2px solid var(--hrb-danger); color: var(--hrb-danger); }
.tp-chk-body { flex: 1; min-width: 0; }
.tp-chk-text { font-size: 13px; font-weight: 600; }
.tp-chk-desc { font-size: 11px; color: var(--hrb-text-muted); margin-top: 2px; }

/* Banner */
.tp-banner { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-radius: var(--hrb-radius-sm); font-size: 14px; font-weight: 600; }
.tp-banner--success { background: #E8F5E9; color: #2E7D32; }
.tp-banner--info    { background: #E3F2FD; color: #1565C0; }
.tp-banner--warning { background: #FFF8E1; color: #F57F17; }
.tp-banner--error   { background: #FFEBEE; color: #C62828; }
.tp-banner-icon { font-size: 18px; }
.tp-banner-text { flex: 1; }

/* Divider */
.tp-divider { display: flex; align-items: center; gap: 12px; margin: 8px 0; color: var(--hrb-text-muted); font-size: 12px; }
.tp-divider::before, .tp-divider::after { content: ''; flex: 1; height: 1px; background: var(--hrb-border); }
.tp-divider:empty::after { display: none; }
.tp-divider:empty { height: 1px; background: var(--hrb-border); }

/* Text Block */
.tp-text { margin: 2px 0; }
.tp-text--heading { font-size: 18px; font-weight: 700; color: var(--hrb-text); }
.tp-text--subheading { font-size: 15px; font-weight: 600; color: var(--hrb-text); }
.tp-text--body { font-size: 14px; color: var(--hrb-text-light); line-height: 1.5; }
.tp-text--caption { font-size: 12px; color: var(--hrb-text-muted); }

/* Form note */
.tp-form-note { font-size: 12px; color: var(--hrb-text-muted); text-align: center; margin-top: 8px; }

@keyframes confetti-pop { 0% { transform: scale(0.95); opacity: 0; } 50% { transform: scale(1.02); } 100% { transform: scale(1); opacity: 1; } }
.tp-banner[data-confetti="true"] { animation: confetti-pop 0.5s ease-out; }
</style>
</head>
<body>
<div id="widget-root">
  <div id="content" class="tp-structured">
    <div class="tp-loading">
      <div class="tp-loading-icon">🟢</div>
      <div class="tp-loading-text">TaxPilot — H&amp;R Block</div>
    </div>
  </div>
</div>

<script type="module">
// ─── HTML Escape ─────────────────────────────────────────────────────────────
function esc(text) {
  const s = String(text ?? '');
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ─── Component Renderers ─────────────────────────────────────────────────────
function renderBanner(c) {
  const icon = c.icon ? '<span class="tp-banner-icon">' + c.icon + '</span>' : '';
  const confetti = c.confetti ? 'data-confetti="true"' : '';
  return '<div class="tp-banner tp-banner--' + (c.variant || 'info') + '" ' + confetti + '>' + icon + '<span class="tp-banner-text">' + esc(c.text) + '</span></div>';
}

function renderTextBlock(c) {
  const cls = { heading: 'tp-text--heading', subheading: 'tp-text--subheading', caption: 'tp-text--caption' };
  return '<div class="tp-text ' + (cls[c.style] || 'tp-text--body') + '">' + esc(c.text) + '</div>';
}

function renderDivider(c) {
  const label = c.label ? '<span>' + esc(c.label) + '</span>' : '';
  return '<div class="tp-divider">' + label + '</div>';
}

function renderStepProgress(c) {
  const steps = c.steps || [];
  return '<div class="tp-steps">' + steps.map(function(s, i) {
    const cls = s.status === 'done' ? 'tp-step--done' : s.status === 'active' ? 'tp-step--active' : 'tp-step--upcoming';
    const icon = s.status === 'done' ? (s.icon || '\\u2713') : String(i + 1);
    const line = i < steps.length - 1
      ? '<div class="tp-step-line ' + (s.status === 'done' ? 'tp-step-line--done' : '') + '"></div>' : '';
    return '<div class="tp-step ' + cls + '"><div class="tp-step-dot">' + icon + '</div><div class="tp-step-label">' + esc(s.label) + '</div></div>' + line;
  }).join('') + '</div>';
}

function renderProgressBar(c) {
  const current = c.current || c.value || 0;
  const total = c.total || c.max || 100;
  const pct = Math.round((current / total) * 100);
  return '<div class="tp-progress"><div class="tp-progress-header"><span class="tp-progress-label">' + esc(c.label || '') + '</span><span class="tp-progress-pct">' + pct + '%</span></div><div class="tp-progress-track"><div class="tp-progress-fill" style="width:' + pct + '%"></div></div></div>';
}

function renderStatusBadge(c) {
  const icon = c.icon ? '<span class="tp-badge-icon">' + c.icon + '</span>' : '';
  return '<span class="tp-badge tp-badge--' + (c.variant || 'info') + '">' + icon + esc(c.text) + '</span>';
}

function renderFormGroup(c) {
  const title = c.title ? '<div class="tp-form-title">' + esc(c.title) + '</div>' : '';
  const subtitle = c.subtitle ? '<div class="tp-form-desc">' + esc(c.subtitle) + '</div>' : '';
  const fields = (c.fields || []).map(function(f) {
    const required = f.required ? '<span class="tp-required">*</span>' : '';
    let input = '';
    const fType = f.fieldType || f.type || 'text';
    if (fType === 'select') {
      const opts = (f.options || []).map(function(o) { return '<option value="' + esc(o.value) + '">' + esc(o.label) + '</option>'; }).join('');
      input = '<select class="tp-input tp-select"><option value="" disabled selected>' + esc(f.placeholder || 'Select...') + '</option>' + opts + '</select>';
    } else if (fType === 'textarea') {
      input = '<textarea class="tp-input tp-textarea" placeholder="' + esc(f.placeholder || '') + '" rows="3"></textarea>';
    } else {
      input = '<input type="' + esc(fType) + '" class="tp-input" placeholder="' + esc(f.placeholder || '') + '">';
    }
    const help = f.helperText ? '<div class="tp-field-help">' + esc(f.helperText) + '</div>' : '';
    return '<div class="tp-field"><label class="tp-field-label">' + esc(f.label) + required + '</label>' + input + help + '</div>';
  }).join('');
  return '<div class="tp-form-group">' + title + subtitle + '<div class="tp-form-fields">' + fields + '</div><div class="tp-form-note">\\uD83D\\uDCAC Answer in the chat to continue</div></div>';
}

function renderSelectionCard(c) {
  const title = c.title ? '<div class="tp-sel-title">' + esc(c.title) + '</div>' : '';
  const options = (c.options || []).map(function(opt) {
    const icon = opt.icon ? '<span class="tp-sopt-icon">' + opt.icon + '</span>' : '';
    const badge = opt.badge ? '<span class="tp-sopt-badge">' + esc(opt.badge) + '</span>' : '';
    const desc = opt.description ? '<div class="tp-sopt-desc">' + esc(opt.description) + '</div>' : '';
    return '<div class="tp-sopt">' + icon + '<div class="tp-sopt-text"><div class="tp-sopt-label">' + esc(opt.label) + badge + '</div>' + desc + '</div></div>';
  }).join('');
  return '<div class="tp-sel">' + title + '<div class="tp-sel-options">' + options + '</div><div class="tp-form-note">\\uD83D\\uDCAC Tell me your choice in the chat</div></div>';
}

function renderMultiSelect(c) {
  const title = c.title ? '<div class="tp-multisel-title">' + esc(c.title) + '</div>' : '';
  const subtitle = c.subtitle ? '<div class="tp-multisel-sub">' + esc(c.subtitle) + '</div>' : '';
  const options = (c.options || []).map(function(opt) {
    const icon = opt.icon ? '<span class="tp-mopt-icon">' + opt.icon + '</span>' : '';
    const desc = opt.description ? '<div class="tp-mopt-desc">' + esc(opt.description) + '</div>' : '';
    const badge = opt.badge ? '<span class="tp-mopt-badge">' + esc(opt.badge) + '</span>' : '';
    return '<div class="tp-mopt"><div class="tp-mopt-header">' + icon + '<div class="tp-mopt-text"><div class="tp-mopt-label">' + esc(opt.label) + badge + '</div>' + desc + '</div><div class="tp-mopt-check"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div></div></div>';
  }).join('');
  return '<div class="tp-multisel">' + title + subtitle + '<div class="tp-multisel-options">' + options + '</div><div class="tp-form-note">\\uD83D\\uDCAC Tell me your selections in the chat</div></div>';
}

function renderInfoCard(c) {
  const badgeObj = c.badge || {};
  const badge = badgeObj.text ? '<span class="tp-badge tp-badge--' + (badgeObj.variant || 'info') + '">' + esc(badgeObj.text) + '</span>' : '';
  const highlight = c.highlight ? '<div class="tp-card-highlight">' + esc(c.highlight) + '</div>' : '';
  const fields = (c.fields || []).map(function(f) {
    const icon = f.icon ? '<span class="tp-cardfield-icon">' + f.icon + '</span>' : '';
    return '<div class="tp-cardfield">' + icon + '<span class="tp-cardfield-label">' + esc(f.label) + '</span><span class="tp-cardfield-value">' + esc(f.value) + '</span></div>';
  }).join('');
  const actions = (c.actions || []).map(function(a) { return renderComponent(a); }).join('');
  return '<div class="tp-card"><div class="tp-card-head"><div class="tp-card-title">' + esc(c.title) + '</div>' + badge + '</div><div class="tp-card-fields">' + fields + '</div>' + highlight + (actions ? '<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">' + actions + '</div>' : '') + '</div>';
}

function renderButton(c) {
  const variantCls = { danger: 'tp-btn--danger', secondary: 'tp-btn--secondary', ghost: 'tp-btn--ghost', success: 'tp-btn--primary' };
  const cls = variantCls[c.variant] || 'tp-btn--primary';
  const sizeCls = c.size === 'sm' ? 'tp-btn--sm' : c.size === 'lg' ? 'tp-btn--lg' : '';
  const icon = c.icon ? '<span class="tp-btn-icon">' + c.icon + '</span>' : '';
  return '<span class="tp-btn ' + cls + ' ' + sizeCls + '" style="pointer-events:none;opacity:0.8">' + icon + '<span>' + esc(c.label) + '</span></span>';
}

function renderChecklist(c) {
  const icon = c.icon ? '<span class="tp-checklist-icon">' + c.icon + '</span>' : '';
  const counterObj = c.counter || {};
  const counter = counterObj.total != null ? '<span class="tp-checklist-counter">' + (counterObj.done || 0) + '/' + counterObj.total + '</span>' : '';
  const items = (c.items || []).map(function(item) {
    const statusCls = item.status === 'collected' ? 'tp-chk--done' : item.status === 'pending' ? 'tp-chk--pending' : 'tp-chk--required';
    const statusIcon = item.status === 'collected' ? '\\u2713' : item.status === 'pending' ? '\\u25CB' : '!';
    const desc = item.description ? '<div class="tp-chk-desc">' + esc(item.description) + '</div>' : '';
    return '<div class="tp-chk-item ' + statusCls + '"><div class="tp-chk-status">' + statusIcon + '</div><div class="tp-chk-body"><div class="tp-chk-text">' + esc(item.text) + '</div>' + desc + '</div></div>';
  }).join('');
  return '<div class="tp-checklist"><div class="tp-checklist-header">' + icon + '<span class="tp-checklist-title">' + esc(c.title) + '</span>' + counter + '</div><div class="tp-checklist-items">' + items + '</div></div>';
}

function renderTaxProCard(c) {
  const pro = c.taxPro || {};
  const recommended = c.recommended ? '<div class="tp-pro-recommended">\\u2B50 Best Match</div>' : '';
  const reason = c.matchReason ? '<div class="tp-pro-reason">' + esc(c.matchReason) + '</div>' : '';
  const rating = pro.rating || 0;
  const stars = '\\u2605'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '\\u00BD' : '');
  const specs = (pro.specializations || []).map(function(s) { return '<span class="tp-badge tp-badge--info">' + esc(s) + '</span>'; }).join(' ');
  const avail = pro.availability ? '<div class="tp-pro-avail">\\uD83D\\uDCC5 ' + esc(pro.availability) + '</div>' : '';
  const initial = ((pro.name || 'T') + '').charAt(0);
  return '<div class="tp-pro-card ' + (c.recommended ? 'tp-pro-card--recommended' : '') + '">' + recommended + '<div class="tp-pro-header"><div class="tp-pro-avatar">' + initial + '</div><div class="tp-pro-info"><div class="tp-pro-name">' + esc(pro.name) + '</div><div class="tp-pro-title">' + esc(pro.title) + '</div><div class="tp-pro-rating"><span class="tp-stars">' + stars + '</span> ' + rating + '</div></div></div><div class="tp-pro-specs">' + specs + '</div>' + reason + avail + '</div>';
}

function renderAppointmentSummary(c) {
  const apt = c.appointment || {};
  const pro = c.taxPro || {};
  const client = c.client || {};
  const confId = c.confirmationId ? '<div class="tp-appt-confid">Confirmation: <strong>' + esc(c.confirmationId) + '</strong></div>' : '';
  const rating = pro.rating || 0;
  const stars = '\\u2605'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '\\u00BD' : '');
  const specs = (pro.specializations || []).map(function(s) { return '<span class="tp-badge tp-badge--info">' + esc(s) + '</span>'; }).join(' ');

  let aptFields = '';
  if (apt.date) aptFields += '<div class="tp-cardfield"><span class="tp-cardfield-icon">\\uD83D\\uDCC6</span><span class="tp-cardfield-label">Date</span><span class="tp-cardfield-value">' + esc(apt.date) + '</span></div>';
  if (apt.time) aptFields += '<div class="tp-cardfield"><span class="tp-cardfield-icon">\\uD83D\\uDD50</span><span class="tp-cardfield-label">Time</span><span class="tp-cardfield-value">' + esc(apt.time) + '</span></div>';
  if (apt.duration) aptFields += '<div class="tp-cardfield"><span class="tp-cardfield-icon">\\u23F1</span><span class="tp-cardfield-label">Duration</span><span class="tp-cardfield-value">' + esc(apt.duration) + '</span></div>';
  if (apt.type) aptFields += '<div class="tp-cardfield"><span class="tp-cardfield-icon">' + (apt.type === 'Virtual' ? '\\uD83D\\uDCBB' : '\\uD83C\\uDFE2') + '</span><span class="tp-cardfield-label">Type</span><span class="tp-cardfield-value">' + esc(apt.type) + '</span></div>';
  if (apt.location) aptFields += '<div class="tp-cardfield"><span class="tp-cardfield-icon">\\uD83D\\uDCCD</span><span class="tp-cardfield-label">Location</span><span class="tp-cardfield-value">' + esc(apt.location) + '</span></div>';

  return '<div class="tp-appt-summary">' + confId + '<div class="tp-appt-sections"><div class="tp-appt-section"><div class="tp-appt-section-title">\\uD83D\\uDCC5 Appointment Details</div>' + aptFields + '</div><div class="tp-appt-section"><div class="tp-appt-section-title">\\uD83D\\uDC68\\u200D\\uD83D\\uDCBC Tax Professional</div><div class="tp-appt-pro-header"><div><div class="tp-appt-pro-name">' + esc(pro.name) + '</div><div class="tp-appt-pro-title">' + esc(pro.title) + '</div><div class="tp-appt-pro-rating"><span class="tp-stars">' + stars + '</span> ' + rating + '</div></div></div><div class="tp-appt-pro-specs">' + specs + '</div></div>' + (client.name ? '<div class="tp-appt-section"><div class="tp-appt-section-title">\\uD83D\\uDC64 Client</div><div class="tp-cardfield"><span class="tp-cardfield-label">Name</span><span class="tp-cardfield-value">' + esc(client.name) + '</span></div></div>' : '') + '</div></div>';
}

function renderCarousel(c) {
  const items = (c.items || []).map(function(item) {
    return '<div class="tp-carousel-item">' + renderComponent(item) + '</div>';
  }).join('');
  return '<div class="tp-carousel"><div class="tp-carousel-track" style="display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;padding:4px">' + items + '</div></div>';
}

// ─── Component Dispatcher ────────────────────────────────────────────────────
function renderComponent(c) {
  if (!c) return '';
  const kind = c.component || c.type;
  if (!kind) return '';
  switch (kind) {
    case 'Banner': case 'banner': return renderBanner(c);
    case 'TextBlock': case 'text_block': return renderTextBlock(c);
    case 'Divider': case 'divider': return renderDivider(c);
    case 'StepProgress': case 'step_progress': return renderStepProgress(c);
    case 'ProgressBar': case 'progress_bar': return renderProgressBar(c);
    case 'StatusBadge': case 'status_badge': return renderStatusBadge(c);
    case 'FormGroup': case 'form_group': return renderFormGroup(c);
    case 'SelectionCard': case 'selection_card': return renderSelectionCard(c);
    case 'MultiSelectCard': case 'multi_select': return renderMultiSelect(c);
    case 'InfoCard': case 'info_card': return renderInfoCard(c);
    case 'Button': case 'button': return renderButton(c);
    case 'Checklist': case 'checklist': return renderChecklist(c);
    case 'TaxProCard': case 'tax_pro_card': return renderTaxProCard(c);
    case 'AppointmentSummaryCard': case 'appointment_summary': return renderAppointmentSummary(c);
    case 'Carousel': case 'carousel': return renderCarousel(c);
    default: return '';
  }
}

// ─── UIResponse (builder format) renderer ────────────────────────────────────
function renderUIResponseBody(resp) {
  const parts = [];

  if (resp.title) parts.push('<div class="tp-text tp-text--heading">' + esc(resp.title) + '</div>');
  if (resp.subtitle) parts.push('<div class="tp-text tp-text--subheading">' + esc(resp.subtitle) + '</div>');

  // Banner
  if (resp.banner && resp.banner.text) parts.push(renderBanner(resp.banner));

  // Progress
  const progress = resp.progress;
  if (progress) {
    const pct = progress.percent != null ? progress.percent : (progress.total ? Math.round(((progress.current || 0) / progress.total) * 100) : 0);
    parts.push('<div class="tp-progress"><div class="tp-progress-header"><span class="tp-progress-label">' + esc(progress.label || '') + '</span><span class="tp-progress-pct">' + pct + '%</span></div><div class="tp-progress-track"><div class="tp-progress-fill" style="width:' + pct + '%"></div></div></div>');
  }

  // Cards
  if (resp.cards && resp.cards.length) {
    resp.cards.forEach(function(card) {
      const badgeObj = card.badge || {};
      const badge = badgeObj.text ? '<span class="tp-badge tp-badge--' + (badgeObj.variant || 'info') + '">' + esc(badgeObj.text) + '</span>' : '';
      const highlight = card.highlight ? '<div class="tp-card-highlight">' + esc(card.highlight) + '</div>' : '';
      const fields = (card.fields || []).map(function(f) {
        const icon = f.icon ? '<span class="tp-cardfield-icon">' + f.icon + '</span>' : '';
        return '<div class="tp-cardfield">' + icon + '<span class="tp-cardfield-label">' + esc(f.label) + '</span><span class="tp-cardfield-value">' + esc(f.value) + '</span></div>';
      }).join('');

      const sections = (card.sections || []).map(function(sec) {
        const items = (sec.items || []).map(function(item) {
          const icon = item.icon || (item.status === 'done' ? '\\u2705' : item.status === 'required' ? '\\u26A0\\uFE0F' : '\\u2022');
          const desc = item.description ? '<div class="tp-chk-desc">' + esc(item.description) + '</div>' : '';
          const statusCls = (item.status === 'collected' || item.status === 'done') ? 'tp-chk--done' : item.status === 'pending' ? 'tp-chk--pending' : '';
          return '<div class="tp-chk-item ' + statusCls + '"><div class="tp-chk-status">' + icon + '</div><div class="tp-chk-body"><div class="tp-chk-text">' + esc(item.text) + '</div>' + desc + '</div></div>';
        }).join('');
        return '<div style="margin-top:12px"><div class="tp-form-title" style="font-size:14px">' + esc(sec.title) + '</div><div class="tp-checklist-items">' + items + '</div></div>';
      }).join('');

      parts.push('<div class="tp-card"><div class="tp-card-head"><div class="tp-card-title">' + esc(card.title || 'Details') + '</div>' + badge + '</div><div class="tp-card-fields">' + fields + '</div>' + sections + highlight + '</div>');
    });
  }

  // Standalone sections
  if (resp.sections && resp.sections.length) {
    resp.sections.forEach(function(sec) {
      const icon = sec.icon || '';
      const items = (sec.items || []).map(function(item) {
        const sIcon = item.icon || (item.status === 'done' ? '\\u2705' : item.status === 'required' ? '\\u26A0\\uFE0F' : '\\u2022');
        const desc = item.description ? '<div class="tp-chk-desc">' + esc(item.description) + '</div>' : '';
        return '<div class="tp-chk-item"><div class="tp-chk-status">' + sIcon + '</div><div class="tp-chk-body"><div class="tp-chk-text">' + esc(item.text) + '</div>' + desc + '</div></div>';
      }).join('');
      parts.push('<div class="tp-checklist"><div class="tp-checklist-header"><span class="tp-checklist-icon">' + icon + '</span><span class="tp-checklist-title">' + esc(sec.title) + '</span></div><div class="tp-checklist-items">' + items + '</div></div>');
    });
  }

  // Message
  if (resp.message) parts.push('<div class="tp-text tp-text--body">' + esc(resp.message) + '</div>');

  // Actions
  if (resp.actions && resp.actions.length) {
    const btns = resp.actions.map(function(a) { return renderButton(a); }).join('');
    parts.push('<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">' + btns + '</div>');
  }

  return parts.join('\\n');
}

// ─── Main Render Function ────────────────────────────────────────────────────
function render(data) {
  const el = document.getElementById('content');
  if (!data || typeof data !== 'object') {
    el.innerHTML = '<div class="tp-loading"><div class="tp-loading-icon">\\uD83D\\uDFE2</div><div class="tp-loading-text">TaxPilot — H&amp;R Block</div><div class="tp-text tp-text--caption" style="margin-top:8px">Waiting for tool results…</div></div>';
    return;
  }

  let html = '';

  // StructuredUIResponse (components array)
  if (data.components && Array.isArray(data.components)) {
    html = data.components.map(renderComponent).join('\\n');
  }
  // UIResponse (builder format with type/title/cards)
  else if (data.type || data.title || data.cards) {
    html = renderUIResponseBody(data);
  }
  // Generic data — show as JSON
  else {
    html = '<div class="tp-text tp-text--heading">Tool Result</div><pre style="white-space:pre-wrap;font-size:12px;background:var(--hrb-beige);padding:12px;border-radius:8px;overflow:auto">' + esc(JSON.stringify(data, null, 2)) + '</pre>';
  }

  if (html.trim()) {
    el.innerHTML = html;
  }
}

// ─── Data Sources ────────────────────────────────────────────────────────────

// 1. Initial data from window.openai.toolOutput (set before script runs)
render(window.openai?.toolOutput);

// 2. Listen for updates via openai:set_globals event
window.addEventListener('openai:set_globals', function(event) {
  const data = event.detail?.globals?.toolOutput ?? window.openai?.toolOutput;
  if (data) render(data);
}, { passive: true });

// 3. Listen for MCP Apps bridge notifications (ui/notifications/tool-result)
window.addEventListener('message', function(event) {
  if (event.source !== window.parent) return;
  const message = event.data;
  if (!message || message.jsonrpc !== '2.0') return;
  if (message.method === 'ui/notifications/tool-result') {
    const data = message.params?.structuredContent ?? message.params;
    if (data) render(data);
  }
}, { passive: true });
</script>
</body>
</html>`;
}
