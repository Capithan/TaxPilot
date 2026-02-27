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
.tp-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 10px 20px; border: none; border-radius: var(--hrb-radius-sm); font-size: 14px; font-weight: 600; line-height: 1.4; cursor: pointer; -webkit-tap-highlight-color: rgba(0,163,58,0.15); touch-action: manipulation; }
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
.tp-input { padding: 10px 12px; border: 1.5px solid var(--hrb-border); border-radius: var(--hrb-radius-sm); font-size: 16px; background: var(--hrb-white); color: var(--hrb-text); -webkit-appearance: none; appearance: none; }
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

/* Interactive: Submit button in forms */
.tp-btn-submit { width:100%; margin-top:4px; cursor:pointer; border:none; }
.tp-btn-submit:hover { filter:brightness(1.1); }
.tp-btn-submit:active { transform:scale(0.98); }
.tp-btn-submit:disabled { opacity:0.5; cursor:wait; }
/* Interactive: Clickable selection options */
.tp-sopt[data-select-option] { cursor:pointer; transition:border-color 0.15s,background 0.15s; -webkit-tap-highlight-color:rgba(0,163,58,0.15); touch-action:manipulation; }
.tp-sopt[data-select-option]:hover { border-color:var(--hrb-green); background:var(--hrb-green-light); }
/* Interactive: Toggleable multi-select */
.tp-mopt[data-multi-option] { cursor:pointer; transition:border-color 0.15s,background 0.15s; -webkit-tap-highlight-color:rgba(0,163,58,0.15); touch-action:manipulation; }
.tp-mopt[data-multi-option]:hover { border-color:var(--hrb-green); }
.tp-mopt--selected { border-color:var(--hrb-green)!important; background:var(--hrb-green-light); }
.tp-mopt--selected .tp-mopt-check { border-color:var(--hrb-green); background:var(--hrb-green); color:#fff; }
/* Interactive: Clickable buttons (both tool-call and message buttons) */
.tp-btn[data-btn-tool], .tp-btn[data-btn-msg] { cursor:pointer; opacity:1!important; pointer-events:auto!important; transition:filter 0.15s; -webkit-tap-highlight-color:rgba(0,163,58,0.15); touch-action:manipulation; }
.tp-btn[data-btn-tool]:hover, .tp-btn[data-btn-msg]:hover { filter:brightness(1.1); }
.tp-btn[data-btn-tool]:active, .tp-btn[data-btn-msg]:active { transform:scale(0.98); }

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

<script>
// ─── Globals ─────────────────────────────────────────────────────────────────
var _formId = 0;
var _multiId = 0;

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

// Normalize action to handle both naming conventions:
// components.builders uses {toolName, toolArgs}, intake.ts uses {tool, parameters}
function normalizeAction(act) {
  if (!act) return null;
  if (act.type !== 'tool_call') return act;
  return {
    type: act.type,
    tool: act.tool || act.toolName,
    parameters: act.parameters || act.toolArgs || {}
  };
}

function renderFormGroup(c) {
  var fid = 'form-' + (++_formId);
  const title = c.title ? '<div class="tp-form-title">' + esc(c.title) + '</div>' : '';
  const desc = c.subtitle || c.description;
  const subtitle = desc ? '<div class="tp-form-desc">' + esc(desc) + '</div>' : '';
  // Allow both submitAction (builder schema) and action (legacy schema)
  const submitAction = c.submitAction || c.action;
  const fields = (c.fields || []).map(function(f) {
    const required = f.required ? '<span class="tp-required">*</span>' : '';
    let input = '';
    const fType = f.fieldType || f.type || 'text';
    if (fType === 'select') {
      const opts = (f.options || []).map(function(o) { return '<option value="' + esc(o.value) + '">' + esc(o.label) + '</option>'; }).join('');
      input = '<select class="tp-input tp-select" data-field-id="' + esc(f.id || f.label) + '"><option value="" disabled selected>' + esc(f.placeholder || 'Select...') + '</option>' + opts + '</select>';
    } else if (fType === 'textarea') {
      input = '<textarea class="tp-input tp-textarea" data-field-id="' + esc(f.id || f.label) + '" placeholder="' + esc(f.placeholder || '') + '" rows="3"></textarea>';
    } else if (fType === 'date') {
      // Use text input with pattern for date fields — type="date" is unreliable in Android WebViews
      input = '<input type="text" inputmode="numeric" class="tp-input" data-field-id="' + esc(f.id || f.label) + '" placeholder="' + esc(f.placeholder || 'MM/DD/YYYY') + '" pattern="[0-9]{2}/[0-9]{2}/[0-9]{4}" maxlength="10">';
    } else if (fType === 'phone') {
      input = '<input type="tel" class="tp-input" data-field-id="' + esc(f.id || f.label) + '" placeholder="' + esc(f.placeholder || '') + '">';
    } else {
      input = '<input type="' + esc(fType) + '" class="tp-input" data-field-id="' + esc(f.id || f.label) + '" placeholder="' + esc(f.placeholder || '') + '">';
    }
    const help = f.helperText ? '<div class="tp-field-help">' + esc(f.helperText) + '</div>' : '';
    return '<div class="tp-field"><label class="tp-field-label">' + esc(f.label) + required + '</label>' + input + help + '</div>';
  }).join('');
  var footer = c.submitLabel
    ? '<button class="tp-btn tp-btn--primary tp-btn--lg tp-btn-submit" data-form-submit="' + fid + '">' + esc(c.submitLabel) + '</button>'
    : '<div class="tp-form-note">\\uD83D\\uDCAC Answer in the chat to continue</div>';
  // Embed the tool_call action as data attribute so click handler can call the tool directly
  var actionAttr = '';
  var nAct = normalizeAction(submitAction);
  if (nAct && nAct.type === 'tool_call' && nAct.tool) {
    actionAttr = ' data-form-action="' + JSON.stringify(nAct).replace(/"/g, '&quot;') + '"';
  }
  return '<div class="tp-form-group" data-form-id="' + fid + '"' + actionAttr + '>' + title + subtitle + '<div class="tp-form-fields">' + fields + '</div>' + footer + '</div>';
}

function renderSelectionCard(c) {
  const title = c.title ? '<div class="tp-sel-title">' + esc(c.title) + '</div>' : '';
  const selAction = c.action || c.submitAction;
  const options = (c.options || []).map(function(opt) {
    const icon = opt.icon ? '<span class="tp-sopt-icon">' + opt.icon + '</span>' : '';
    const badge = opt.badge ? '<span class="tp-sopt-badge">' + esc(opt.badge) + '</span>' : '';
    const desc = opt.description ? '<div class="tp-sopt-desc">' + esc(opt.description) + '</div>' : '';
    var valAttr = ' data-select-value="' + esc(opt.value || opt.id || opt.label) + '"';
    // Per-option action: if the option has its own action, embed it so the click handler can call the right tool
    var optActionAttr = '';
    var nOptAct = normalizeAction(opt.action);
    if (nOptAct && nOptAct.type === 'tool_call' && nOptAct.tool) {
      optActionAttr = ' data-select-action="' + JSON.stringify(nOptAct).replace(/"/g, '&quot;') + '"';
    }
    return '<div class="tp-sopt" data-select-option="' + esc(opt.label) + '"' + valAttr + optActionAttr + '>' + icon + '<div class="tp-sopt-text"><div class="tp-sopt-label">' + esc(opt.label) + badge + '</div>' + desc + '</div></div>';
  }).join('');
  // Embed the tool_call action on the wrapper so click handler can call the tool directly
  var selActionAttr = '';
  var nSelAct = normalizeAction(selAction);
  if (nSelAct && nSelAct.type === 'tool_call' && nSelAct.tool) {
    selActionAttr = ' data-sel-action="' + JSON.stringify(nSelAct).replace(/"/g, '&quot;') + '"';
  }
  return '<div class="tp-sel"' + selActionAttr + '>' + title + '<div class="tp-sel-options">' + options + '</div></div>';
}

function renderMultiSelect(c) {
  var mid = 'multi-' + (++_multiId);
  const title = c.title ? '<div class="tp-multisel-title">' + esc(c.title) + '</div>' : '';
  const subtitle = c.subtitle ? '<div class="tp-multisel-sub">' + esc(c.subtitle) + '</div>' : '';
  const multiAction = c.submitAction || c.action;
  const options = (c.options || []).map(function(opt) {
    const icon = opt.icon ? '<span class="tp-mopt-icon">' + opt.icon + '</span>' : '';
    const desc = opt.description ? '<div class="tp-mopt-desc">' + esc(opt.description) + '</div>' : '';
    const badge = opt.badge ? '<span class="tp-mopt-badge">' + esc(opt.badge) + '</span>' : '';
    var mValAttr = opt.value ? ' data-multi-value="' + esc(opt.value) + '"' : '';
    return '<div class="tp-mopt" data-multi-option="' + esc(opt.label) + '"' + mValAttr + '><div class="tp-mopt-header">' + icon + '<div class="tp-mopt-text"><div class="tp-mopt-label">' + esc(opt.label) + badge + '</div>' + desc + '</div><div class="tp-mopt-check"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div></div></div>';
  }).join('');
  // Embed tool_call action on the wrapper for direct tool invocation
  var multiActionAttr = '';
  var nMultiAct = normalizeAction(multiAction);
  if (nMultiAct && nMultiAct.type === 'tool_call' && nMultiAct.tool) {
    multiActionAttr = ' data-multi-action="' + JSON.stringify(nMultiAct).replace(/"/g, '&quot;') + '"';
  }
  var submitBtn = c.submitLabel
    ? '<button class="tp-btn tp-btn--primary tp-btn--lg tp-btn-submit" data-multi-submit="' + mid + '">' + esc(c.submitLabel) + '</button>'
    : '<button class="tp-btn tp-btn--primary tp-btn-submit" data-multi-submit="' + mid + '">Continue \u2192</button>';
  return '<div class="tp-multisel" data-multi-id="' + mid + '"' + multiActionAttr + '>' + title + subtitle + '<div class="tp-multisel-options">' + options + '</div>' + submitBtn + '</div>';
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
  // If action is a tool_call, wire up direct tool invocation via the bridge
  var nBtnAct = normalizeAction(c.action);
  if (nBtnAct && nBtnAct.type === 'tool_call' && nBtnAct.tool) {
    var params = JSON.stringify(nBtnAct.parameters || {}).replace(/"/g, '&quot;');
    return '<button class="tp-btn ' + cls + ' ' + sizeCls + '" data-btn-tool="' + esc(nBtnAct.tool) + '" data-btn-params="' + params + '" data-btn-msg="Call ' + esc(nBtnAct.tool) + '" style="border:none">' + icon + '<span>' + esc(c.label) + '</span></button>';
  }
  // Otherwise, send a follow-up message
  var actionMsg = c.label || '';
  if (actionMsg) {
    return '<button class="tp-btn ' + cls + ' ' + sizeCls + '" data-btn-msg="' + esc(actionMsg) + '" style="border:none">' + icon + '<span>' + esc(c.label) + '</span></button>';
  }
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

// ─── Bridge Helpers ──────────────────────────────────────────────────────────
var _rpcId = 0;
var _rpcCallbacks = {};

/** Send a JSON-RPC 2.0 request to the host and return a promise for the result */
function rpcRequest(method, params) {
  return new Promise(function(resolve, reject) {
    var id = ++_rpcId;
    _rpcCallbacks[id] = { resolve: resolve, reject: reject };
    window.parent.postMessage({ jsonrpc: '2.0', id: id, method: method, params: params || {} }, '*');
    // Timeout after 15 seconds
    setTimeout(function() {
      if (_rpcCallbacks[id]) { delete _rpcCallbacks[id]; reject(new Error('RPC timeout: ' + method)); }
    }, 15000);
  });
}

/** Send a follow-up message to the ChatGPT conversation */
function sendMessage(text) {
  window.parent.postMessage({ jsonrpc: '2.0', method: 'ui/message', params: { role: 'user', content: [{ type: 'text', text: text }] } }, '*');
}

/** Call an MCP tool from the widget via the bridge */
function callTool(toolName, args) {
  // Prefer Apps SDK bridge when available (per OpenAI docs)
  if (window.openai && typeof window.openai.callTool === 'function') {
    try {
      var p = window.openai.callTool(toolName, args || {});
      // Ensure we always return a promise
      if (p && typeof p.then === 'function') return p;
      return Promise.resolve(p);
    } catch (e) {
      console.warn('[TaxPilot] window.openai.callTool threw synchronously:', e);
      // Fall through to RPC bridge
    }
  }
  // Fallback to MCP Apps JSON-RPC bridge (postMessage to parent)
  return rpcRequest('tools/call', { name: toolName, arguments: args || {} });
}

/** Update model-visible context when UI state changes */
function updateModelContext(text) {
  rpcRequest('ui/update-model-context', { content: [{ type: 'text', text: text }] }).catch(function() {});
}

/** Request a display mode change (inline, fullscreen, pip) */
function requestDisplayMode(mode) {
  if (window.openai && typeof window.openai.requestDisplayMode === 'function') {
    return window.openai.requestDisplayMode({ mode: mode });
  }
  return rpcRequest('ui/request-display-mode', { mode: mode });
}

/** Open an external link via the host */
function openExternal(href) {
  if (window.openai && typeof window.openai.openExternal === 'function') {
    return window.openai.openExternal({ href: href });
  }
  window.open(href, '_blank');
}

// ─── Generic tool call + re-render helper ──────────────────────────────────
var _pendingRender = false; // Flag: are we waiting for a tool result to render?

function callToolAndRender(toolName, params, btn, origLabel) {
  if (btn) { btn.disabled = true; btn.textContent = 'Working\u2026'; }
  _pendingRender = true;

  // Show a loading indicator in the content area so the user sees feedback
  var contentEl = document.getElementById('content');
  var prevHtml = contentEl ? contentEl.innerHTML : '';
  if (contentEl) {
    contentEl.insertAdjacentHTML('beforeend',
      '<div id="tp-loading-overlay" style="text-align:center;padding:24px;color:var(--hrb-text-muted)">'
      + '<div style="font-size:24px;margin-bottom:8px">\u23F3</div>'
      + '<div style="font-size:14px">Processing ' + esc(toolName.replace(/_/g, ' ')) + '\u2026</div>'
      + '</div>');
  }

  function cleanupLoading() {
    var overlay = document.getElementById('tp-loading-overlay');
    if (overlay) overlay.remove();
  }

  function restoreBtn() {
    if (btn && btn.parentNode) { btn.disabled = false; btn.textContent = origLabel; }
  }

  function tryRender(data) {
    if (data && (data.components || data.screen || data.type || data.title)) {
      _pendingRender = false;
      cleanupLoading();
      render(data);
      // Scroll to top of widget so user sees the new content
      var root = document.getElementById('widget-root');
      if (root) root.scrollTop = 0;
      return true;
    }
    return false;
  }

  callTool(toolName, params).then(function(result) {
    console.log('[TaxPilot] callTool resolved for', toolName, typeof result);

    // 1. Standard: { structuredContent: { components, screen, … } }
    if (result && result.structuredContent && tryRender(result.structuredContent)) {
      restoreBtn();
      updateModelContext('User progressed via ' + toolName);
      return;
    }
    // 2. Nested result wrapper
    if (result && result.result && result.result.structuredContent && tryRender(result.result.structuredContent)) {
      restoreBtn();
      updateModelContext('User progressed via ' + toolName);
      return;
    }
    // 3. Raw structured content at top level
    if (result && typeof result === 'object' && tryRender(result)) {
      restoreBtn();
      updateModelContext('User progressed via ' + toolName);
      return;
    }
    // 4. Check toolOutput (may have been updated by ChatGPT already)
    if (window.openai && window.openai.toolOutput && tryRender(window.openai.toolOutput)) {
      restoreBtn();
      updateModelContext('User progressed via ' + toolName);
      return;
    }

    // 5. If nothing rendered yet, wait briefly for openai:set_globals to fire
    console.log('[TaxPilot] No immediate render data — waiting for set_globals event');
    setTimeout(function() {
      if (!_pendingRender) return; // Already rendered by set_globals listener
      // Last check: maybe toolOutput was updated
      if (window.openai && window.openai.toolOutput && tryRender(window.openai.toolOutput)) {
        restoreBtn();
        updateModelContext('User progressed via ' + toolName);
        return;
      }
      // Still nothing — send as chat message so the model can handle it
      console.warn('[TaxPilot] No render data after timeout — sending follow-up message');
      cleanupLoading();
      _pendingRender = false;
      restoreBtn();
      if (window.openai && typeof window.openai.sendFollowUpMessage === 'function') {
        window.openai.sendFollowUpMessage({ prompt: 'Run ' + toolName + ' with parameters: ' + JSON.stringify(params) });
      } else {
        sendMessage('Please run ' + toolName + ' with ' + JSON.stringify(params));
      }
    }, 3000);

  }).catch(function(err) {
    console.error('[TaxPilot] Tool call failed:', toolName, err);
    cleanupLoading();
    _pendingRender = false;
    restoreBtn();
    // Fallback: ask the model to run the tool via chat
    if (window.openai && typeof window.openai.sendFollowUpMessage === 'function') {
      window.openai.sendFollowUpMessage({ prompt: 'Run ' + toolName + ' with parameters: ' + JSON.stringify(params) });
    } else {
      sendMessage('Please run ' + toolName + ' with ' + JSON.stringify(params));
    }
  });
}

// ─── Date field auto-format helper (MM/DD/YYYY) ─────────────────────────────
document.getElementById('content').addEventListener('input', function(e) {
  var inp = e.target;
  if (!inp || !inp.dataset || !inp.dataset.fieldId) return;
  // Only auto-format inputs with maxlength=10 (our date fields)
  if (inp.getAttribute('maxlength') !== '10') return;
  var raw = inp.value.replace(/[^0-9]/g, '');
  if (raw.length > 8) raw = raw.substr(0, 8);
  var formatted = '';
  if (raw.length > 4) { formatted = raw.substr(0, 2) + '/' + raw.substr(2, 2) + '/' + raw.substr(4); }
  else if (raw.length > 2) { formatted = raw.substr(0, 2) + '/' + raw.substr(2); }
  else { formatted = raw; }
  if (inp.value !== formatted) inp.value = formatted;
});

// ─── Event Delegation (interactive forms, selections, buttons) ──────────────
document.getElementById('content').addEventListener('click', function(e) {
  var t = e.target;
  while (t && t !== this) {
    // Form submit button — call tool directly with formData merged into params
    if (t.dataset && t.dataset.formSubmit) {
      var formEl = document.querySelector('[data-form-id="' + t.dataset.formSubmit + '"]');
      if (formEl) {
        var origLabel = t.textContent || 'Continue \u2192';
        var inputs = formEl.querySelectorAll('.tp-input');
        var formData = {};
        var emptyRequired = false;
        inputs.forEach(function(inp) {
          var fieldId = inp.dataset.fieldId || '';
          var val = (inp.value || '').trim();
          if (fieldId && val) formData[fieldId] = val;
          // Check if required field is empty
          var fieldDiv = inp.closest('.tp-field');
          if (fieldDiv && fieldDiv.querySelector('.tp-required') && !val) {
            inp.style.borderColor = 'var(--hrb-danger)';
            emptyRequired = true;
          } else {
            inp.style.borderColor = '';
          }
        });
        if (Object.keys(formData).length === 0 || emptyRequired) {
          // Show validation message briefly
          t.textContent = 'Please fill required fields';
          setTimeout(function() { t.textContent = origLabel; }, 2000);
          return;
        }
        var actionStr = formEl.dataset.formAction;
        if (actionStr) {
          try {
            var action = JSON.parse(actionStr);
            if (action.tool) {
              var params = Object.assign({}, action.parameters || {}, { formData: formData });
              callToolAndRender(action.tool, params, t, origLabel);
              return;
            }
          } catch(ex) { console.error('[TaxPilot] Failed to parse form action:', ex); }
        }
        // Fallback: send as chat message
        var parts = [];
        inputs.forEach(function(inp) {
          var lbl = inp.closest('.tp-field');
          var labelText = lbl ? (lbl.querySelector('.tp-field-label') || {}).textContent : '';
          labelText = (labelText || '').replace('*','').trim();
          var val = (inp.value || '').trim();
          if (labelText && val) parts.push(labelText + ': ' + val);
        });
        if (parts.length > 0) {
          t.disabled = true; t.textContent = 'Sending\u2026';
          sendMessage(parts.join(', '));
        }
      }
      return;
    }
    // Selection card option click — call tool directly with selection value
    if (t.dataset && t.dataset.selectOption) {
      var selItem = t.closest('[data-select-option]') || t;
      var selValue = selItem.dataset.selectValue || selItem.dataset.selectOption;
      // 1. Check per-option action first (each option can have its own tool)
      if (selItem.dataset.selectAction) {
        try {
          var optAction = JSON.parse(selItem.dataset.selectAction);
          if (optAction.tool) {
            selItem.style.pointerEvents = 'none'; selItem.style.opacity = '0.6';
            var optParams = Object.assign({}, optAction.parameters || {}, { selection: selValue });
            callToolAndRender(optAction.tool, optParams, null, null);
            return;
          }
        } catch(ex) {}
      }
      // 2. Fall back to card-level action
      var selWrapper = selItem.closest('[data-sel-action]');
      if (selWrapper && selWrapper.dataset.selAction) {
        try {
          var selAction = JSON.parse(selWrapper.dataset.selAction);
          if (selAction.tool) {
            selItem.style.pointerEvents = 'none'; selItem.style.opacity = '0.6';
            var selParams = Object.assign({}, selAction.parameters || {}, { selection: selValue });
            callToolAndRender(selAction.tool, selParams, null, null);
            return;
          }
        } catch(ex) {}
      }
      sendMessage(selValue);
      return;
    }
    // Multi-select toggle
    if (t.dataset && t.dataset.multiOption != null) {
      var mopt = t.closest('[data-multi-option]') || t;
      mopt.classList.toggle('tp-mopt--selected');
      return;
    }
    // Multi-select submit — call tool directly with selections array
    if (t.dataset && t.dataset.multiSubmit) {
      var container = document.querySelector('[data-multi-id="' + t.dataset.multiSubmit + '"]');
      if (container) {
        var selected = container.querySelectorAll('.tp-mopt--selected');
        var values = [];
        selected.forEach(function(el) { var lbl = el.querySelector('.tp-mopt-label'); values.push(el.dataset.multiValue || el.dataset.multiOption || (lbl && lbl.textContent ? lbl.textContent.trim() : '')); });
        if (values.length === 0) return;
        var multiActionStr = container.dataset.multiAction;
        if (multiActionStr) {
          try {
            var multiAction = JSON.parse(multiActionStr);
            if (multiAction.tool) {
              var multiParams = Object.assign({}, multiAction.parameters || {}, { selections: values });
              callToolAndRender(multiAction.tool, multiParams, t, t.textContent);
              return;
            }
          } catch(ex) {}
        }
        // Fallback: send as message
        t.disabled = true; t.textContent = 'Sending\u2026';
        sendMessage(values.join(', '));
      }
      return;
    }
    // Button with tool_call action — call the tool directly via bridge
    if (t.dataset && t.dataset.btnTool) {
      var toolName = t.dataset.btnTool;
      var toolParams = {};
      try { toolParams = JSON.parse(t.dataset.btnParams || '{}'); } catch(e) {}
      callToolAndRender(toolName, toolParams, t, t.textContent);
      return;
    }
    // Button with message
    if (t.dataset && t.dataset.btnMsg) {
      sendMessage(t.dataset.btnMsg);
      return;
    }
    t = t.parentElement;
  }
});

// ─── MCP Apps Bridge Initialization ──────────────────────────────────────────
// Per https://developers.openai.com/apps-sdk/build/chatgpt-ui/#use-the-mcp-apps-bridge-recommended
var _bridgeReady = (function initializeBridge() {
  function rpcNotify(method, params) {
    window.parent.postMessage({ jsonrpc: '2.0', method: method, params: params || {} }, '*');
  }
  return rpcRequest('ui/initialize', {
    appInfo: { name: 'taxpilot-widget', version: '1.0.0' },
    appCapabilities: {},
    protocolVersion: '2026-01-26',
  }).then(function() {
    rpcNotify('ui/notifications/initialized', {});
    console.log('[TaxPilot] MCP Apps bridge initialized.');
  }).catch(function(err) {
    console.warn('[TaxPilot] MCP Apps bridge init skipped (standalone mode):', err);
  });
})();

// ─── Data Sources ────────────────────────────────────────────────────────────

// 1. Initial data from window.openai.toolOutput (set by ChatGPT before script runs)
if (window.openai && window.openai.toolOutput) {
  console.log('[TaxPilot] Initial toolOutput found, rendering.');
  render(window.openai.toolOutput);
} else {
  console.log('[TaxPilot] No initial toolOutput — waiting for openai:set_globals or message event.');
}

// 2. Listen for updates via openai:set_globals event
// Per the kitchen-sink-lite reference: the event is just a notification;
// always read the current value from window.openai directly.
window.addEventListener('openai:set_globals', function() {
  var data = window.openai && window.openai.toolOutput;
  if (data) {
    console.log('[TaxPilot] openai:set_globals fired — re-rendering with new toolOutput.');
    _pendingRender = false; // Cancel any pending timeout fallback
    var overlay = document.getElementById('tp-loading-overlay');
    if (overlay) overlay.remove();
    render(data);
  }
}, { passive: true });

// 3. Listen for MCP Apps bridge notifications AND JSON-RPC responses
window.addEventListener('message', function(event) {
  if (event.source !== window.parent) return;
  const message = event.data;
  if (!message || message.jsonrpc !== '2.0') return;

  // JSON-RPC response (for rpcRequest callbacks)
  if (message.id != null && _rpcCallbacks[message.id]) {
    var cb = _rpcCallbacks[message.id];
    delete _rpcCallbacks[message.id];
    if (message.error) { cb.reject(message.error); }
    else { cb.resolve(message.result); }
    return;
  }

  // MCP Apps bridge notifications
  if (message.method === 'ui/notifications/tool-result') {
    const data = (message.params && message.params.structuredContent) ? message.params.structuredContent : message.params;
    if (data) render(data);
  }
  if (message.method === 'ui/notifications/tool-input') {
    // Tool input received — can be used to pre-fill forms if needed
    console.log('[TaxPilot] Tool input received:', message.params);
  }
}, { passive: true });
</script>
</body>
</html>`;
}
