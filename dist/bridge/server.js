import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { startIntakeSession, processIntakeResponse, processStructuredIntakeResponse, getIntakeProgress, getIntakeSummary, } from '../services/intake.js';
import { generateDocumentChecklist, getDocumentChecklist, markDocumentCollected, getPendingDocuments, } from '../services/checklist.js';
import { createDocumentReminder, createBatchDocumentReminder, getClientReminders, sendReminder, } from '../services/reminders.js';
import { findBestTaxPro, routeClientToTaxPro, createAppointment, getAppointmentEstimate, } from '../services/routing.js';
import { db } from '../database/index.js';
import { chat, resetChatSession } from '../chatgpt/chatEngine.js';
// UI Formatters
import { formatIntakeStart, formatIntakeResponse, formatIntakeProgress, formatClientSummary, } from '../ui/formatters/intake.js';
import { formatDocumentChecklist as formatDocChecklistUI, formatDocumentCollected, formatPendingDocuments, } from '../ui/formatters/checklist.js';
import { formatRoutingResult, formatTaxProRecommendations, formatAppointmentEstimate as formatEstimateUI, formatAppointmentCreated, } from '../ui/formatters/routing.js';
import { formatRemindersCreated, formatRemindersList, formatReminderSent, formatNotificationSent, } from '../ui/formatters/reminders.js';
import { formatWelcomeScreen } from '../ui/formatters/welcome.js';
import { getAppWidgetHtml, APP_WIDGET_MIME_TYPE } from '../ui/appWidgetHtml.js';
import { uiResponseToStructured } from '../ui/uiResponseToStructured.js';
/** Wrap a UIResponse into the MCP content block format with structuredContent for Apps SDK widget.
 *  Always converts to StructuredUIResponse format (screen + components[]) so chat.html can render it. */
function toMcpContent(uiResp) {
    // Ensure the structuredContent is always in StructuredUIResponse format (screen + components[])
    const structured = uiResponseToStructured(uiResp);
    const screen = typeof structured.screen === 'string' ? structured.screen : null;
    const readable = screen
        ? `TaxPilot UI updated (${screen}).`
        : 'TaxPilot UI updated.';
    return {
        content: [{ type: 'text', text: readable }],
        structuredContent: structured,
    };
}
// Get __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
// Store active SSE sessions
const sseSessions = new Map();
// Store latest tool result so the widget can render data even without the Apps SDK bridge
let latestToolResult = null;
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
// ChatGPT Plugin manifest
// Must be registered before `express.static` because static middleware may short-circuit
// dot-directories (like `/.well-known`) with a 404 depending on dotfile handling.
app.get('/.well-known/ai-plugin.json', (_req, res) => {
    try {
        const publicDir = path.join(__dirname, '..', '..', 'public');
        const manifestPath = path.join(publicDir, '.well-known', 'ai-plugin.json');
        const manifest = fs.readFileSync(manifestPath, 'utf-8');
        res.type('application/json').send(manifest);
    }
    catch (e) {
        res.status(404).json({ error: 'Plugin manifest not found' });
    }
});
app.use(express.static('public', {
    etag: false,
    lastModified: true,
    setHeaders: (res, filePath) => {
        // Disable caching for HTML and JS files during development so changes
        // are picked up immediately without a hard refresh.
        if (filePath.endsWith('.html') || filePath.endsWith('.js')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
    },
}));
// OpenAPI specification
app.get('/openapi.yaml', (_req, res) => {
    try {
        const publicDir = path.join(__dirname, '..', '..', 'public');
        const openapiPath = path.join(publicDir, 'openapi.yaml');
        const yaml = fs.readFileSync(openapiPath, 'utf-8');
        res.type('text/yaml').send(yaml);
    }
    catch (e) {
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
    }
    catch (e) {
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
app.post('/intake/start', (req, res) => {
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
app.post('/intake/respond', (req, res) => {
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
app.get('/intake/progress/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const progress = getIntakeProgress(sessionId);
    res.json(progress || { error: 'Session not found' });
});
app.get('/client/:clientId/summary', (req, res) => {
    const { clientId } = req.params;
    const client = db.getClient(clientId);
    if (!client)
        return res.status(404).json({ error: 'Client not found' });
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
                    ] },
            ],
            complexityBadge: client.complexityScore < 30 ? 'Simple' : client.complexityScore < 60 ? 'Moderate' : client.complexityScore < 80 ? 'Complex' : 'Expert'
        }
    });
});
// Checklist endpoints
app.post('/client/:clientId/checklist/generate', (req, res) => {
    const { clientId } = req.params;
    const checklist = generateDocumentChecklist(clientId);
    const collected = checklist.documents.filter(d => d.collected).length;
    const total = checklist.documents.length;
    const byCategory = {};
    checklist.documents.forEach(d => {
        if (!byCategory[d.category])
            byCategory[d.category] = [];
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
app.get('/client/:clientId/checklist', (req, res) => {
    const { clientId } = req.params;
    const checklist = getDocumentChecklist(clientId);
    if (!checklist)
        return res.status(404).json({ error: 'Checklist not found' });
    const collected = checklist.documents.filter(d => d.collected).length;
    const total = checklist.documents.length;
    const byCategory = {};
    checklist.documents.forEach(d => {
        if (!byCategory[d.category])
            byCategory[d.category] = [];
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
app.post('/client/:clientId/checklist/collect', (req, res) => {
    const { clientId } = req.params;
    const { documentId } = req.body || {};
    const result = markDocumentCollected(clientId, documentId);
    res.json(result);
});
app.get('/client/:clientId/checklist/pending', (req, res) => {
    const { clientId } = req.params;
    const pending = getPendingDocuments(clientId);
    res.json(pending);
});
// Reminder endpoints
app.post('/client/:clientId/reminders/documents', (req, res) => {
    const { clientId } = req.params;
    const { appointmentId } = req.body || {};
    const pending = getPendingDocuments(clientId);
    if (pending.length === 0)
        return res.json({ message: 'No pending documents', reminders: [] });
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
app.get('/client/:clientId/reminders', (req, res) => {
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
app.post('/reminders/send', (req, res) => {
    const { reminderId } = req.body || {};
    const result = sendReminder(reminderId);
    res.json(result);
});
// Routing + appointments
app.post('/client/:clientId/route', (req, res) => {
    const { clientId } = req.params;
    const result = routeClientToTaxPro(clientId);
    res.json(result);
});
app.post('/appointments', (req, res) => {
    const { clientId, taxProId, scheduledAt, type } = req.body || {};
    const appointment = createAppointment(clientId, taxProId, new Date(scheduledAt), type);
    res.json(appointment);
});
app.get('/client/:clientId/appointment/estimate', (req, res) => {
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
app.get('/client/:clientId/recommendations', (req, res) => {
    const { clientId } = req.params;
    const client = db.getClient(clientId);
    if (!client)
        return res.status(404).json({ error: 'Client not found' });
    const { taxPro, reason, alternates } = findBestTaxPro(client);
    const formatPro = (p) => ({
        id: p.id,
        name: p.name,
        specializations: p.specializations.map((s) => s.replace(/_/g, ' ')),
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
app.get('/tax-pros', (_req, res) => {
    const pros = db.getAllTaxPros();
    res.json(pros);
});
// ── Local Dev REST API ─────────────────────────────────
// Simple REST endpoint so the local UI can call any MCP tool by name.
app.post('/api/tools/call', (req, res) => {
    const { name, args } = req.body;
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
            ...result.structuredContent,
            structuredContent: result.structuredContent,
            _text: result.content[0]?.text || '',
        });
    }
    // Fallback: try to parse the text content as JSON (legacy UIResponse format)
    try {
        const uiResponse = JSON.parse(result.content[0].text);
        return res.json(uiResponse);
    }
    catch {
        return res.json({ raw: result.content[0].text });
    }
});
app.get('/api/tools', (_req, res) => {
    res.json(mcpTools);
});
// ── MCP Apps Widget Resource URI ────────────────────────────────────────────
// Keep URI stable per server process, but include a build token so ChatGPT
// does not keep serving a stale cached widget after a deployment/restart.
const WIDGET_RESOURCE_URI_ROOT = 'ui://taxpilot/widget.html';
const WIDGET_BUILD_ID = encodeURIComponent(process.env.TAXPILOT_WIDGET_BUILD_ID
    || process.env.WEBSITE_INSTANCE_ID
    || Date.now().toString(36));
const WIDGET_RESOURCE_URI = `${WIDGET_RESOURCE_URI_ROOT}?build=${WIDGET_BUILD_ID}`;
const WIDGET_MIME_TYPE = APP_WIDGET_MIME_TYPE;
/**
 * Build the widget HTML for resources/read.
 * Returns a GENERIC JavaScript-powered template that receives tool data
 * via the MCP Apps bridge (window.openai.toolOutput + postMessage).
 * Injects the server URL so the widget can call the REST API as fallback.
 */
function readWidgetHtml(serverUrl) {
    let html = getAppWidgetHtml();
    if (serverUrl) {
        html = html.replace('data-server-url=""', 'data-server-url="' + serverUrl + '"');
        html = html.replace('var __TP_SERVER_URL__ = "";', 'var __TP_SERVER_URL__ = "' + serverUrl + '";');
    }
    return html;
}
// ── Tool descriptor meta — matches OpenAI kitchen-sink-lite reference ────────
// Per github.com/openai/openai-apps-sdk-examples/kitchen_sink_server_node:
//   'openai/outputTemplate'          → URI of the widget resource (binds tool to widget)
//   'openai/toolInvocation/invoking' → loading message shown while tool runs
//   'openai/toolInvocation/invoked'  → completion message shown when done
//   'openai/widgetAccessible'        → true = widget can call this tool back
/** Tool DESCRIPTOR meta — used in tools/list so ChatGPT knows which widget to mount.
 *  Includes openai/outputTemplate which binds the tool to the widget resource. */
function toolMeta(invoking, invoked) {
    return {
        'openai/outputTemplate': WIDGET_RESOURCE_URI,
        'openai/toolInvocation/invoking': invoking,
        'openai/toolInvocation/invoked': invoked,
        'openai/widgetAccessible': true,
    };
}
/** Tool INVOCATION meta — used in tools/call RESPONSES.
 *  Per kitchen-sink-lite reference: tool call responses MUST include openai/outputTemplate
 *  so ChatGPT knows which widget to update with the new structuredContent. */
function toolInvocationMeta(toolName) {
    return {
        ...toolMeta(`Processing ${toolName}…`, `${toolName} complete`),
        invocation: toolName,
    };
}
const mcpTools = [
    { name: 'render_taxpilot_ui', title: 'Show TaxPilot UI', description: 'Render the TaxPilot home screen widget with welcome message and action buttons. Call this at conversation start so the user sees the UI immediately.', inputSchema: { type: 'object', properties: {} }, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }, _meta: toolMeta('Rendering TaxPilot UI…', 'TaxPilot UI ready') },
    { name: 'start_intake', title: 'Start Intake', description: 'Start a new client tax intake session. Begins the guided intake process to collect all necessary information before the tax appointment.', inputSchema: { type: 'object', properties: { clientId: { type: 'string', description: 'Optional existing client ID' }, selection: { type: 'string', description: 'UI selection value (set by widget)' } } }, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }, _meta: toolMeta('Starting intake session…', 'Intake session ready') },
    { name: 'process_intake_response', title: 'Answer Intake Question', description: 'Process the client response during the intake conversation. Accepts structured form data from the widget or plain text answer from the model.', inputSchema: { type: 'object', properties: { sessionId: { type: 'string', description: 'Intake session ID' }, answer: { type: 'string', description: 'Text answer from conversation (model-initiated)' }, step: { type: 'string', description: 'Current intake step identifier (widget-initiated)' }, formData: { type: 'object', description: 'Form field values from widget submission' }, selection: { type: 'string', description: 'Single selection value from widget' }, selections: { type: 'array', items: { type: 'string' }, description: 'Multiple selections from widget' } }, required: ['sessionId'] }, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }, _meta: toolMeta('Processing response…', 'Response recorded') },
    { name: 'get_intake_progress', title: 'Get Intake Progress', description: 'Get the current progress of an intake session including completed steps and percentage.', inputSchema: { type: 'object', properties: { sessionId: { type: 'string' } }, required: ['sessionId'] }, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }, _meta: toolMeta('Fetching intake progress…', 'Progress loaded') },
    { name: 'get_client_summary', title: 'Client Summary', description: 'Get a complete summary of all collected client information including income types, deductions, and complexity score.', inputSchema: { type: 'object', properties: { clientId: { type: 'string' } }, required: ['clientId'] }, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }, _meta: toolMeta('Loading client profile…', 'Profile loaded') },
    { name: 'generate_document_checklist', title: 'Generate Document Checklist', description: 'Generate a personalized document checklist based on the client tax situation (W-2s, 1099s, etc.).', inputSchema: { type: 'object', properties: { clientId: { type: 'string' }, selection: { type: 'string', description: 'UI selection value (set by widget)' } } }, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }, _meta: toolMeta('Building your checklist…', 'Checklist ready') },
    { name: 'get_pending_documents', title: 'Pending Documents', description: 'Get the list of required documents the client has not yet provided.', inputSchema: { type: 'object', properties: { clientId: { type: 'string' } }, required: ['clientId'] }, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }, _meta: toolMeta('Checking documents…', 'Documents listed') },
    { name: 'route_to_tax_pro', title: 'Route to Tax Professional', description: 'Analyze client complexity and find the best-matched tax professional for their needs.', inputSchema: { type: 'object', properties: { clientId: { type: 'string' }, selection: { type: 'string', description: 'UI selection value (set by widget)' } } }, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }, _meta: toolMeta('Finding your tax professional…', 'Match found') },
    { name: 'get_appointment_estimate', title: 'Appointment Estimate', description: 'Estimate how long the appointment will take based on client complexity and intake completion status.', inputSchema: { type: 'object', properties: { clientId: { type: 'string' } }, required: ['clientId'] }, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }, _meta: toolMeta('Estimating appointment…', 'Estimate ready') },
    { name: 'create_appointment', title: 'Book Appointment', description: 'Book an appointment between the client and a tax professional. Use route_to_tax_pro first to get the taxProId.', inputSchema: { type: 'object', properties: { clientId: { type: 'string', description: 'Client ID' }, taxProId: { type: 'string', description: 'Tax professional ID (from route_to_tax_pro)' }, scheduledAt: { type: 'string', description: 'ISO date-time (e.g. 2026-03-15T10:00:00)' }, type: { type: 'string', enum: ['virtual', 'in_person'], description: 'Appointment type' } }, required: ['clientId', 'taxProId', 'scheduledAt'] }, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }, _meta: toolMeta('Booking appointment…', 'Appointment confirmed!') },
    { name: 'create_reminder', title: 'Create Document Reminders', description: 'Create automated reminders for a client about all pending documents.', inputSchema: { type: 'object', properties: { clientId: { type: 'string' }, appointmentId: { type: 'string', description: 'Optional appointment ID to link reminders to' } }, required: ['clientId'] }, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }, _meta: toolMeta('Setting up reminders…', 'Reminders created') },
    { name: 'send_reminder', title: 'Send Reminder', description: 'Send a specific reminder notification to a client.', inputSchema: { type: 'object', properties: { reminderId: { type: 'string' } }, required: ['reminderId'] }, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true }, _meta: toolMeta('Sending reminder…', 'Reminder sent!') },
    { name: 'get_client_reminders', title: 'View Reminders', description: 'Get all reminders scheduled for a client including sent and pending.', inputSchema: { type: 'object', properties: { clientId: { type: 'string' } }, required: ['clientId'] }, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }, _meta: toolMeta('Loading reminders…', 'Reminders loaded') },
    { name: 'send_client_notification', title: 'Send Notification', description: 'Send a custom email or SMS notification to a client.', inputSchema: { type: 'object', properties: { clientId: { type: 'string' }, subject: { type: 'string' }, message: { type: 'string' }, notificationType: { type: 'string', enum: ['email', 'sms'] } }, required: ['clientId', 'subject', 'message'] }, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true }, _meta: toolMeta('Sending notification…', 'Notification sent!') },
    { name: 'mark_document_collected', title: 'Mark Document Collected', description: 'Mark a specific document as collected/received from the client and update the checklist.', inputSchema: { type: 'object', properties: { clientId: { type: 'string' }, documentId: { type: 'string' } }, required: ['clientId', 'documentId'] }, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }, _meta: toolMeta('Updating checklist…', 'Document marked collected') },
    { name: 'get_tax_pro_recommendations', title: 'Tax Pro Recommendations', description: 'Get a list of recommended tax professionals for a client based on their specific tax situation and complexity.', inputSchema: { type: 'object', properties: { clientId: { type: 'string' } }, required: ['clientId'] }, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }, _meta: toolMeta('Finding best matches…', 'Recommendations ready') },
    { name: 'confirm_intake_summary', title: 'Confirm Intake Summary', description: 'Confirm the client intake summary and advance to document checklist.', inputSchema: { type: 'object', properties: { clientId: { type: 'string' } }, required: ['clientId'] }, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }, _meta: toolMeta('Confirming summary…', 'Summary confirmed') },
    { name: 'get_flow_progress', title: 'Get Flow Progress', description: 'Get the current flow progress and next available action.', inputSchema: { type: 'object', properties: { clientId: { type: 'string' } } }, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }, _meta: toolMeta('Loading progress…', 'Progress loaded') },
    { name: 'get_conversation_flow', title: 'Get Conversation Flow', description: 'Get current conversation flow state and resume from where the user left off.', inputSchema: { type: 'object', properties: { clientId: { type: 'string' } } }, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }, _meta: toolMeta('Loading flow…', 'Flow loaded') },
];
// Handle MCP tool calls — returns structured UIResponse via formatters + structuredContent for MCP Apps widget
function handleToolCall(name, args) {
    try {
        switch (name) {
            case 'render_taxpilot_ui':
            case 'render_welcome_ui': {
                return toMcpContent(formatWelcomeScreen());
            }
            case 'start_intake': {
                const result = startIntakeSession(args?.clientId);
                return toMcpContent(formatIntakeStart(result));
            }
            case 'process_intake_response': {
                const sid = args.sessionId;
                const step = args.step;
                let formData = args.formData;
                const selection = args.selection;
                const selections = args.selections;
                // Widget sends form values at top level, not nested in formData
                // Extract them if formData wasn't explicitly provided
                if (!formData && step && args) {
                    const knownKeys = ['sessionId', 'step', 'formData', 'selection', 'selections', 'answer'];
                    const extractedData = {};
                    for (const [key, value] of Object.entries(args)) {
                        if (!knownKeys.includes(key) && value !== undefined && value !== null) {
                            extractedData[key] = String(value);
                        }
                    }
                    if (Object.keys(extractedData).length > 0) {
                        formData = extractedData;
                    }
                }
                let result;
                if (step && (formData || selection || selections)) {
                    result = processStructuredIntakeResponse(sid, step, formData, selection, selections);
                }
                else {
                    result = processIntakeResponse(sid, args.answer);
                }
                // Surface errors immediately (e.g. session/client not found) instead of
                // silently falling through and re-rendering the wrong intake step.
                if (!result.success) {
                    const errUI = {
                        id: `err-${Date.now()}`,
                        screen: 'error',
                        components: [
                            {
                                type: 'banner',
                                text: `\u26A0\uFE0F ${result.message ?? 'Your session has expired. Please start a new intake.'}`,
                                variant: 'error',
                                icon: '\u26A0\uFE0F',
                            },
                            {
                                type: 'button',
                                label: '\uD83D\uDD04 Start New Intake',
                                variant: 'primary',
                                action: { type: 'tool_call', tool: 'start_intake', parameters: {} },
                            },
                        ],
                        _meta: { toolName: 'process_intake_response', timestamp: new Date().toISOString() },
                    };
                    return toMcpContent(errUI);
                }
                const intakeProgress = getIntakeProgress(sid);
                return toMcpContent(formatIntakeResponse(result, sid, intakeProgress ? {
                    completedSteps: intakeProgress.completedSteps,
                    totalSteps: intakeProgress.totalSteps,
                    percentComplete: intakeProgress.percentComplete,
                } : undefined));
            }
            case 'get_intake_progress': {
                const progress = getIntakeProgress(args.sessionId);
                return toMcpContent(formatIntakeProgress(progress, args.sessionId));
            }
            case 'get_client_summary': {
                const clientId = args.clientId;
                const summary = getIntakeSummary(clientId);
                const client = db.getClient(clientId);
                if (!client) {
                    return { content: [{ type: 'text', text: 'Client not found' }] };
                }
                return toMcpContent(formatClientSummary(client, summary));
            }
            case 'generate_document_checklist': {
                const checklist = generateDocumentChecklist(args.clientId);
                return toMcpContent(formatDocChecklistUI(checklist, 'generate_document_checklist'));
            }
            case 'get_pending_documents': {
                const pending = getPendingDocuments(args.clientId);
                return toMcpContent(formatPendingDocuments(pending, args.clientId));
            }
            case 'route_to_tax_pro': {
                const clientId = args.clientId;
                const result = routeClientToTaxPro(clientId);
                return toMcpContent(formatRoutingResult(result, clientId));
            }
            case 'get_appointment_estimate': {
                const estimate = getAppointmentEstimate(args.clientId);
                return toMcpContent(formatEstimateUI(estimate, args.clientId));
            }
            case 'create_appointment': {
                const clientId = args.clientId;
                const appointment = createAppointment(clientId, args.taxProId, new Date(args.scheduledAt), args.type || 'virtual');
                const taxPro = db.getTaxPro(args.taxProId) ?? null;
                return toMcpContent(formatAppointmentCreated(appointment, taxPro, 0));
            }
            case 'create_reminder': {
                // Use batch reminder which creates a reminder for all pending documents
                const reminder = createBatchDocumentReminder(args.clientId, args.appointmentId || 'pending');
                if (!reminder) {
                    return { content: [{ type: 'text', text: '📋 No pending documents found for this client — no reminder needed!' }] };
                }
                return toMcpContent(formatRemindersCreated([reminder], args.clientId));
            }
            case 'send_reminder': {
                const result = sendReminder(args.reminderId);
                return toMcpContent(formatReminderSent(result, args.reminderId));
            }
            case 'get_client_reminders': {
                const reminders = getClientReminders(args.clientId);
                return toMcpContent(formatRemindersList(reminders, args.clientId));
            }
            case 'send_client_notification': {
                const notificationId = crypto.randomUUID();
                const notification = {
                    id: notificationId,
                    clientId: args.clientId,
                    subject: args.subject,
                    message: args.message,
                    type: args.notificationType || 'email',
                    sentAt: new Date().toISOString(),
                };
                return toMcpContent(formatNotificationSent(notification));
            }
            case 'mark_document_collected': {
                const result = markDocumentCollected(args.clientId, args.documentId);
                return toMcpContent(formatDocumentCollected(result, args.clientId, args.documentId));
            }
            case 'get_tax_pro_recommendations': {
                const clientId = args.clientId;
                const client = db.getClient(clientId);
                if (!client) {
                    return { content: [{ type: 'text', text: 'Client not found' }] };
                }
                const { taxPro, reason, alternates } = findBestTaxPro(client);
                return toMcpContent(formatTaxProRecommendations(clientId, taxPro, reason, alternates));
            }
            // ── Summary confirmation — advances flow to document checklist ──
            case 'confirm_intake_summary': {
                const cid = args.clientId;
                const client = db.getClient(cid);
                if (!client) {
                    return { content: [{ type: 'text', text: 'Client not found' }] };
                }
                // Generate checklist automatically upon confirmation
                const confirmChecklist = generateDocumentChecklist(cid);
                const confirmUI = {
                    id: `confirm-${Date.now()}`,
                    screen: 'document_checklist',
                    components: [
                        { type: 'banner', text: '✅ Summary confirmed! Now let\'s prepare your documents.', variant: 'success', icon: '✅', confetti: true },
                        { type: 'text_block', text: 'Document Checklist Generated', style: 'heading' },
                        { type: 'text_block', text: `We found ${confirmChecklist.documents.length} documents you\'ll need for your appointment.`, style: 'body' },
                        { type: 'progress_bar', value: 0, max: confirmChecklist.documents.length, label: `0 of ${confirmChecklist.documents.length} collected` },
                        {
                            type: 'button', label: '📋 View Full Checklist', variant: 'primary', icon: '📋',
                            action: { type: 'tool_call', tool: 'generate_document_checklist', toolName: 'generate_document_checklist', parameters: { clientId: cid } },
                        },
                        {
                            type: 'button', label: '👨‍💼 Skip to Tax Pro Matching', variant: 'secondary', icon: '👨‍💼',
                            action: { type: 'tool_call', tool: 'route_to_tax_pro', toolName: 'route_to_tax_pro', parameters: { clientId: cid } },
                        },
                    ],
                    stateUpdates: { screen: 'document_checklist' },
                    data: { clientId: cid, totalDocuments: confirmChecklist.documents.length },
                    _meta: { toolName: 'confirm_intake_summary', timestamp: new Date().toISOString(), nextSuggestedTools: ['generate_document_checklist', 'route_to_tax_pro'] },
                };
                return { content: [{ type: 'text', text: 'Summary confirmed. Document checklist generated.' }], structuredContent: confirmUI };
            }
            // ── Flow progress — shows current state and next action ──
            case 'get_flow_progress':
            case 'get_conversation_flow': {
                const fpClientId = args.clientId;
                const fpClient = fpClientId ? db.getClient(fpClientId) : null;
                let flowScreen = 'home';
                let flowMessage = 'Start your guided intake to begin.';
                const flowButtons = [];
                if (fpClient?.intakeCompleted) {
                    const fpChecklist = getDocumentChecklist(fpClientId);
                    if (fpChecklist) {
                        const collected = fpChecklist.documents.filter((d) => d.collected).length;
                        const total = fpChecklist.documents.length;
                        flowScreen = 'document_checklist';
                        flowMessage = `Intake complete. Documents: ${collected}/${total} collected.`;
                        flowButtons.push({
                            type: 'button', label: '📋 View Checklist', variant: 'primary', icon: '📋',
                            action: { type: 'tool_call', tool: 'generate_document_checklist', toolName: 'generate_document_checklist', parameters: { clientId: fpClientId } },
                        });
                    }
                    flowButtons.push({
                        type: 'button', label: '👨‍💼 Match Tax Pro', variant: 'secondary', icon: '👨‍💼',
                        action: { type: 'tool_call', tool: 'route_to_tax_pro', toolName: 'route_to_tax_pro', parameters: { clientId: fpClientId } },
                    });
                }
                else {
                    flowScreen = 'home';
                    flowButtons.push({
                        type: 'button', label: '🚀 Start Guided Intake', variant: 'primary', icon: '🚀',
                        action: { type: 'tool_call', tool: 'start_intake', toolName: 'start_intake', parameters: {} },
                    });
                }
                const flowUI = {
                    id: `flow-${Date.now()}`,
                    screen: flowScreen,
                    components: [
                        { type: 'text_block', text: 'Flow Progress', style: 'heading' },
                        { type: 'text_block', text: flowMessage, style: 'body' },
                        ...flowButtons,
                    ],
                    stateUpdates: { screen: flowScreen },
                    data: { clientId: fpClientId },
                    _meta: { toolName: name, timestamp: new Date().toISOString() },
                };
                return { content: [{ type: 'text', text: flowMessage }], structuredContent: flowUI };
            }
            default:
                return { content: [{ type: 'text', text: `Unknown tool: ${name}` }] };
        }
    }
    catch (error) {
        return { content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }] };
    }
}
// ── MCP Streamable HTTP transport ────────────────────────────────────────────
// Implements the 2025-03-26 spec that ChatGPT uses.
// Exposed at both /mcp (standard) and /sse (legacy) for backwards-compat.
function handleMcpPost(req, res) {
    console.log('=== MCP POST request ===');
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
        const toolName = params?.name;
        const toolResult = handleToolCall(toolName, params?.arguments || {});
        // Store latest result so widget can render via embedded data or REST fallback
        if (toolResult.structuredContent) {
            latestToolResult = toolResult.structuredContent;
            toolResultVersion++;
        }
        // Per kitchen-sink-lite reference: tool call responses MUST include
        // openai/outputTemplate so ChatGPT delivers structuredContent to the widget.
        const response = {
            ...toolResult,
            _meta: toolInvocationMeta(toolName),
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
                        uri: WIDGET_RESOURCE_URI,
                        mimeType: WIDGET_MIME_TYPE,
                        description: 'H&R Block TaxPilot interactive UI widget — renders intake forms, document checklists, tax pro cards, and appointment summaries.',
                        _meta: toolMeta('Rendering TaxPilot…', 'TaxPilot ready'),
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
                        uriTemplate: WIDGET_RESOURCE_URI,
                        mimeType: WIDGET_MIME_TYPE,
                        description: 'H&R Block TaxPilot interactive UI widget',
                        _meta: toolMeta('Rendering TaxPilot…', 'TaxPilot ready'),
                    }]
            }
        });
        return;
    }
    // Handle resources/read - return JS-powered widget template
    if (method === 'resources/read') {
        const uri = params?.uri || '';
        // Accept base URI or any versioned variant (ui://taxpilot/widget.html?v=N)
        if (uri.startsWith(WIDGET_RESOURCE_URI_ROOT)) {
            try {
                const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
                const host = req.get('host') || 'localhost:8000';
                const serverUrl = proto + '://' + host;
                const html = readWidgetHtml(serverUrl);
                res.setHeader('Content-Type', 'application/json');
                res.json({
                    jsonrpc: '2.0',
                    id,
                    result: {
                        contents: [{
                                uri,
                                mimeType: WIDGET_MIME_TYPE,
                                text: html,
                                _meta: toolMeta('Rendering TaxPilot…', 'TaxPilot ready'),
                            }]
                    }
                });
            }
            catch (e) {
                res.setHeader('Content-Type', 'application/json');
                res.json({
                    jsonrpc: '2.0',
                    id,
                    error: { code: -32603, message: 'Failed to read widget HTML' }
                });
            }
        }
        else {
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
}
// Mount MCP POST handler on both /mcp (ChatGPT standard) and /sse (legacy)
app.post('/mcp', handleMcpPost);
app.post('/sse', handleMcpPost);
// GET handler for legacy SSE transport (backwards compatibility)
app.get('/sse', (req, res) => {
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
    // Some proxies (including certain Azure/IIS configurations) buffer small chunks
    // and won't deliver *any* bytes to the client until a threshold is reached.
    // Send an initial padded SSE comment to force the first flush.
    res.write(`:${' '.repeat(16384)}\n\n`);
    // If the runtime provides res.flush (e.g., via certain middleware), use it.
    // This is a no-op on plain Express Response.
    res.flush?.();
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
        }
        else {
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
// Also serve SSE GET on /mcp for clients that open the endpoint
app.get('/mcp', (req, res) => {
    console.log('SSE GET connection on /mcp');
    req.setTimeout(0);
    res.setTimeout(0);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();
    // See /sse handler — force an initial flush to defeat proxy buffering.
    res.write(`:${' '.repeat(16384)}\n\n`);
    res.flush?.();
    const sessionId = crypto.randomUUID();
    const messagesUrl = `https://${req.get('host')}/messages?sessionId=${sessionId}`;
    sseSessions.set(sessionId, res);
    res.write(`event: endpoint\n`);
    res.write(`data: ${messagesUrl}\n\n`);
    const pingInterval = setInterval(() => {
        if (!res.writableEnded) {
            res.write(`:ping ${Date.now()}\n\n`);
        }
        else {
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
app.post('/messages', (req, res) => {
    const sessionId = req.query.sessionId;
    if (!sessionId) {
        return res.status(400).json({ jsonrpc: '2.0', error: { code: -32600, message: 'Missing sessionId' }, id: null });
    }
    const sseRes = sseSessions.get(sessionId);
    if (!sseRes) {
        return res.status(404).json({ jsonrpc: '2.0', error: { code: -32600, message: 'Session not found' }, id: null });
    }
    const { jsonrpc, method, params, id } = req.body;
    console.log(`MCP request: ${method}`, params);
    let response;
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
            const toolResult = handleToolCall(params.name, params.arguments || {});
            if (toolResult.structuredContent) {
                latestToolResult = toolResult.structuredContent;
                toolResultVersion++;
            }
            // Per kitchen-sink-lite reference: include outputTemplate so ChatGPT delivers
            // structuredContent to the widget.
            response = {
                jsonrpc: '2.0',
                id,
                result: { ...toolResult, _meta: toolInvocationMeta(params.name) }
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
                            uri: WIDGET_RESOURCE_URI,
                            mimeType: WIDGET_MIME_TYPE,
                            description: 'H&R Block TaxPilot interactive UI widget',
                            _meta: toolMeta('Rendering TaxPilot…', 'TaxPilot ready'),
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
                            uriTemplate: WIDGET_RESOURCE_URI,
                            mimeType: WIDGET_MIME_TYPE,
                            description: 'H&R Block TaxPilot interactive UI widget',
                            _meta: toolMeta('Rendering TaxPilot…', 'TaxPilot ready'),
                        }]
                }
            };
            break;
        case 'resources/read': {
            const readUri = params?.uri || '';
            // Accept base URI or any versioned variant (ui://taxpilot/widget.html?v=N)
            if (readUri.startsWith(WIDGET_RESOURCE_URI_ROOT)) {
                try {
                    const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
                    const host = req.get('host') || 'localhost:8000';
                    const sseServerUrl = proto + '://' + host;
                    const html = readWidgetHtml(sseServerUrl);
                    response = {
                        jsonrpc: '2.0',
                        id,
                        result: {
                            contents: [{
                                    uri: readUri,
                                    mimeType: WIDGET_MIME_TYPE,
                                    text: html,
                                    _meta: toolMeta('Rendering TaxPilot…', 'TaxPilot ready'),
                                }]
                        }
                    };
                }
                catch {
                    response = { jsonrpc: '2.0', id, error: { code: -32603, message: 'Failed to read widget' } };
                }
            }
            else {
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
app.get('/api/widget-data', (_req, res) => {
    if (latestToolResult) {
        res.json({ version: toolResultVersion, data: latestToolResult });
    }
    else {
        res.json({ version: 0, data: null });
    }
});
// ─── ChatGPT SDK-powered chat API ────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
    try {
        const { message, chatId } = req.body || {};
        if (!message) {
            return res.status(400).json({ error: 'message is required' });
        }
        const id = chatId || crypto.randomUUID();
        const result = await chat(id, message);
        res.json(result);
    }
    catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Chat failed' });
    }
});
app.post('/api/chat/reset', (req, res) => {
    const { chatId } = req.body || {};
    if (chatId)
        resetChatSession(chatId);
    res.json({ ok: true });
});
// Serve the chat UI
app.get('/chat', (_req, res) => {
    try {
        const publicDir = path.join(__dirname, '..', '..', 'public');
        const chatPath = path.join(publicDir, 'chat.html');
        const html = fs.readFileSync(chatPath, 'utf-8');
        res.type('text/html').send(html);
    }
    catch (e) {
        res.status(404).send('Chat UI not found');
    }
});
// Root endpoint
app.get('/', (_req, res) => {
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
        <li>/mcp - MCP endpoint (for ChatGPT developer mode)</li>
        <li>/sse - MCP SSE endpoint (legacy, same as /mcp)</li>
      </ul>
    </body>
    </html>
  `);
});
// Export app for external use (e.g., Azure)
export default app;
// Self-ping to keep Azure Free tier warm
function startSelfPing(port) {
    const pingInterval = 4 * 60 * 1000; // 4 minutes
    const host = process.env.WEBSITE_HOSTNAME || `localhost:${port}`;
    const protocol = process.env.WEBSITE_HOSTNAME ? 'https' : 'http';
    const pingUrl = `${protocol}://${host}/health`;
    setInterval(async () => {
        try {
            const response = await fetch(pingUrl);
            console.log(`[Self-ping] ${new Date().toISOString()} - Status: ${response.status}`);
        }
        catch (error) {
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
//# sourceMappingURL=server.js.map