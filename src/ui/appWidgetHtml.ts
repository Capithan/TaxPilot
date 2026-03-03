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

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const APP_WIDGET_MIME_TYPE = 'text/html+skybridge';

export function getAppWidgetHtml(): string {
  // Prefer the checked-in static widget file first. It is easier to reason
  // about, avoids stale inline template drift, and is the same artifact used
  // for local debug in `public/taxpilot-widget.html`.
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const widgetPath = path.resolve(__dirname, '..', '..', 'public', 'taxpilot-widget.html');
    if (fs.existsSync(widgetPath)) {
      const html = fs.readFileSync(widgetPath, 'utf-8');
      if (html && html.includes('<!DOCTYPE html')) {
        return html;
      }
    }
  } catch {
    // Fall through to inline template below.
  }

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
<body data-server-url="">
<div id="widget-root">
  <div id="content" class="tp-structured">
    <div class="tp-loading">
      <div class="tp-loading-icon">🟢</div>
      <div class="tp-loading-text">TaxPilot — H&amp;R Block</div>
    </div>
  </div>
</div>

<script>var __TP_SERVER_URL__ = "";</script>
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
var _serverUrl = (typeof __TP_SERVER_URL__ !== 'undefined' && __TP_SERVER_URL__) || document.body.getAttribute('data-server-url') || '';
var _pendingRender = false;
var _pendingBaseToolOutput = null;
var _pendingBaseToolOutputExpiresAt = 0;
var _hasOpenAiHost = !!(window.openai && typeof window.openai.callTool === 'function');

// ─── Multi-Step Intake Wizard (fully local navigation) ──────────────────────
// All step definitions are embedded so the widget never depends on server
// round-trips for UI transitions. Data is saved to the server in the background.
var _sessionId = '';
var _clientId = '';
var _stepIndex = 0;
var _collected = {};   // { stepId: { formData/selection/selections } }
var _wizardActive = false;
var _welcomeShown = false; // Track whether the welcome screen is showing

/** Build the welcome / home screen with selection options */
function buildWelcomeUI() {
  var comps = [];
  var docsAction = _clientId
    ? { type: 'tool_call', tool: 'generate_document_checklist', parameters: { clientId: _clientId } }
    : { type: 'tool_call', tool: '_local_start_intake', parameters: {} };
  var routingAction = _clientId
    ? { type: 'tool_call', tool: 'route_to_tax_pro', parameters: { clientId: _clientId } }
    : { type: 'tool_call', tool: '_local_start_intake', parameters: {} };
  var resumeAction = _clientId
    ? { type: 'tool_call', tool: 'get_conversation_flow', parameters: { clientId: _clientId } }
    : { type: 'tool_call', tool: '_local_start_intake', parameters: {} };
  comps.push({ type: 'banner', text: 'Welcome to H&R Block TaxPilot', variant: 'info', icon: '\\uD83D\\uDC4B', confetti: true });
  comps.push({ type: 'text_block', text: 'Fast, guided intake built for ChatGPT.', style: 'heading' });
  comps.push({ type: 'text_block', text: 'Start with the guided intake, or jump to documents and booking.', style: 'body' });
  comps.push({ type: 'step_progress', steps: [
    { id: 'intake', label: 'Intake', status: 'active' },
    { id: 'documents', label: 'Docs', status: 'upcoming' },
    { id: 'match', label: 'Match', status: 'upcoming' },
    { id: 'book', label: 'Book', status: 'upcoming' },
    { id: 'reminders', label: 'Reminders', status: 'upcoming' }
  ]});
  comps.push({ type: 'selection_card', title: 'What do you want to do?', options: [
    { id: 'start_intake', label: 'Start guided intake', description: 'Collect everything in one flow', icon: '\\uD83E\\uDDED', badge: 'Recommended',
      action: { type: 'tool_call', tool: '_local_start_intake', parameters: {} } },
    { id: 'documents', label: 'See my document list', description: 'Personalized checklist and reminders', icon: '\\uD83D\\uDCCB',
      action: docsAction },
    { id: 'routing', label: 'Match me to a tax pro', description: 'Get the right expert for your situation', icon: '\\uD83D\\uDC69\\u200D\\uD83D\\uDCBC',
      action: routingAction },
    { id: 'questions', label: 'Ask a quick question', description: 'Chat without starting intake', icon: '\\uD83D\\uDCAC' }
  ], action: { type: 'tool_call', tool: '_local_start_intake', parameters: {} } });
  comps.push({ type: 'info_card', title: 'Built-in guardrails', fields: [
    { label: 'Flow aware', value: '10-stage flow with progress', icon: '\\uD83E\\uDDED' },
    { label: 'UI-first', value: 'Structured cards and forms', icon: '\\uD83E\\uDDE9' },
    { label: 'Reminders', value: 'Auto-create checklist nudges', icon: '\\uD83D\\uDD14' },
    { label: 'Scheduling', value: 'Book with the best tax pro', icon: '\\uD83D\\uDCC5' }
  ], highlight: 'Tip: use the buttons above to launch the right flow instantly.' });
  comps.push({ type: 'button', label: '\\uD83D\\uDE80 Start guided intake', variant: 'primary', size: 'lg',
    action: { type: 'tool_call', tool: '_local_start_intake', parameters: {} } });
  comps.push({ type: 'button', label: '\\uD83D\\uDCCA Resume where I left off', variant: 'secondary', size: 'lg',
    action: resumeAction });
  return { screen: 'home', components: comps };
}

/** Show the welcome screen */
function showWelcome() {
  _welcomeShown = true;
  _wizardActive = false;
  render(buildWelcomeUI());
}

var STEPS = [
  { id: 'personal_info', title: 'Personal Information', type: 'form',
    desc: 'We need some basic information to get started with your tax return.',
    fields: [
      { id: 'firstName', label: 'First Name', fieldType: 'text', placeholder: 'John', required: true },
      { id: 'lastName', label: 'Last Name', fieldType: 'text', placeholder: 'Smith', required: true },
      { id: 'email', label: 'Email Address', fieldType: 'email', placeholder: 'john.smith@email.com', required: true },
      { id: 'phone', label: 'Phone Number', fieldType: 'phone', placeholder: '(555) 123-4567', required: true },
      { id: 'dateOfBirth', label: 'Date of Birth', fieldType: 'date', placeholder: 'MM/DD/YYYY', helperText: 'Enter as MM/DD/YYYY', required: true },
      { id: 'address', label: 'Current Address', fieldType: 'textarea', placeholder: '123 Main St, City, State, ZIP', rows: 2, required: true }
    ] },
  { id: 'filing_status', title: 'Filing Status', type: 'select',
    question: 'What is your filing status?',
    options: [
      { value: 'single', label: 'Single', icon: '\uD83D\uDC64', description: 'Unmarried or legally separated' },
      { value: 'married_filing_jointly', label: 'Married Filing Jointly', icon: '\uD83D\uDC6B', description: 'Married and filing a combined return' },
      { value: 'married_filing_separately', label: 'Married Filing Separately', icon: '\uD83D\uDCCB', description: 'Married but filing individual returns' },
      { value: 'head_of_household', label: 'Head of Household', icon: '\uD83C\uDFE0', description: 'Unmarried and paying more than half the cost of maintaining a home' },
      { value: 'qualifying_widow_widower', label: 'Qualifying Widow(er)', icon: '\uD83D\uDD4A\uFE0F', description: 'Spouse died within the last two years and have a dependent child' }
    ] },
  { id: 'dependents', title: 'Dependents', type: 'select',
    question: 'Do you have any dependents?',
    options: [
      { value: 'yes', label: 'Yes, I have dependents', icon: '\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67\u200D\uD83D\uDC66', description: 'Children, elderly parents, or other qualifying individuals' },
      { value: 'no', label: 'No dependents', icon: '\uD83D\uDC64', description: 'No qualifying dependents to claim' }
    ] },
  { id: 'employment', title: 'Employment', type: 'select',
    question: 'What is your employment situation?',
    options: [
      { value: 'employed_w2', label: 'Employed (W-2)', icon: '\uD83C\uDFE2', description: 'Traditional employee with W-2 income' },
      { value: 'self_employed_1099', label: 'Self-Employed (1099)', icon: '\uD83D\uDCBC', description: 'Freelancer, contractor, or business owner' },
      { value: 'both', label: 'Both W-2 and 1099', icon: '\uD83D\uDCCA', description: 'Mix of employment and self-employment income' },
      { value: 'unemployed', label: 'Unemployed', icon: '\uD83D\uDD0D', description: 'Currently not employed' },
      { value: 'retired', label: 'Retired', icon: '\uD83C\uDFD6\uFE0F', description: 'Retired with pension or retirement income' }
    ] },
  { id: 'income_types', title: 'Income Types', type: 'multi',
    question: 'Select all income types that apply to you:',
    options: [
      { value: 'wages', label: 'Wages & Salary (W-2)', icon: '\uD83D\uDCB0' },
      { value: 'self_employment', label: 'Self-Employment Income', icon: '\uD83D\uDCBC' },
      { value: 'investments', label: 'Investment Income', icon: '\uD83D\uDCC8' },
      { value: 'rental', label: 'Rental Income', icon: '\uD83C\uDFD8\uFE0F' },
      { value: 'retirement', label: 'Retirement Distributions', icon: '\uD83C\uDFE6' },
      { value: 'social_security', label: 'Social Security', icon: '\uD83C\uDFDB\uFE0F' },
      { value: 'other_income', label: 'Other Income', icon: '\uD83D\uDCCB' }
    ] },
  { id: 'deductions', title: 'Deductions', type: 'multi',
    question: 'Select deductions that may apply to you:',
    options: [
      { value: 'mortgage_interest', label: 'Mortgage Interest', icon: '\uD83C\uDFE0' },
      { value: 'state_local_taxes', label: 'State & Local Taxes', icon: '\uD83D\uDCCB' },
      { value: 'charitable', label: 'Charitable Contributions', icon: '\u2764\uFE0F' },
      { value: 'medical', label: 'Medical Expenses', icon: '\uD83C\uDFE5' },
      { value: 'education', label: 'Education Expenses', icon: '\uD83C\uDF93' },
      { value: 'home_office', label: 'Home Office', icon: '\uD83D\uDDA5\uFE0F' },
      { value: 'business_expenses', label: 'Business Expenses', icon: '\uD83D\uDCBC' },
      { value: 'none', label: 'None / Standard Deduction', icon: '\u2705' }
    ] },
  { id: 'special_situations', title: 'Special Situations', type: 'multi',
    question: 'Do any of these special situations apply to you?',
    options: [
      { value: 'health_insurance', label: 'Health Insurance (ACA)', icon: '\uD83C\uDFE5' },
      { value: 'cryptocurrency', label: 'Cryptocurrency Transactions', icon: '\u20BF' },
      { value: 'foreign_accounts', label: 'Foreign Bank Accounts', icon: '\uD83C\uDF0D' },
      { value: 'rental_property', label: 'Rental Property', icon: '\uD83C\uDFD8\uFE0F' },
      { value: 'business_income', label: 'Business Income', icon: '\uD83C\uDFEA' },
      { value: 'life_changes', label: 'Major Life Changes', icon: '\uD83D\uDD04' },
      { value: 'none', label: 'None of the Above', icon: '\u2705' }
    ] },
  { id: 'review', title: 'Review & Submit', type: 'review' }
];

/** Build the component array for a given step index */
function buildStepUI(idx) {
  var step = STEPS[idx];
  var total = STEPS.length;
  var comps = [];

  // Step progress bar
  comps.push({ type: 'step_progress', steps: STEPS.map(function(s, i) {
    return { id: s.id, label: s.title, status: i < idx ? 'done' : i === idx ? 'active' : 'upcoming' };
  })});
  comps.push({ type: 'progress_bar', value: idx, max: total, label: 'Step ' + (idx + 1) + ' of ' + total });
  comps.push({ type: 'text_block', text: 'Step ' + (idx + 1) + ': ' + step.title, style: 'heading' });
  if (idx > 0) {
    comps.push({ type: 'banner', text: '\u2705 Step completed! Moving to ' + step.title + '.', variant: 'success', icon: '\u2705' });
  } else {
    comps.push({ type: 'banner', text: 'Welcome to TaxPilot! Let\\'s collect your tax information step by step.', variant: 'info', icon: '\uD83D\uDE80' });
  }

  if (step.type === 'form') {
    comps.push({ type: 'form_group', title: 'Tell us about yourself', description: step.desc,
      fields: step.fields.map(function(f) { return Object.assign({ type: 'form_field' }, f); }),
      submitLabel: 'Continue \u2192',
      action: { type: 'tool_call', tool: 'process_intake_response', parameters: { sessionId: _sessionId, step: step.id } }
    });
  } else if (step.type === 'select') {
    comps.push({ type: 'selection_card', title: step.question,
      options: step.options.map(function(o) {
        return { value: o.value, label: o.label, icon: o.icon, description: o.description,
          action: { type: 'tool_call', tool: 'process_intake_response', parameters: { sessionId: _sessionId, step: step.id } }
        };
      }),
      action: { type: 'tool_call', tool: 'process_intake_response', parameters: { sessionId: _sessionId, step: step.id } }
    });
  } else if (step.type === 'multi') {
    comps.push({ type: 'multi_select', title: step.question,
      options: step.options, submitLabel: 'Continue \u2192',
      action: { type: 'tool_call', tool: 'process_intake_response', parameters: { sessionId: _sessionId, step: step.id } }
    });
  } else if (step.type === 'review') {
    comps = comps.concat(buildReviewComponents());
  }
  return { screen: 'intake', components: comps };
}

/** Build review step components from collected data */
function buildReviewComponents() {
  var parts = [];
  parts.push({ type: 'banner', text: 'Please review your information below before submitting.', variant: 'info', icon: '\uD83D\uDCCB' });
  var items = [];
  var pinfo = (_collected['personal_info'] || {}).formData || {};
  if (pinfo.firstName) items.push({ text: 'Name: ' + pinfo.firstName + ' ' + (pinfo.lastName || ''), status: 'done', icon: '\u2705' });
  if (pinfo.email) items.push({ text: 'Email: ' + pinfo.email, status: 'done', icon: '\u2705' });
  if (pinfo.phone) items.push({ text: 'Phone: ' + pinfo.phone, status: 'done', icon: '\u2705' });
  var fs = (_collected['filing_status'] || {}).selection;
  if (fs) items.push({ text: 'Filing Status: ' + fs.replace(/_/g, ' '), status: 'done', icon: '\u2705' });
  var dep = (_collected['dependents'] || {}).selection;
  if (dep) items.push({ text: 'Dependents: ' + dep, status: 'done', icon: '\u2705' });
  var emp = (_collected['employment'] || {}).selection;
  if (emp) items.push({ text: 'Employment: ' + emp.replace(/_/g, ' '), status: 'done', icon: '\u2705' });
  var inc = (_collected['income_types'] || {}).selections;
  if (inc && inc.length) items.push({ text: 'Income: ' + inc.join(', '), status: 'done', icon: '\u2705' });
  var ded = (_collected['deductions'] || {}).selections;
  if (ded && ded.length) items.push({ text: 'Deductions: ' + ded.join(', '), status: 'done', icon: '\u2705' });
  var spec = (_collected['special_situations'] || {}).selections;
  if (spec && spec.length) items.push({ text: 'Special: ' + spec.join(', '), status: 'done', icon: '\u2705' });
  parts.push({ type: 'checklist', title: 'Your Information', icon: '\uD83D\uDCDD', counter: { done: items.length, total: items.length }, items: items });
  parts.push({ type: 'button', label: '\u2705 Confirm & Get Document Checklist', variant: 'primary', size: 'lg',
    action: { type: 'tool_call', tool: '_local_complete', parameters: {} } });
  return parts;
}

/** Build the completion screen shown after review */
function buildCompleteUI() {
  var comps = [];
  comps.push({ type: 'banner', text: '\uD83C\uDF89 Congratulations! Your tax intake is complete!', variant: 'success', icon: '\uD83C\uDF89', confetti: true });
  comps.push({ type: 'text_block', text: 'Intake Complete', style: 'heading' });
  comps.push({ type: 'text_block', text: 'Your information has been submitted. A tax professional will be matched to your profile.', style: 'body' });
  // Document checklist (basic — server will have the full one)
  var docs = [];
  var emp = (_collected['employment'] || {}).selection || '';
  if (emp === 'employed_w2' || emp === 'both') docs.push({ text: 'W-2 Forms', status: 'required', icon: '\u26A0\uFE0F', description: 'From each employer' });
  if (emp === 'self_employed_1099' || emp === 'both') docs.push({ text: '1099 Forms', status: 'required', icon: '\u26A0\uFE0F', description: 'For freelance/contract income' });
  docs.push({ text: 'Government-issued Photo ID', status: 'required', icon: '\u26A0\uFE0F' });
  docs.push({ text: 'Social Security Card / ITIN', status: 'required', icon: '\u26A0\uFE0F' });
  docs.push({ text: 'Prior Year Tax Return', status: 'required', icon: '\u26A0\uFE0F' });
  var inc = (_collected['income_types'] || {}).selections || [];
  if (inc.indexOf('investments') >= 0) docs.push({ text: '1099-B / 1099-DIV (investments)', status: 'required', icon: '\u26A0\uFE0F' });
  if (inc.indexOf('rental') >= 0) docs.push({ text: 'Rental Income/Expense Records', status: 'required', icon: '\u26A0\uFE0F' });
  var ded = (_collected['deductions'] || {}).selections || [];
  if (ded.indexOf('mortgage_interest') >= 0) docs.push({ text: '1098 Mortgage Interest Statement', status: 'required', icon: '\u26A0\uFE0F' });
  if (ded.indexOf('charitable') >= 0) docs.push({ text: 'Charitable Donation Receipts', status: 'required', icon: '\u26A0\uFE0F' });
  if (ded.indexOf('medical') >= 0) docs.push({ text: 'Medical Expense Records', status: 'required', icon: '\u26A0\uFE0F' });
  comps.push({ type: 'checklist', title: 'Required Documents', icon: '\uD83D\uDCC4', counter: { done: 0, total: docs.length }, items: docs });
  // Try to fetch tax pro match from server and show it if available
  comps.push({ type: 'banner', text: 'A matching tax professional will be assigned to you shortly.', variant: 'info', icon: '\uD83D\uDC68\u200D\uD83D\uDCBC' });
  if (_clientId) {
    comps.push({ type: 'button', label: '\uD83D\uDC68\u200D\uD83D\uDCBC Find My Tax Pro', variant: 'primary', size: 'lg',
      action: { type: 'tool_call', tool: 'route_to_tax_pro', parameters: { clientId: _clientId } } });
    comps.push({ type: 'button', label: '\uD83D\uDCC4 Generate Full Document Checklist', variant: 'secondary', size: 'lg',
      action: { type: 'tool_call', tool: 'generate_document_checklist', parameters: { clientId: _clientId } } });
  }
  return { screen: 'complete', components: comps };
}

/** Save step data to server (fire-and-forget, non-blocking) */
function saveStepToServer(stepId, data) {
  if (!_serverUrl || !_sessionId) return;
  var args = { sessionId: _sessionId, step: stepId };
  if (data.formData) args.formData = data.formData;
  if (data.selection) args.selection = data.selection;
  if (data.selections) args.selections = data.selections;
  fetch(_serverUrl + '/api/tools/call', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'process_intake_response', args: args })
  }).then(function(r) { console.log('[TP] Saved', stepId, 'status:', r.status); })
    .catch(function(e) { console.warn('[TP] Save failed for', stepId, e.message); });
}

/** Advance to next step locally — called by click handlers */
function advanceStep(stepId, data) {
  // Store collected data
  _collected[stepId] = data;
  // Save to server in the background (non-blocking)
  saveStepToServer(stepId, data);
  // Move to next step
  _stepIndex++;
  if (_stepIndex < STEPS.length) {
    render(buildStepUI(_stepIndex));
  } else {
    // All steps done — show completion
    render(buildCompleteUI());
  }
  // Scroll to top
  var root = document.getElementById('widget-root');
  if (root) root.scrollTop = 0;
}

/** Start the local wizard (called on init or when sessionId is obtained) */
function startWizard(sessionId, clientId, startAtStep) {
  _sessionId = sessionId || '';
  _clientId = clientId || '';
  _wizardActive = true;
  _stepIndex = startAtStep || 0;
  render(buildStepUI(_stepIndex));
}

/** Send a JSON-RPC 2.0 request to the host and return a promise for the result */
function rpcRequest(method, params) {
  return new Promise(function(resolve, reject) {
    var id = ++_rpcId;
    _rpcCallbacks[id] = { resolve: resolve, reject: reject };
    window.parent.postMessage({ jsonrpc: '2.0', id: id, method: method, params: params || {} }, '*');
    setTimeout(function() {
      if (_rpcCallbacks[id]) { delete _rpcCallbacks[id]; reject(new Error('RPC timeout: ' + method)); }
    }, 15000);
  });
}

/** Send a follow-up message to the ChatGPT conversation */
function sendFollowUp(text) {
  if (window.openai && typeof window.openai.sendFollowUpMessage === 'function') {
    window.openai.sendFollowUpMessage({ prompt: text });
  } else {
    window.parent.postMessage({ jsonrpc: '2.0', method: 'ui/message', params: { role: 'user', content: [{ type: 'text', text: text }] } }, '*');
  }
}

// ── Tier 1: MCP Apps bridge callTool ─────────────────────────────────────────
function bridgeCallTool(toolName, args) {
  if (window.openai && typeof window.openai.callTool === 'function') {
    try {
      var p = window.openai.callTool(toolName, args || {});
      if (p && typeof p.then === 'function') return p;
      return Promise.resolve(p);
    } catch (e) {
      return Promise.reject(e);
    }
  }
  return Promise.reject(new Error('bridge unavailable'));
}

// ── Tier 2: Direct REST call to server ───────────────────────────────────────
function restCallTool(toolName, args) {
  if (!_serverUrl) {
    console.warn('[TP] REST: no server URL configured');
    return Promise.reject(new Error('no server URL'));
  }
  var url = _serverUrl + '/api/tools/call';
  console.log('[TP] REST: fetching', url, 'for', toolName);
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: toolName, args: args || {} }),
  }).then(function(resp) {
    console.log('[TP] REST: status', resp.status, 'for', toolName);
    if (!resp.ok) throw new Error('REST ' + resp.status);
    return resp.json();
  }).then(function(json) {
    console.log('[TP] REST: got JSON with keys', Object.keys(json).join(','));
    return json;
  });
}

// ── Tier 3: sendFollowUpMessage ──────────────────────────────────────────────
function modelCallTool(toolName, args) {
  sendFollowUp('Please call the tool ' + toolName + ' with arguments: ' + JSON.stringify(args));
}

// ── Unified callTool — REST first, bridge fallback ───────────────────────────
// REST is the primary mechanism because the widget can reach the server directly.
// The bridge (window.openai.callTool) is unreliable — it may resolve with undefined,
// hang, or cause double-processing if also tried via REST.
function callTool(toolName, args) {
  // If we have a server URL, always prefer REST (direct, fast, reliable)
  if (_serverUrl) {
    return restCallTool(toolName, args).catch(function(restErr) {
      console.warn('[TP] REST failed for', toolName, restErr.message || restErr, '— trying bridge');
      return bridgeCallTool(toolName, args);
    });
  }
  // No server URL — try bridge, then give up
  return bridgeCallTool(toolName, args);
}

// ── Extract renderable data from any response shape ──────────────────────────
function extractRenderData(result) {
  if (!result || typeof result !== 'object') return null;
  // { structuredContent: { components, … } }
  var sc = result.structuredContent;
  if (sc && typeof sc === 'object' && (sc.components || sc.screen || sc.type)) return sc;
  // { result: { structuredContent: { … } } }
  var rsc = result.result && result.result.structuredContent;
  if (rsc && typeof rsc === 'object' && (rsc.components || rsc.screen || rsc.type)) return rsc;
  // Direct component data
  if (result.components || result.screen || result.type || result.title) return result;
  return null;
}

// ── callToolAndRender — show loading, call tool, render result ───────────────
function callToolAndRender(toolName, params, btn, origLabel) {
  if (btn) { btn.disabled = true; btn.textContent = 'Working\u2026'; }
  _pendingRender = true;

  var contentEl = document.getElementById('content');
  if (contentEl) {
    contentEl.insertAdjacentHTML('beforeend',
      '<div id="tp-loading-overlay" style="text-align:center;padding:24px;color:var(--hrb-text-muted)">'
      + '<div style="font-size:24px;margin-bottom:8px">\u23F3</div>'
      + '<div style="font-size:14px">Processing ' + esc(toolName.replace(/_/g, ' ')) + '\u2026</div></div>');
  }

  function done(data) {
    _pendingRender = false;
    var overlay = document.getElementById('tp-loading-overlay');
    if (overlay) overlay.remove();
    if (data) {
      _wizardActive = false;
      _welcomeShown = !!(data && data.screen === 'home');
      render(data);
      var root = document.getElementById('widget-root');
      if (root) root.scrollTop = 0;
    } else {
      // Show error inline so user knows something went wrong
      var errHtml = '<div style="text-align:center;padding:24px;color:var(--hrb-danger)">'
        + '<div style="font-size:20px;margin-bottom:8px">\u26A0\uFE0F</div>'
        + '<div style="font-size:14px">Could not load the next step.</div>'
        + '<div style="font-size:12px;margin-top:8px;color:var(--hrb-text-muted)">Server: ' + esc(_serverUrl || 'not set') + '</div>'
        + '</div>';
      var c = document.getElementById('content');
      if (c) c.insertAdjacentHTML('beforeend', errHtml);
    }
    if (btn && btn.parentNode) { btn.disabled = false; btn.textContent = origLabel; }
  }

  console.log('[TP] callToolAndRender:', toolName, JSON.stringify(params).substring(0, 200), 'serverUrl=' + _serverUrl);

  // Debug log helper — appends to a visible debug panel (remove in production)
  var _dbg = document.getElementById('tp-debug');
  if (!_dbg) {
    var wr = document.getElementById('widget-root');
    if (wr) {
      wr.insertAdjacentHTML('beforeend', '<div id="tp-debug" style="position:fixed;bottom:0;left:0;right:0;max-height:150px;overflow:auto;background:#1a1a2e;color:#0f0;font:11px monospace;padding:8px;z-index:9999;border-top:2px solid #e63946;display:none"></div>');
      _dbg = document.getElementById('tp-debug');
    }
  }
  function dbg(msg) {
    console.log('[TP]', msg);
    if (_dbg) { _dbg.style.display = 'block'; _dbg.innerHTML += esc(msg) + '<br>'; _dbg.scrollTop = _dbg.scrollHeight; }
  }
  dbg('callToolAndRender: ' + toolName + ' | serverUrl=' + (_serverUrl || 'EMPTY') + ' | bridge=' + (window.openai && typeof window.openai.callTool));
  var previousToolOutput = window.openai && window.openai.toolOutput;
  _pendingBaseToolOutput = previousToolOutput || null;
  _pendingBaseToolOutputExpiresAt = Date.now() + 8000;

  callTool(toolName, params).then(function(result) {
    var rtype = typeof result;
    var rkeys = result && typeof result === 'object' ? Object.keys(result).join(',') : 'N/A';
    dbg('callTool resolved: type=' + rtype + ' keys=' + rkeys);
    var data = extractRenderData(result);
    if (data) { dbg('Render data found! Rendering...'); done(data); return; }

    // Tool resolved but no renderable data — check toolOutput then wait for set_globals
    dbg('No renderable data in response — checking toolOutput');
    var to = window.openai && window.openai.toolOutput;
    if (to && to !== previousToolOutput) {
      var d = extractRenderData(to);
      if (d) { dbg('toolOutput had fresh data!'); done(d); return; }
    }

    // Wait briefly for set_globals (ChatGPT may push updated data)
    dbg('Waiting for set_globals...');
    waitForSetGlobals(toolName, params, previousToolOutput, done);
  }).catch(function(err) {
    dbg('callTool FAILED: ' + (err.message || err));
    console.error('[TP] callTool failed:', toolName, err);
    // All tiers failed — show error and ask model as last resort
    done(null);
    modelCallTool(toolName, params);
  });
}

/** Wait briefly for set_globals, then fall back to model prompt */
function waitForSetGlobals(toolName, params, previousToolOutput, done) {
  console.log('[TP] Waiting 3s for set_globals\u2026');
  setTimeout(function() {
    if (!_pendingRender) return; // already rendered by set_globals listener
    var to = window.openai && window.openai.toolOutput;
    if (to && to !== previousToolOutput) {
      var data = extractRenderData(to);
      if (data) { done(data); return; }
    }
    console.warn('[TP] No data after all tiers \u2014 falling back to model');
    done(null);
    modelCallTool(toolName, params);
  }, 3000);
}

function isStalePendingToolOutput(raw) {
  return !!(
    raw &&
    _pendingBaseToolOutput &&
    raw === _pendingBaseToolOutput &&
    Date.now() < _pendingBaseToolOutputExpiresAt
  );
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
              // Wizard intercept: handle intake steps locally
              if (_wizardActive && action.tool === 'process_intake_response' && action.parameters && action.parameters.step) {
                advanceStep(action.parameters.step, { formData: formData });
                return;
              }
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
          sendFollowUp(parts.join(', '));
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
            // Welcome intercept: _local_start_intake transitions from welcome to wizard
            if (optAction.tool === '_local_start_intake') {
              _welcomeShown = false;
              if (!_serverUrl && !(window.openai && typeof window.openai.callTool === 'function')) {
                startWizard(_sessionId, _clientId, 0);
                return;
              }
              callToolAndRender('start_intake', {}, null, null);
              return;
            }
            // Wizard intercept: handle intake steps locally
            if (_wizardActive && optAction.tool === 'process_intake_response' && optAction.parameters && optAction.parameters.step) {
              selItem.style.pointerEvents = 'none'; selItem.style.opacity = '0.6';
              advanceStep(optAction.parameters.step, { selection: selValue });
              return;
            }
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
            // Welcome intercept: _local_start_intake transitions from welcome to wizard
            if (selAction.tool === '_local_start_intake') {
              _welcomeShown = false;
              if (!_serverUrl && !(window.openai && typeof window.openai.callTool === 'function')) {
                startWizard(_sessionId, _clientId, 0);
                return;
              }
              callToolAndRender('start_intake', {}, null, null);
              return;
            }
            // Wizard intercept: handle intake steps locally
            if (_wizardActive && selAction.tool === 'process_intake_response' && selAction.parameters && selAction.parameters.step) {
              selItem.style.pointerEvents = 'none'; selItem.style.opacity = '0.6';
              advanceStep(selAction.parameters.step, { selection: selValue });
              return;
            }
            selItem.style.pointerEvents = 'none'; selItem.style.opacity = '0.6';
            var selParams = Object.assign({}, selAction.parameters || {}, { selection: selValue });
            callToolAndRender(selAction.tool, selParams, null, null);
            return;
          }
        } catch(ex) {}
      }
      sendFollowUp(selValue);
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
              // Wizard intercept: handle intake steps locally
              if (_wizardActive && multiAction.tool === 'process_intake_response' && multiAction.parameters && multiAction.parameters.step) {
                advanceStep(multiAction.parameters.step, { selections: values });
                return;
              }
              var multiParams = Object.assign({}, multiAction.parameters || {}, { selections: values });
              callToolAndRender(multiAction.tool, multiParams, t, t.textContent);
              return;
            }
          } catch(ex) {}
        }
        // Fallback: send as message
        t.disabled = true; t.textContent = 'Sending\u2026';
        sendFollowUp(values.join(', '));
      }
      return;
    }
    // Button with tool_call action — call the tool directly via bridge
    if (t.dataset && t.dataset.btnTool) {
      var btnTool = t.dataset.btnTool;
      var btnParams = {};
      try { btnParams = JSON.parse(t.dataset.btnParams || '{}'); } catch(e) {}
      // Wizard intercept: _local_complete shows the completion screen
      if (_wizardActive && btnTool === '_local_complete') {
        render(buildCompleteUI());
        var root = document.getElementById('widget-root');
        if (root) root.scrollTop = 0;
        // Also do a final save to server
        saveStepToServer('review', { formData: _collected });
        return;
      }
      // Welcome intercept: _local_start_intake transitions from welcome to wizard
      if (btnTool === '_local_start_intake') {
        _welcomeShown = false;
        if (!_serverUrl && !(window.openai && typeof window.openai.callTool === 'function')) {
          startWizard(_sessionId, _clientId, 0);
          return;
        }
        callToolAndRender('start_intake', {}, t, t.textContent);
        return;
      }
      callToolAndRender(btnTool, btnParams, t, t.textContent);
      return;
    }
    // Button with message
    if (t.dataset && t.dataset.btnMsg) {
      sendFollowUp(t.dataset.btnMsg);
      return;
    }
    t = t.parentElement;
  }
});

// ─── MCP Apps Bridge Initialization ──────────────────────────────────────────
// Per https://developers.openai.com/apps-sdk/build/chatgpt-ui/#use-the-mcp-apps-bridge-recommended
var _bridgeReady = Promise.resolve(null);
if (!_hasOpenAiHost) {
  _bridgeReady = (function initializeBridge() {
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
}

// ─── Data Sources ────────────────────────────────────────────────────────────

// Initialize: show welcome screen first, start wizard only when user chooses.
(function initWizard() {
  var to = window.openai && window.openai.toolOutput;
  var sid = '';
  var cid = '';
  if (to) {
    // Try extracting sessionId/clientId from initial toolOutput
    sid = (to.stateUpdates && to.stateUpdates.sessionId) || (to.data && to.data.sessionId) || '';
    cid = (to.stateUpdates && to.stateUpdates.clientId) || (to.data && to.data.clientId) || '';
    // Also check structuredContent wrapper
    if (!sid && to.structuredContent) {
      var sc = to.structuredContent;
      sid = (sc.stateUpdates && sc.stateUpdates.sessionId) || (sc.data && sc.data.sessionId) || '';
      cid = (sc.stateUpdates && sc.stateUpdates.clientId) || (sc.data && sc.data.clientId) || '';
    }
  }
  console.log('[TP] initWizard: sid=' + sid + ', cid=' + cid + ', hasToolOutput=' + !!to + ', serverUrl=' + _serverUrl);

  _sessionId = sid;
  _clientId = cid;

  // Check if toolOutput already contains a specific screen to render (e.g. from render_welcome_ui or start_intake)
  if (to) {
    var renderData = extractRenderData(to);
    if (renderData && renderData.screen && renderData.screen !== 'home') {
      // Server sent a specific non-home screen (e.g. intake already started) — render it
      _wizardActive = false;
      _welcomeShown = false;
      render(renderData);
      return;
    }
  }

  // Default: show the welcome/home selection screen
  showWelcome();

  // If no sessionId yet, try REST in background so we have one ready when user starts intake
  if (!sid && _serverUrl) {
    restCallTool('start_intake', {}).then(function(resp) {
      var rsid = '';
      var rcid = '';
      if (resp.stateUpdates) { rsid = resp.stateUpdates.sessionId || ''; rcid = resp.stateUpdates.clientId || ''; }
      if (!rsid && resp.data) { rsid = resp.data.sessionId || ''; rcid = resp.data.clientId || ''; }
      if (!rsid && resp.structuredContent && resp.structuredContent.stateUpdates) {
        rsid = resp.structuredContent.stateUpdates.sessionId || '';
        rcid = resp.structuredContent.stateUpdates.clientId || '';
      }
      if (rsid) {
        _sessionId = rsid;
        _clientId = rcid || _clientId;
        console.log('[TP] Got sessionId from REST:', rsid);
      }
    }).catch(function(e) { console.warn('[TP] REST start_intake failed:', e.message || e); });
  }
})();

// 2. Listen for updates via openai:set_globals event
// When wizard is active: only extract sessionId, don't re-render intake steps.
// When _pendingRender is true (non-intake tool call in progress): render normally.
window.addEventListener('openai:set_globals', function() {
  var raw = window.openai && window.openai.toolOutput;
  console.log('[TP] set_globals fired, wizardActive=' + _wizardActive + ', pendingRender=' + _pendingRender);

  if (isStalePendingToolOutput(raw)) {
    console.log('[TP] set_globals: ignoring stale pre-submit toolOutput');
    return;
  }

  // Always extract sessionId/clientId if we don't have one yet
  if (raw && !_sessionId) {
    var sid = '';
    var cid = '';
    if (raw.stateUpdates) { sid = raw.stateUpdates.sessionId || ''; cid = raw.stateUpdates.clientId || ''; }
    if (!sid && raw.data) { sid = raw.data.sessionId || ''; cid = raw.data.clientId || ''; }
    if (sid) { _sessionId = sid; _clientId = cid || _clientId; console.log('[TP] Got sessionId from set_globals:', sid); }
  }

  // If local wizard is active and no pending non-intake render, skip re-render
  if (_wizardActive && !_pendingRender) {
    console.log('[TP] set_globals: local wizard active, skipping re-render');
    return;
  }

  // Render the data (for non-intake tool results or pre-wizard mode)
  var data = raw ? (extractRenderData(raw) || raw) : null;
  if (data) {
    _pendingRender = false;
    _wizardActive = false;
    _welcomeShown = !!(data && data.screen === 'home');
    var overlay = document.getElementById('tp-loading-overlay');
    if (overlay) overlay.remove();
    render(data);
    var root = document.getElementById('widget-root');
    if (root) root.scrollTop = 0;
  }
}, { passive: true });

// 3. Listen for MCP Apps bridge notifications AND JSON-RPC responses
window.addEventListener('message', function(event) {
  if (_hasOpenAiHost) return;
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
    // If local wizard is active and not waiting for a non-intake tool, skip to avoid overwriting UI
    if (_wizardActive && !_pendingRender) {
      console.log('[TP] tool-result notification received but local wizard is active — skipping');
      // Still extract sessionId if available
      var trData = (message.params && message.params.structuredContent) ? message.params.structuredContent : message.params;
      if (trData && !_sessionId) {
        var trsid = (trData.stateUpdates && trData.stateUpdates.sessionId) || (trData.data && trData.data.sessionId) || '';
        if (trsid) { _sessionId = trsid; console.log('[TP] Got sessionId from tool-result:', trsid); }
      }
      return;
    }
    var ndata = (message.params && message.params.structuredContent) ? message.params.structuredContent : message.params;
    if (isStalePendingToolOutput(ndata)) {
      console.log('[TP] tool-result: ignoring stale pre-submit toolOutput');
      return;
    }
    var renderData = extractRenderData(ndata) || ndata;
    if (renderData) {
      _pendingRender = false;
      _wizardActive = false;
      _welcomeShown = !!(renderData && renderData.screen === 'home');
      var ov = document.getElementById('tp-loading-overlay');
      if (ov) ov.remove();
      render(renderData);
    }
  }
  if (message.method === 'ui/notifications/tool-input') {
    console.log('[TP] Tool input received:', message.params);
  }
}, { passive: true });
</script>
</body>
</html>`;
}
