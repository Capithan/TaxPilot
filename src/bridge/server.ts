import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { Request, Response } from 'express';
import {
  startIntakeSession,
  processIntakeResponse,
  processStructuredIntakeResponse,
  getIntakeProgress,
  getIntakeSummary,
} from '../services/intake.js';
import {
  generateDocumentChecklist,
  getDocumentChecklist,
  markDocumentCollected,
  getPendingDocuments,
  formatChecklistForDisplay,
} from '../services/checklist.js';
import {
  createDocumentReminder,
  createBatchDocumentReminder,
  getClientReminders,
  sendReminder,
  formatRemindersForDisplay,
} from '../services/reminders.js';
import {
  calculateComplexityScore,
  getComplexityLevel,
  findBestTaxPro,
  routeClientToTaxPro,
  createAppointment,
  getAppointmentEstimate,
  getTaxProRecommendations,
} from '../services/routing.js';
import { db } from '../database/index.js';
import { chat, resetChatSession } from '../chatgpt/chatEngine.js';

// UI Formatters
import {
  formatIntakeStart,
  formatIntakeResponse,
  formatIntakeProgress,
  formatClientSummary,
} from '../ui/formatters/intake.js';
import {
  formatDocumentChecklist as formatDocChecklistUI,
  formatDocumentCollected,
  formatPendingDocuments,
} from '../ui/formatters/checklist.js';
import {
  formatComplexityScore,
  formatRoutingResult,
  formatTaxProRecommendations,
  formatAppointmentEstimate as formatEstimateUI,
  formatAppointmentCreated,
  formatTaxProList,
  formatClientProfile,
} from '../ui/formatters/routing.js';
import {
  formatRemindersCreated,
  formatRemindersList,
  formatReminderSent,
  formatNotificationSent,
} from '../ui/formatters/reminders.js';
import { formatWelcomeScreen } from '../ui/formatters/welcome.js';
import type { UIResponse } from '../ui/types.js';
import { toReadableText } from '../ui/toReadableText.js';
import { toHtmlWidget } from '../ui/toHtmlWidget.js';
import { getAppWidgetHtml, APP_WIDGET_MIME_TYPE } from '../ui/appWidgetHtml.js';

/** Wrap a UIResponse into the MCP content block format with structuredContent for Apps SDK widget. */
function toMcpContent(uiResp: UIResponse | Record<string, unknown>): { content: Array<{ type: string; text: string }>; structuredContent: Record<string, unknown> } {
  const readable = toReadableText(uiResp as Record<string, unknown>);
  return {
    content: [{ type: 'text', text: readable }],
    structuredContent: uiResp as unknown as Record<string, unknown>,
  };
}

// Get __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Store active SSE sessions
const sseSessions: Map<string, Response> = new Map();

// Store latest tool result so the widget can render data even without the Apps SDK bridge
let latestToolResult: Record<string, unknown> | null = null;
let toolResultVersion = 0;

// Enhanced CORS for ChatGPT
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Mcp-Session-Id', 'MCP-Protocol-Version'],
  exposedHeaders: ['Mcp-Session-Id'],
}));

// Handle preflight OPTIONS requests
app.options('*', cors());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('  Headers:', JSON.stringify({
    'content-type': req.headers['content-type'],
    'accept': req.headers['accept'],
    'origin': req.headers['origin'],
    'user-agent': req.headers['user-agent']?.substring(0, 50)
  }));
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.text({ type: 'text/plain' }));
app.use(express.static('public'));

// ChatGPT Plugin manifest
app.get('/.well-known/ai-plugin.json', (_req, res) => {
  try {
    const publicDir = path.join(__dirname, '..', '..', 'public');
    const manifestPath = path.join(publicDir, '.well-known', 'ai-plugin.json');
    const manifest = fs.readFileSync(manifestPath, 'utf-8');
    res.type('application/json').send(manifest);
  } catch (e) {
    res.status(404).json({ error: 'Plugin manifest not found' });
  }
});

// OpenAPI specification
app.get('/openapi.yaml', (_req, res) => {
  try {
    const publicDir = path.join(__dirname, '..', '..', 'public');
    const openapiPath = path.join(publicDir, 'openapi.yaml');
    const yaml = fs.readFileSync(openapiPath, 'utf-8');
    res.type('text/yaml').send(yaml);
  } catch (e) {
    res.status(404).json({ error: 'OpenAPI spec not found' });
  }
});

// Privacy policy
app.get('/privacy', (_req, res) => {
  try {
    const publicDir = path.join(__dirname, '..', '..', 'public');
    const privacyPath = path.join(publicDir, 'privacy.html');
    const html = fs.readFileSync(privacyPath, 'utf-8');
    res.type('text/html').send(html);
  } catch (e) {
    res.type('text/html').send(`
      <html><head><title>Privacy Policy</title></head>
      <body><h1>Privacy Policy</h1><p>This API collects tax-related information for appointment preparation only.</p></body></html>
    `);
  }
});

// Simple health check
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'tax-intake-mcp-bridge', platform: 'azure' });
});

// Intake endpoints
app.post('/intake/start', (req: Request, res: Response) => {
  const { clientId } = req.body || {};
  const result = startIntakeSession(clientId);
  res.json({
    sessionId: result.session.id,
    clientId: result.client.id,
    currentStep: result.currentStep,
    totalSteps: 9,
    percentComplete: 0,
    nextQuestion: result.nextQuestion,
    _ui: {
      type: 'intake_start',
      title: '📋 Tax Intake Started',
      subtitle: 'Let\'s collect your information step by step',
      progress: { current: 1, total: 9, percent: 0 },
      tip: 'Answer each question and I\'ll guide you through the entire process.'
    }
  });
});

app.post('/intake/respond', (req: Request, res: Response) => {
  const { sessionId, answer } = req.body || {};
  const result = processIntakeResponse(sessionId, answer);
  const progress = getIntakeProgress(sessionId);
  res.json({
    ...result,
    progress: progress ? {
      currentStep: progress.currentStep,
      completedSteps: progress.completedSteps,
      totalSteps: progress.totalSteps,
      percentComplete: progress.percentComplete,
      remainingSteps: progress.remainingSteps,
    } : undefined,
    _ui: {
      type: result.intakeCompleted ? 'intake_complete' : 'intake_question',
      title: result.intakeCompleted ? '✅ Intake Complete!' : `Step: ${progress?.currentStep?.replace(/_/g, ' ') || 'processing'}`,
      progress: progress ? { current: progress.completedSteps.length, total: progress.totalSteps, percent: progress.percentComplete } : undefined,
      showConfetti: result.intakeCompleted || false,
    }
  });
});

app.get('/intake/progress/:sessionId', (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const progress = getIntakeProgress(sessionId);
  res.json(progress || { error: 'Session not found' });
});

app.get('/client/:clientId/summary', (req: Request, res: Response) => {
  const { clientId } = req.params;
  const client = db.getClient(clientId);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  res.json({
    clientId: client.id,
    name: `${client.firstName} ${client.lastName}`,
    email: client.email,
    phone: client.phone,
    filingStatus: client.filingStatus.replace(/_/g, ' '),
    dependents: client.dependents.map(d => ({ name: `${d.firstName} ${d.lastName}`, relationship: d.relationship })),
    incomeTypes: client.incomeTypes.map(t => t.replace(/_/g, ' ')),
    deductions: client.deductions.map(d => d.replace(/_/g, ' ')),
    specialSituations: [
      ...(client.hasCrypto ? ['Cryptocurrency'] : []),
      ...(client.hasForeignAccounts ? ['Foreign accounts'] : []),
      ...(client.hasRentalProperty ? ['Rental property'] : []),
      ...(client.hasBusinessIncome ? ['Business income'] : []),
    ],
    complexityScore: client.complexityScore,
    intakeCompleted: client.intakeCompleted,
    _ui: {
      type: 'client_summary',
      title: `👤 ${client.firstName} ${client.lastName}`,
      subtitle: `${client.filingStatus.replace(/_/g, ' ')} · Complexity: ${client.complexityScore}/100`,
      sections: [
        { icon: '💰', label: 'Income', items: client.incomeTypes.map(t => t.replace(/_/g, ' ')) },
        { icon: '📝', label: 'Deductions', items: client.deductions.map(d => d.replace(/_/g, ' ')) },
        { icon: '⚠️', label: 'Special', items: [
          ...(client.hasCrypto ? ['Crypto'] : []),
          ...(client.hasForeignAccounts ? ['Foreign'] : []),
          ...(client.hasRentalProperty ? ['Rental'] : []),
          ...(client.hasBusinessIncome ? ['Business'] : []),
        ]},
      ],
      complexityBadge: client.complexityScore < 30 ? 'Simple' : client.complexityScore < 60 ? 'Moderate' : client.complexityScore < 80 ? 'Complex' : 'Expert'
    }
  });
});

// Checklist endpoints
app.post('/client/:clientId/checklist/generate', (req: Request, res: Response) => {
  const { clientId } = req.params;
  const checklist = generateDocumentChecklist(clientId);
  const collected = checklist.documents.filter(d => d.collected).length;
  const total = checklist.documents.length;
  const byCategory: Record<string, Array<{id: string; name: string; description: string; required: boolean; collected: boolean}>> = {};
  checklist.documents.forEach(d => {
    if (!byCategory[d.category]) byCategory[d.category] = [];
    byCategory[d.category].push({ id: d.id, name: d.name, description: d.description, required: d.required, collected: d.collected });
  });
  res.json({
    clientId,
    totalDocuments: total,
    collected,
    pending: total - collected,
    percentComplete: total > 0 ? Math.round((collected / total) * 100) : 0,
    categories: byCategory,
    _ui: {
      type: 'document_checklist',
      title: '📋 Your Document Checklist',
      subtitle: `${collected}/${total} collected`,
      progress: { current: collected, total, percent: total > 0 ? Math.round((collected / total) * 100) : 0 },
      renderAs: 'checklist_with_categories'
    }
  });
});

app.get('/client/:clientId/checklist', (req: Request, res: Response) => {
  const { clientId } = req.params;
  const checklist = getDocumentChecklist(clientId);
  if (!checklist) return res.status(404).json({ error: 'Checklist not found' });
  const collected = checklist.documents.filter(d => d.collected).length;
  const total = checklist.documents.length;
  const byCategory: Record<string, Array<{id: string; name: string; description: string; required: boolean; collected: boolean}>> = {};
  checklist.documents.forEach(d => {
    if (!byCategory[d.category]) byCategory[d.category] = [];
    byCategory[d.category].push({ id: d.id, name: d.name, description: d.description, required: d.required, collected: d.collected });
  });
  res.json({
    clientId,
    totalDocuments: total,
    collected,
    pending: total - collected,
    percentComplete: total > 0 ? Math.round((collected / total) * 100) : 0,
    categories: byCategory,
    _ui: {
      type: 'document_checklist',
      title: '📋 Document Checklist',
      subtitle: `${collected}/${total} collected`,
      progress: { current: collected, total, percent: total > 0 ? Math.round((collected / total) * 100) : 0 },
      renderAs: 'checklist_with_categories'
    }
  });
});

app.post('/client/:clientId/checklist/collect', (req: Request, res: Response) => {
  const { clientId } = req.params;
  const { documentId } = req.body || {};
  const result = markDocumentCollected(clientId, documentId);
  res.json(result);
});

app.get('/client/:clientId/checklist/pending', (req: Request, res: Response) => {
  const { clientId } = req.params;
  const pending = getPendingDocuments(clientId);
  res.json(pending);
});

// Reminder endpoints
app.post('/client/:clientId/reminders/documents', (req: Request, res: Response) => {
  const { clientId } = req.params;
  const { appointmentId } = req.body || {};
  const pending = getPendingDocuments(clientId);
  if (pending.length === 0) return res.json({ message: 'No pending documents', reminders: [] });
  const reminders = createDocumentReminder(clientId, appointmentId, pending);
  res.json({
    totalReminders: reminders.length,
    reminders: reminders.map(r => ({
      id: r.id,
      message: r.message,
      channel: r.channel,
      scheduledFor: r.scheduledFor,
      documentIds: r.documentIds,
    })),
    _ui: {
      type: 'reminders_created',
      title: '🔔 Reminders Set',
      subtitle: `${reminders.length} reminder(s) created`,
    }
  });
});

app.get('/client/:clientId/reminders', (req: Request, res: Response) => {
  const { clientId } = req.params;
  const reminders = getClientReminders(clientId);
  const pending = reminders.filter(r => !r.sent);
  const sent = reminders.filter(r => r.sent);
  res.json({
    total: reminders.length,
    pending: pending.map(r => ({ id: r.id, type: r.type, message: r.message, scheduledFor: r.scheduledFor, channel: r.channel })),
    sent: sent.map(r => ({ id: r.id, type: r.type, message: r.message, sentAt: r.sentAt, channel: r.channel })),
    _ui: {
      type: 'reminders_list',
      title: '🔔 Client Reminders',
      subtitle: `${pending.length} pending · ${sent.length} sent`,
    }
  });
});

app.post('/reminders/send', (req: Request, res: Response) => {
  const { reminderId } = req.body || {};
  const result = sendReminder(reminderId);
  res.json(result);
});

// Routing + appointments
app.post('/client/:clientId/route', (req: Request, res: Response) => {
  const { clientId } = req.params;
  const result = routeClientToTaxPro(clientId);
  res.json(result);
});

app.post('/appointments', (req: Request, res: Response) => {
  const { clientId, taxProId, scheduledAt, type } = req.body || {};
  const appointment = createAppointment(clientId, taxProId, new Date(scheduledAt), type);
  res.json(appointment);
});

app.get('/client/:clientId/appointment/estimate', (req: Request, res: Response) => {
  const { clientId } = req.params;
  const estimate = getAppointmentEstimate(clientId);
  res.json({
    estimatedDuration: estimate.estimatedDuration,
    timeSaved: estimate.savings,
    complexityLevel: estimate.complexityLevel,
    _ui: {
      type: 'appointment_estimate',
      title: '⏱️ Appointment Estimate',
      subtitle: `${estimate.estimatedDuration} minutes · ${estimate.complexityLevel} complexity`,
      highlight: estimate.savings > 0 ? `Saving ${estimate.savings} min thanks to pre-intake!` : undefined,
      badge: estimate.complexityLevel,
    }
  });
});

app.get('/client/:clientId/recommendations', (req: Request, res: Response) => {
  const { clientId } = req.params;
  const client = db.getClient(clientId);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  const { taxPro, reason, alternates } = findBestTaxPro(client);
  const formatPro = (p: any) => ({
    id: p.id,
    name: p.name,
    specializations: p.specializations.map((s: string) => s.replace(/_/g, ' ')),
    rating: p.rating,
    available: p.available,
    currentLoad: p.currentLoad,
    maxDailyAppointments: p.maxDailyAppointments,
  });
  res.json({
    recommended: taxPro ? formatPro(taxPro) : null,
    reason,
    alternates: alternates.map(formatPro),
    _ui: {
      type: 'tax_pro_recommendations',
      title: '👨‍💼 Recommended Tax Professionals',
      subtitle: taxPro ? `Best match: ${taxPro.name}` : 'No match found',
      renderAs: 'pro_cards',
      cards: [
        ...(taxPro ? [{ name: taxPro.name, badge: '⭐ Best Match', rating: taxPro.rating, specs: taxPro.specializations }] : []),
        ...alternates.map(a => ({ name: a.name, badge: 'Alternative', rating: a.rating, specs: a.specializations })),
      ]
    }
  });
});

app.get('/tax-pros', (_req: Request, res: Response) => {
  const pros = db.getAllTaxPros();
  res.json(pros);
});

// ── Local Dev REST API ─────────────────────────────────
// Simple REST endpoint so the local UI can call any MCP tool by name.
app.post('/api/tools/call', (req: Request, res: Response) => {
  const { name, args } = req.body as { name: string; args?: Record<string, unknown> };
  if (!name) {
    return res.status(400).json({ error: 'Missing tool name' });
  }
  const result = handleToolCall(name, args || {});

  // If the tool produced a StructuredUIResponse (interactive form/card components),
  // return it directly so the chat.html renderer can display it without an LLM round-trip.
  // We spread the structuredContent at the top level for backward compat with app.html
  // (which reads fields like .title, .cards) AND add it as a named field for chat.html.
  if (result.structuredContent) {
    return res.json({
      ...(result.structuredContent as object),
      structuredContent: result.structuredContent,
      _text: result.content[0]?.text || '',
    });
  }

  // Fallback: try to parse the text content as JSON (legacy UIResponse format)
  try {
    const uiResponse = JSON.parse(result.content[0].text);
    return res.json(uiResponse);
  } catch {
    return res.json({ raw: result.content[0].text });
  }
});

app.get('/api/tools', (_req: Request, res: Response) => {
  res.json(mcpTools);
});

// ── MCP Apps Widget Resource URI ────────────────────────────────────────────
// Version the URI path itself (not just query string) to bust ChatGPT's template cache.
// Bump this whenever the widget HTML/JS/CSS changes.
const WIDGET_VERSION = 'v4';
const WIDGET_RESOURCE_URI_BASE = `ui://taxpilot/widget-${WIDGET_VERSION}.html`;
// Official MIME type per https://developers.openai.com/apps-sdk/build/mcp-server
const WIDGET_MIME_TYPE = APP_WIDGET_MIME_TYPE;

/** Get the current widget resource URI (versioned so ChatGPT fetches fresh HTML after each tool call) */
function getWidgetResourceUri(): string {
  return toolResultVersion > 0
    ? `${WIDGET_RESOURCE_URI_BASE}?v=${toolResultVersion}`
    : WIDGET_RESOURCE_URI_BASE;
}

/**
 * Build the widget HTML for resources/read.
 * Returns a GENERIC JavaScript-powered template that receives tool data
 * via the MCP Apps bridge (window.openai.toolOutput + postMessage).
 * Per https://developers.openai.com/apps-sdk/build/chatgpt-ui/
 */
function readWidgetHtml(): string {
  return getAppWidgetHtml();
}

// ── Tool descriptor meta — matches OpenAI Apps SDK Skybridge format ─────────
// Required fields per github.com/openai/openai-apps-sdk-examples:
//   'openai/outputTemplate'          → URI of the widget resource (binds tool to widget)
//   'openai/toolInvocation/invoking' → loading message shown while tool runs
//   'openai/toolInvocation/invoked'  → completion message shown when done
//   'openai/widgetAccessible'        → true = widget can call this tool back
const URI = WIDGET_RESOURCE_URI_BASE;

function toolMeta(invoking: string, invoked: string) {
  return {
    'openai/outputTemplate': URI,
    'openai/toolInvocation/invoking': invoking,
    'openai/toolInvocation/invoked': invoked,
    'openai/widgetAccessible': true,
    // MCP Apps compatibility aliases
    ui: { resourceUri: URI },
    'ui/resourceUri': URI,
  };
}

const mcpTools = [
  { name: 'start_intake',            title: 'Start Intake',              description: 'Start a new client tax intake session. Begins the guided intake process to collect all necessary information before the tax appointment.', inputSchema: { type: 'object', properties: { clientId: { type: 'string', description: 'Optional existing client ID' } }, additionalProperties: false }, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }, _meta: toolMeta('Starting intake session…', 'Intake session ready') },
  { name: 'process_intake_response', title: 'Answer Intake Question',    description: 'Process the client response during the intake conversation. Send the answer to continue gathering information step by step.', inputSchema: { type: 'object', properties: { sessionId: { type: 'string' }, answer: { type: 'string', description: "Client's response to the current intake question" } }, required: ['sessionId', 'answer'], additionalProperties: false }, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }, _meta: toolMeta('Processing response…', 'Response recorded') },
  { name: 'get_intake_progress',     title: 'Get Intake Progress',       description: 'Get the current progress of an intake session including completed steps and percentage.', inputSchema: { type: 'object', properties: { sessionId: { type: 'string' } }, required: ['sessionId'], additionalProperties: false }, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }, _meta: toolMeta('Fetching intake progress…', 'Progress loaded') },
  { name: 'get_client_summary',      title: 'Client Summary',            description: 'Get a complete summary of all collected client information including income types, deductions, and complexity score.', inputSchema: { type: 'object', properties: { clientId: { type: 'string' } }, required: ['clientId'], additionalProperties: false }, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }, _meta: toolMeta('Loading client profile…', 'Profile loaded') },
  { name: 'generate_document_checklist', title: 'Generate Document Checklist', description: 'Generate a personalized document checklist based on the client tax situation (W-2s, 1099s, etc.).', inputSchema: { type: 'object', properties: { clientId: { type: 'string' } }, required: ['clientId'], additionalProperties: false }, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }, _meta: toolMeta('Building your checklist…', 'Checklist ready') },
  { name: 'get_pending_documents',   title: 'Pending Documents',         description: 'Get the list of required documents the client has not yet provided.', inputSchema: { type: 'object', properties: { clientId: { type: 'string' } }, required: ['clientId'], additionalProperties: false }, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }, _meta: toolMeta('Checking documents…', 'Documents listed') },
  { name: 'route_to_tax_pro',        title: 'Route to Tax Professional', description: 'Analyze client complexity and find the best-matched tax professional for their needs.', inputSchema: { type: 'object', properties: { clientId: { type: 'string' } }, required: ['clientId'], additionalProperties: false }, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }, _meta: toolMeta('Finding your tax professional…', 'Match found') },
  { name: 'get_appointment_estimate',title: 'Appointment Estimate',      description: 'Estimate how long the appointment will take based on client complexity and intake completion status.', inputSchema: { type: 'object', properties: { clientId: { type: 'string' } }, required: ['clientId'], additionalProperties: false }, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }, _meta: toolMeta('Estimating appointment…', 'Estimate ready') },
  { name: 'create_appointment',      title: 'Book Appointment',          description: 'Book an appointment between the client and a tax professional. Use route_to_tax_pro first to get the taxProId.', inputSchema: { type: 'object', properties: { clientId: { type: 'string', description: 'Client ID' }, taxProId: { type: 'string', description: 'Tax professional ID (from route_to_tax_pro)' }, scheduledAt: { type: 'string', description: 'ISO date-time (e.g. 2026-03-15T10:00:00)' }, type: { type: 'string', enum: ['virtual', 'in_person'], description: 'Appointment type' } }, required: ['clientId', 'taxProId', 'scheduledAt'], additionalProperties: false }, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }, _meta: toolMeta('Booking appointment…', 'Appointment confirmed!') },
  { name: 'create_reminder',         title: 'Create Document Reminders', description: 'Create automated reminders for a client about all pending documents.', inputSchema: { type: 'object', properties: { clientId: { type: 'string' }, appointmentId: { type: 'string', description: 'Optional appointment ID to link reminders to' } }, required: ['clientId'], additionalProperties: false }, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }, _meta: toolMeta('Setting up reminders…', 'Reminders created') },
  { name: 'send_reminder',           title: 'Send Reminder',             description: 'Send a specific reminder notification to a client.', inputSchema: { type: 'object', properties: { reminderId: { type: 'string' } }, required: ['reminderId'], additionalProperties: false }, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true }, _meta: toolMeta('Sending reminder…', 'Reminder sent!') },
  { name: 'get_client_reminders',    title: 'View Reminders',            description: 'Get all reminders scheduled for a client including sent and pending.', inputSchema: { type: 'object', properties: { clientId: { type: 'string' } }, required: ['clientId'], additionalProperties: false }, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }, _meta: toolMeta('Loading reminders…', 'Reminders loaded') },
  { name: 'send_client_notification',title: 'Send Notification',         description: 'Send a custom email or SMS notification to a client.', inputSchema: { type: 'object', properties: { clientId: { type: 'string' }, subject: { type: 'string' }, message: { type: 'string' }, notificationType: { type: 'string', enum: ['email', 'sms'] } }, required: ['clientId', 'subject', 'message'], additionalProperties: false }, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true }, _meta: toolMeta('Sending notification…', 'Notification sent!') },
  { name: 'mark_document_collected', title: 'Mark Document Collected',   description: 'Mark a specific document as collected/received from the client and update the checklist.', inputSchema: { type: 'object', properties: { clientId: { type: 'string' }, documentId: { type: 'string' } }, required: ['clientId', 'documentId'], additionalProperties: false }, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }, _meta: toolMeta('Updating checklist…', 'Document marked collected') },
  { name: 'get_tax_pro_recommendations', title: 'Tax Pro Recommendations', description: 'Get a list of recommended tax professionals for a client based on their specific tax situation and complexity.', inputSchema: { type: 'object', properties: { clientId: { type: 'string' } }, required: ['clientId'], additionalProperties: false }, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }, _meta: toolMeta('Finding best matches…', 'Recommendations ready') },
];

// Handle MCP tool calls — returns structured UIResponse via formatters + structuredContent for MCP Apps widget
function handleToolCall(name: string, args: Record<string, unknown>): { content: Array<{ type: string; text: string }>; structuredContent?: Record<string, unknown> } {
  try {
    switch (name) {
      case 'start_intake': {
        const result = startIntakeSession(args?.clientId as string | undefined);
        return toMcpContent(formatIntakeStart(result));
      }

      case 'process_intake_response': {
        const sid = args.sessionId as string;
        const step = args.step as string | undefined;
        const formData = args.formData as Record<string, string> | undefined;
        const selection = args.selection as string | undefined;
        const selections = args.selections as string[] | undefined;

        let result;
        if (step && (formData || selection || selections)) {
          result = processStructuredIntakeResponse(sid, step, formData, selection, selections);
        } else {
          result = processIntakeResponse(sid, args.answer as string);
        }

        const intakeProgress = getIntakeProgress(sid);
        return toMcpContent(formatIntakeResponse(result, sid, intakeProgress ? {
          completedSteps: intakeProgress.completedSteps,
          totalSteps: intakeProgress.totalSteps,
          percentComplete: intakeProgress.percentComplete,
        } : undefined));
      }

      case 'get_intake_progress': {
        const progress = getIntakeProgress(args.sessionId as string);
        return toMcpContent(formatIntakeProgress(progress, args.sessionId as string));
      }

      case 'get_client_summary': {
        const clientId = args.clientId as string;
        const summary = getIntakeSummary(clientId);
        const client = db.getClient(clientId);
        if (!client) {
          return { content: [{ type: 'text', text: 'Client not found' }] };
        }
        return toMcpContent(formatClientSummary(client, summary));
      }

      case 'generate_document_checklist': {
        const checklist = generateDocumentChecklist(args.clientId as string);
        return toMcpContent(formatDocChecklistUI(checklist, 'generate_document_checklist'));
      }

      case 'get_pending_documents': {
        const pending = getPendingDocuments(args.clientId as string);
        return toMcpContent(formatPendingDocuments(pending, args.clientId as string));
      }

      case 'route_to_tax_pro': {
        const clientId = args.clientId as string;
        const result = routeClientToTaxPro(clientId);
        return toMcpContent(formatRoutingResult(result, clientId));
      }

      case 'get_appointment_estimate': {
        const estimate = getAppointmentEstimate(args.clientId as string);
        return toMcpContent(formatEstimateUI(estimate, args.clientId as string));
      }

      case 'create_appointment': {
        const clientId = args.clientId as string;
        const appointment = createAppointment(
          clientId,
          args.taxProId as string,
          new Date(args.scheduledAt as string),
          (args.type as 'virtual' | 'in_person') || 'virtual'
        );
        const taxPro = db.getTaxPro(args.taxProId as string) ?? null;
        return toMcpContent(formatAppointmentCreated(appointment, taxPro, 0));
      }

      case 'create_reminder': {
        // Use batch reminder which creates a reminder for all pending documents
        const reminder = createBatchDocumentReminder(
          args.clientId as string,
          args.appointmentId as string || 'pending'
        );
        if (!reminder) {
          return { content: [{ type: 'text', text: '📋 No pending documents found for this client — no reminder needed!' }] };
        }
        return toMcpContent(formatRemindersCreated([reminder], args.clientId as string));
      }

      case 'send_reminder': {
        const result = sendReminder(args.reminderId as string);
        return toMcpContent(formatReminderSent(result, args.reminderId as string));
      }

      case 'get_client_reminders': {
        const reminders = getClientReminders(args.clientId as string);
        return toMcpContent(formatRemindersList(reminders, args.clientId as string));
      }

      case 'send_client_notification': {
        const notificationId = crypto.randomUUID();
        const notification = {
          id: notificationId,
          clientId: args.clientId as string,
          subject: args.subject as string,
          message: args.message as string,
          type: (args.notificationType as string) || 'email',
          sentAt: new Date().toISOString(),
        };
        return toMcpContent(formatNotificationSent(notification));
      }

      case 'mark_document_collected': {
        const result = markDocumentCollected(args.clientId as string, args.documentId as string);
        return toMcpContent(formatDocumentCollected(result, args.clientId as string, args.documentId as string));
      }

      case 'get_tax_pro_recommendations': {
        const clientId = args.clientId as string;
        const client = db.getClient(clientId);
        if (!client) {
          return { content: [{ type: 'text', text: 'Client not found' }] };
        }
        const { taxPro, reason, alternates } = findBestTaxPro(client);
        return toMcpContent(formatTaxProRecommendations(clientId, taxPro, reason, alternates));
      }

      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }] };
    }
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }] };
  }
}

// MCP Streamable HTTP transport - handles both GET (SSE) and POST (JSON-RPC)
// This implements the 2025-03-26 spec that ChatGPT uses

// POST handler for Streamable HTTP - receives JSON-RPC requests
app.post('/sse', (req: Request, res: Response) => {
  console.log('=== MCP POST /sse request ===');
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Accept:', req.headers['accept']);
  console.log('Raw body type:', typeof req.body);
  console.log('Body:', JSON.stringify(req.body));
  
  // If body is empty or not JSON, return error with details
  if (!req.body || Object.keys(req.body).length === 0) {
    console.log('Empty body received - returning 400');
    res.setHeader('Content-Type', 'application/json');
    return res.status(400).json({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32700, message: 'Parse error: Empty request body. Ensure Content-Type is application/json' }
    });
  }
  
  const { jsonrpc, method, params, id } = req.body || {};
  console.log('Method:', method, 'ID:', id);
  
  // Handle initialize request
  if (method === 'initialize') {
    const sessionId = crypto.randomUUID();
    // Echo the client's protocol version if provided, default to latest spec
    const clientVersion = params?.protocolVersion || '2025-03-26';
    
    // Return JSON response with capabilities
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Mcp-Session-Id', sessionId);
    res.json({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: clientVersion,
        serverInfo: { name: 'tax-intake-mcp', version: '1.0.0' },
        capabilities: { 
          tools: { listChanged: false },
          resources: { listChanged: false }
        }
      }
    });
    console.log(`MCP session initialized: ${sessionId} (protocol: ${clientVersion})`);
    return;
  }
  
  // Handle notifications/initialized
  if (method === 'notifications/initialized') {
    res.status(202).send();
    return;
  }
  
  // Handle tools/list
  if (method === 'tools/list') {
    res.setHeader('Content-Type', 'application/json');
    res.json({
      jsonrpc: '2.0',
      id,
      result: { tools: mcpTools }
    });
    return;
  }
  
  // Handle tools/call
  if (method === 'tools/call') {
    const toolName = params?.name as string;
    const toolResult = handleToolCall(toolName, params?.arguments || {});
    // Store latest result so widget can render via embedded data or REST fallback
    if (toolResult.structuredContent) {
      latestToolResult = toolResult.structuredContent;
      toolResultVersion++;
    }
    // Per Apps SDK spec: tool call _meta must carry invocation labels + output template
    // Also include ui.resourceUri with VERSIONED URI so ChatGPT re-fetches fresh pre-rendered HTML
    const versionedUri = getWidgetResourceUri();
    const calledTool = mcpTools.find(t => t.name === toolName);
    const invocationMeta = calledTool ? {
      'openai/outputTemplate': versionedUri,
      'openai/toolInvocation/invoking': (calledTool._meta as Record<string, unknown>)['openai/toolInvocation/invoking'],
      'openai/toolInvocation/invoked':  (calledTool._meta as Record<string, unknown>)['openai/toolInvocation/invoked'],
      'openai/widgetAccessible': true,
      ui: { resourceUri: versionedUri },
      'ui/resourceUri': versionedUri,
    } : {
      'openai/outputTemplate': versionedUri,
      ui: { resourceUri: versionedUri },
      'ui/resourceUri': versionedUri,
    };
    const response = {
      ...toolResult,
      _meta: invocationMeta,
    };
    res.setHeader('Content-Type', 'application/json');
    res.json({
      jsonrpc: '2.0',
      id,
      result: response
    });
    return;
  }
  
  // Handle resources/list - return the widget resource for MCP Apps
  if (method === 'resources/list') {
    res.setHeader('Content-Type', 'application/json');
    res.json({
      jsonrpc: '2.0',
      id,
      result: {
        resources: [{
          name: 'TaxPilot Widget',
          title: 'TaxPilot — H&R Block Tax Assistant',
          uri: WIDGET_RESOURCE_URI_BASE,
          mimeType: WIDGET_MIME_TYPE,
          description: 'H&R Block TaxPilot interactive UI widget — renders intake forms, document checklists, tax pro cards, and appointment summaries.',
          _meta: {
            ui: { prefersBorder: true },
          },
        }]
      }
    });
    return;
  }

  // Handle resource templates/list
  if (method === 'resources/templates/list' || method === 'resourceTemplates/list') {
    res.setHeader('Content-Type', 'application/json');
    res.json({
      jsonrpc: '2.0',
      id,
      result: {
        resourceTemplates: [{
          name: 'TaxPilot Widget',
          title: 'TaxPilot — H&R Block Tax Assistant',
          uriTemplate: WIDGET_RESOURCE_URI_BASE,
          mimeType: WIDGET_MIME_TYPE,
          description: 'H&R Block TaxPilot interactive UI widget',
          _meta: { ui: { prefersBorder: true } },
        }]
      }
    });
    return;
  }
  
  // Handle resources/read - return JS-powered widget template
  if (method === 'resources/read') {
    const uri = (params?.uri as string) || '';
    // Accept base URI or any versioned variant (ui://taxpilot/widget.html?v=N)
    if (uri.startsWith(WIDGET_RESOURCE_URI_BASE)) {
      try {
        const html = readWidgetHtml();
        res.setHeader('Content-Type', 'application/json');
        res.json({
          jsonrpc: '2.0',
          id,
          result: {
            contents: [{
              uri,
              mimeType: WIDGET_MIME_TYPE,
              text: html,
            }]
          }
        });
      } catch (e) {
        res.setHeader('Content-Type', 'application/json');
        res.json({
          jsonrpc: '2.0',
          id,
          error: { code: -32603, message: 'Failed to read widget HTML' }
        });
      }
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.json({
        jsonrpc: '2.0',
        id,
        error: { code: -32602, message: `Unknown resource: ${uri}` }
      });
    }
    return;
  }
  
  // Handle prompts/list - return empty (we don't have prompts)
  if (method === 'prompts/list') {
    res.setHeader('Content-Type', 'application/json');
    res.json({
      jsonrpc: '2.0',
      id,
      result: { prompts: [] }
    });
    return;
  }
  
  // Handle ping
  if (method === 'ping') {
    res.setHeader('Content-Type', 'application/json');
    res.json({ jsonrpc: '2.0', id, result: {} });
    return;
  }
  
  // Unknown method - return proper JSON-RPC error (not HTTP 400)
  res.setHeader('Content-Type', 'application/json');
  res.json({
    jsonrpc: '2.0',
    id,
    error: { code: -32601, message: `Method not found: ${method}` }
  });
});

// GET handler for legacy SSE transport (backwards compatibility)
app.get('/sse', (req: Request, res: Response) => {
  console.log('SSE GET connection requested (legacy transport)');
  
  // Disable request timeout for SSE
  req.setTimeout(0);
  res.setTimeout(0);
  
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();
  
  // Generate session ID using crypto
  const sessionId = crypto.randomUUID();
  const messagesUrl = `https://${req.get('host')}/messages?sessionId=${sessionId}`;
  sseSessions.set(sessionId, res);
  
  // Send endpoint event (MCP protocol) - use full URL for ChatGPT
  res.write(`event: endpoint\n`);
  res.write(`data: ${messagesUrl}\n\n`);
  
  // Keep-alive ping every 10 seconds (more frequent for ChatGPT)
  const pingInterval = setInterval(() => {
    if (!res.writableEnded) {
      res.write(`:ping ${Date.now()}\n\n`);
    } else {
      clearInterval(pingInterval);
    }
  }, 10000);
  
  // Cleanup on close
  req.on('close', () => {
    clearInterval(pingInterval);
    sseSessions.delete(sessionId);
    console.log(`SSE session ${sessionId} closed`);
  });
  
  res.on('error', () => {
    clearInterval(pingInterval);
    sseSessions.delete(sessionId);
  });
  
  console.log(`SSE session ${sessionId} established, messages URL: ${messagesUrl}`);
});

// MCP Messages endpoint - receives JSON-RPC requests
app.post('/messages', (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  
  if (!sessionId) {
    return res.status(400).json({ jsonrpc: '2.0', error: { code: -32600, message: 'Missing sessionId' }, id: null });
  }
  
  const sseRes = sseSessions.get(sessionId);
  if (!sseRes) {
    return res.status(404).json({ jsonrpc: '2.0', error: { code: -32600, message: 'Session not found' }, id: null });
  }
  
  const { jsonrpc, method, params, id } = req.body;
  console.log(`MCP request: ${method}`, params);
  
  let response: unknown;
  
  switch (method) {
    case 'initialize':
      response = {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: params?.protocolVersion || '2025-03-26',
          serverInfo: { name: 'tax-intake-mcp', version: '1.0.0' },
          capabilities: { tools: { listChanged: false }, resources: { listChanged: false } }
        }
      };
      break;

    case 'notifications/initialized':
      // Acknowledgment notification — no response needed
      res.status(202).send();
      return;
      
    case 'tools/list':
      response = {
        jsonrpc: '2.0',
        id,
        result: { tools: mcpTools }
      };
      break;
      
    case 'tools/call': {
      const legacyToolResult = handleToolCall(params.name, params.arguments || {});
      if (legacyToolResult.structuredContent) {
        latestToolResult = legacyToolResult.structuredContent;
        toolResultVersion++;
      }
      const legacyVersionedUri = getWidgetResourceUri();
      const legacyTool = mcpTools.find(t => t.name === params.name);
      const legacyMeta = legacyTool ? {
        'openai/outputTemplate': legacyVersionedUri,
        'openai/toolInvocation/invoking': (legacyTool._meta as Record<string, unknown>)['openai/toolInvocation/invoking'],
        'openai/toolInvocation/invoked':  (legacyTool._meta as Record<string, unknown>)['openai/toolInvocation/invoked'],
        'openai/widgetAccessible': true,
        ui: { resourceUri: legacyVersionedUri },
        'ui/resourceUri': legacyVersionedUri,
      } : {
        'openai/outputTemplate': legacyVersionedUri,
        ui: { resourceUri: legacyVersionedUri },
        'ui/resourceUri': legacyVersionedUri,
      };
      response = {
        jsonrpc: '2.0',
        id,
        result: { ...legacyToolResult, _meta: legacyMeta }
      };
      break;
    }

    case 'resources/list':
      response = {
        jsonrpc: '2.0',
        id,
        result: {
          resources: [{
            name: 'TaxPilot Widget',
            title: 'TaxPilot — H&R Block Tax Assistant',
            uri: WIDGET_RESOURCE_URI_BASE,
            mimeType: WIDGET_MIME_TYPE,
            description: 'H&R Block TaxPilot interactive UI widget',
            _meta: { ui: { prefersBorder: true } },
          }]
        }
      };
      break;

    case 'resources/templates/list':
    case 'resourceTemplates/list':
      response = {
        jsonrpc: '2.0',
        id,
        result: {
          resourceTemplates: [{
            name: 'TaxPilot Widget',
            title: 'TaxPilot — H&R Block Tax Assistant',
            uriTemplate: WIDGET_RESOURCE_URI_BASE,
            mimeType: WIDGET_MIME_TYPE,
            description: 'H&R Block TaxPilot interactive UI widget',
            _meta: { ui: { prefersBorder: true } },
          }]
        }
      };
      break;

    case 'resources/read': {
      const readUri = (params?.uri as string) || '';
      // Accept base URI or any versioned variant (ui://taxpilot/widget.html?v=N)
      if (readUri.startsWith(WIDGET_RESOURCE_URI_BASE)) {
        try {
          const html = readWidgetHtml();
          response = {
            jsonrpc: '2.0',
            id,
            result: {
              contents: [{
                uri: readUri,
                mimeType: WIDGET_MIME_TYPE,
                text: html,
              }]
            }
          };
        } catch {
          response = { jsonrpc: '2.0', id, error: { code: -32603, message: 'Failed to read widget' } };
        }
      } else {
        response = { jsonrpc: '2.0', id, error: { code: -32602, message: `Unknown resource: ${readUri}` } };
      }
      break;
    }

    case 'prompts/list':
      response = {
        jsonrpc: '2.0',
        id,
        result: { prompts: [] }
      };
      break;
      
    case 'ping':
      response = { jsonrpc: '2.0', id, result: {} };
      break;
      
    default:
      response = {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Method not found: ${method}` }
      };
  }
  
  res.json(response);
});

// ─── Widget Data REST endpoint (fallback when Apps SDK bridge isn't available) ─
app.get('/api/widget-data', (_req: Request, res: Response) => {
  if (latestToolResult) {
    res.json({ version: toolResultVersion, data: latestToolResult });
  } else {
    res.json({ version: 0, data: null });
  }
});

// ─── ChatGPT SDK-powered chat API ────────────────────────────────────────────
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { message, chatId } = req.body || {};
    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }
    const id = chatId || crypto.randomUUID();
    const result = await chat(id, message);
    res.json(result);
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Chat failed' });
  }
});

app.post('/api/chat/reset', (req: Request, res: Response) => {
  const { chatId } = req.body || {};
  if (chatId) resetChatSession(chatId);
  res.json({ ok: true });
});

// Serve the chat UI
app.get('/chat', (_req: Request, res: Response) => {
  try {
    const publicDir = path.join(__dirname, '..', '..', 'public');
    const chatPath = path.join(publicDir, 'chat.html');
    const html = fs.readFileSync(chatPath, 'utf-8');
    res.type('text/html').send(html);
  } catch (e) {
    res.status(404).send('Chat UI not found');
  }
});

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.type('text/html').send(`
    <!DOCTYPE html>
    <html>
    <head><title>Tax Intake MCP Server</title></head>
    <body>
      <h1>Tax Intake MCP Server</h1>
      <p>This is an MCP server for tax client intake and appointment optimization.</p>
      <h2>Endpoints:</h2>
      <ul>
        <li><a href="/health">/health</a> - Health check</li>
        <li><a href="/openapi.yaml">/openapi.yaml</a> - OpenAPI specification</li>
        <li><a href="/privacy">/privacy</a> - Privacy policy</li>
        <li>/sse - MCP SSE endpoint (for ChatGPT)</li>
      </ul>
    </body>
    </html>
  `);
});

// Export app for external use (e.g., Azure)
export default app;

// Self-ping to keep Azure Free tier warm
function startSelfPing(port: number | string) {
  const pingInterval = 4 * 60 * 1000; // 4 minutes
  const host = process.env.WEBSITE_HOSTNAME || `localhost:${port}`;
  const protocol = process.env.WEBSITE_HOSTNAME ? 'https' : 'http';
  const pingUrl = `${protocol}://${host}/health`;
  
  setInterval(async () => {
    try {
      const response = await fetch(pingUrl);
      console.log(`[Self-ping] ${new Date().toISOString()} - Status: ${response.status}`);
    } catch (error) {
      console.log(`[Self-ping] ${new Date().toISOString()} - Error (expected on localhost)`);
    }
  }, pingInterval);
  
  console.log(`[Self-ping] Enabled - pinging ${pingUrl} every 4 minutes`);
}

// Only start server if running directly (not imported)
const argv1 = process.argv[1]?.replace(/\\/g, '/');
const isMainModule = import.meta.url === `file://${argv1}` || import.meta.url === `file:///${argv1}`;
if (isMainModule) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Tax Intake MCP Server running on http://localhost:${PORT}`);
    
    // Start self-ping on Azure to prevent cold starts
    if (process.env.WEBSITE_HOSTNAME) {
      startSelfPing(PORT);
    }
  });
}
