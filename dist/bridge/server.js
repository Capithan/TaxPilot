import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { startIntakeSession, processIntakeResponse, getIntakeProgress, getIntakeSummary, } from '../services/intake.js';
import { generateDocumentChecklist, getDocumentChecklist, markDocumentCollected, getPendingDocuments, formatChecklistForDisplay, } from '../services/checklist.js';
import { createDocumentReminder, getClientReminders, sendReminder, formatRemindersForDisplay, } from '../services/reminders.js';
import { routeClientToTaxPro, createAppointment, getAppointmentEstimate, getTaxProRecommendations, } from '../services/routing.js';
import { db } from '../database/index.js';
import { createMcpServer, transports, createSseTransport } from '../mcp-sse.js';
// Get __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
// Enhanced CORS for ChatGPT
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
// ChatGPT Plugin manifest
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
        nextQuestion: result.nextQuestion,
    });
});
app.post('/intake/respond', (req, res) => {
    const { sessionId, answer } = req.body || {};
    const result = processIntakeResponse(sessionId, answer);
    res.json(result);
});
app.get('/intake/progress/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const progress = getIntakeProgress(sessionId);
    res.json(progress || { error: 'Session not found' });
});
app.get('/client/:clientId/summary', (req, res) => {
    const { clientId } = req.params;
    const summary = getIntakeSummary(clientId);
    res.type('text/plain').send(summary);
});
// Checklist endpoints
app.post('/client/:clientId/checklist/generate', (req, res) => {
    const { clientId } = req.params;
    const checklist = generateDocumentChecklist(clientId);
    res.type('text/plain').send(formatChecklistForDisplay(checklist));
});
app.get('/client/:clientId/checklist', (req, res) => {
    const { clientId } = req.params;
    const checklist = getDocumentChecklist(clientId);
    if (!checklist)
        return res.status(404).json({ error: 'Checklist not found' });
    res.type('text/plain').send(formatChecklistForDisplay(checklist));
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
        return res.json({ message: 'No pending documents' });
    const reminders = createDocumentReminder(clientId, appointmentId, pending);
    res.type('text/plain').send(reminders.map((r) => `- ${r.message}`).join('\n'));
});
app.get('/client/:clientId/reminders', (req, res) => {
    const { clientId } = req.params;
    const reminders = getClientReminders(clientId);
    res.type('text/plain').send(formatRemindersForDisplay(reminders));
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
    res.type('text/plain').send(estimate.message);
});
app.get('/client/:clientId/recommendations', (req, res) => {
    const { clientId } = req.params;
    const recs = getTaxProRecommendations(clientId);
    res.type('text/plain').send(recs);
});
app.get('/tax-pros', (_req, res) => {
    const pros = db.getAllTaxPros();
    res.json(pros);
});
// MCP SSE endpoint - ChatGPT connects here
app.get('/sse', async (req, res) => {
    console.log('Received GET request to /sse (establishing MCP SSE stream)');
    try {
        // Create a new SSE transport for the client
        const transport = createSseTransport('/messages', res);
        // Store the transport by session ID
        const sessionId = transport.sessionId;
        transports[sessionId] = transport;
        // Set up onclose handler to clean up transport when closed
        transport.onclose = () => {
            console.log(`SSE transport closed for session ${sessionId}`);
            delete transports[sessionId];
        };
        // Connect the transport to a new MCP server instance
        const server = createMcpServer();
        await server.connect(transport);
        console.log(`Established MCP SSE stream with session ID: ${sessionId}`);
    }
    catch (error) {
        console.error('Error establishing SSE stream:', error);
        if (!res.headersSent) {
            res.status(500).send('Error establishing SSE stream');
        }
    }
});
// MCP Messages endpoint - receives JSON-RPC requests from ChatGPT
app.post('/messages', async (req, res) => {
    console.log('Received POST request to /messages');
    // Extract session ID from URL query parameter
    const sessionId = req.query.sessionId;
    if (!sessionId) {
        console.error('No session ID provided in request URL');
        res.status(400).send('Missing sessionId parameter');
        return;
    }
    const transport = transports[sessionId];
    if (!transport) {
        console.error(`No active transport found for session ID: ${sessionId}`);
        res.status(404).send('Session not found');
        return;
    }
    try {
        // Handle the POST message with the transport
        await transport.handlePostMessage(req, res, req.body);
    }
    catch (error) {
        console.error('Error handling request:', error);
        if (!res.headersSent) {
            res.status(500).send('Error handling request');
        }
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
        <li>/sse - MCP SSE endpoint (for ChatGPT)</li>
      </ul>
    </body>
    </html>
  `);
});
// Export app for external use (e.g., Azure)
export default app;
// Only start server if running directly (not imported)
const isMainModule = import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`;
if (isMainModule) {
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
        console.log(`Tax Intake MCP Server running on http://localhost:${PORT}`);
    });
}
//# sourceMappingURL=server.js.map