import express from 'express';
import cors from 'cors';
import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import from compiled dist directory
import {
  startIntakeSession,
  processIntakeResponse,
  getIntakeProgress,
  getIntakeSummary,
} from '../dist/services/intake.js';
import {
  generateDocumentChecklist,
  getDocumentChecklist,
  markDocumentCollected,
  getPendingDocuments,
  formatChecklistForDisplay,
} from '../dist/services/checklist.js';
import {
  createDocumentReminder,
  getClientReminders,
  sendReminder,
  formatRemindersForDisplay,
} from '../dist/services/reminders.js';
import {
  routeClientToTaxPro,
  createAppointment,
  getAppointmentEstimate,
  getTaxProRecommendations,
} from '../dist/services/routing.js';
import { db } from '../dist/database/index.js';
import { createMcpServer, transports, createSseTransport } from '../dist/mcp-sse.js';

const app = express();

// Enhanced CORS configuration for ChatGPT
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Add explicit CORS headers middleware
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

// Handle preflight requests
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ChatGPT Plugin manifest
app.get('/.well-known/ai-plugin.json', (_req, res) => {
  try {
    const publicDir = path.join(__dirname, '..', 'public');
    const manifestPath = path.join(publicDir, '.well-known', 'ai-plugin.json');
    const manifest = fs.readFileSync(manifestPath, 'utf-8');
    res.type('application/json').send(manifest);
  } catch (e) {
    res.status(404).json({ error: 'Plugin manifest not found' });
  }
});

// Logo for ChatGPT Plugin
app.get('/logo.png', (_req, res) => {
  try {
    const publicDir = path.join(__dirname, '..', 'public');
    const logoPath = path.join(publicDir, 'logo.png');
    res.sendFile(logoPath);
  } catch (e) {
    // Return a simple SVG as fallback
    res.type('image/svg+xml').send(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect fill="#2563eb" width="512" height="512" rx="64"/><text x="256" y="300" font-size="200" fill="white" text-anchor="middle" font-family="Arial">T</text></svg>`);
  }
});

// Health check (API route - BEFORE static files)
app.get('/health', (_req, res) => {
  res.json({ ok: true, platform: 'vercel', service: 'tax-intake-mcp-bridge' });
});

// OpenAPI specification for ChatGPT Actions
app.get('/openapi.yaml', (_req, res) => {
  try {
    const publicDir = path.join(__dirname, '..', 'public');
    const openapiPath = path.join(publicDir, 'openapi.yaml');
    const yaml = fs.readFileSync(openapiPath, 'utf-8');
    res.type('text/yaml').send(yaml);
  } catch (e) {
    res.status(404).json({ error: 'OpenAPI spec not found' });
  }
});

// Privacy policy for ChatGPT
app.get('/privacy', (_req, res) => {
  try {
    const publicDir = path.join(__dirname, '..', 'public');
    const privacyPath = path.join(publicDir, 'privacy.html');
    const html = fs.readFileSync(privacyPath, 'utf-8');
    res.type('text/html').send(html);
  } catch (e) {
    res.type('text/html').send(`
      <html>
        <head><title>Privacy Policy - Tax Intake</title></head>
        <body>
          <h1>Privacy Policy</h1>
          <p>This API collects tax-related information for appointment preparation purposes only.</p>
          <p>Data is not shared with third parties and is used solely for tax preparation services.</p>
        </body>
      </html>
    `);
  }
});

// Intake
app.post('/intake/start', (req: Request, res: Response) => {
  const { clientId } = req.body || {};
  const result = startIntakeSession(clientId);
  res.json({
    sessionId: result.session.id,
    clientId: result.client.id,
    currentStep: result.currentStep,
    nextQuestion: result.nextQuestion,
  });
});

app.post('/intake/respond', (req: Request, res: Response) => {
  const { sessionId, answer } = req.body || {};
  const result = processIntakeResponse(sessionId, answer);
  res.json(result);
});

app.get('/intake/progress/:sessionId', (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const progress = getIntakeProgress(sessionId);
  res.json(progress || { error: 'Session not found' });
});

app.get('/client/:clientId/summary', (req: Request, res: Response) => {
  const { clientId } = req.params;
  const summary = getIntakeSummary(clientId);
  res.type('text/plain').send(summary);
});

// Checklist
app.post('/client/:clientId/checklist/generate', (req: Request, res: Response) => {
  const { clientId } = req.params;
  const checklist = generateDocumentChecklist(clientId);
  res.type('text/plain').send(formatChecklistForDisplay(checklist));
});

app.get('/client/:clientId/checklist', (req: Request, res: Response) => {
  const { clientId } = req.params;
  const checklist = getDocumentChecklist(clientId);
  if (!checklist) return res.status(404).json({ error: 'Checklist not found' });
  res.type('text/plain').send(formatChecklistForDisplay(checklist));
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

// Reminders
app.post('/client/:clientId/reminders/documents', (req: Request, res: Response) => {
  const { clientId } = req.params;
  const { appointmentId } = req.body || {};
  const pending = getPendingDocuments(clientId);
  if (pending.length === 0) return res.json({ message: 'No pending documents' });
  const reminders = createDocumentReminder(clientId, appointmentId, pending);
  res.type('text/plain').send(
    reminders.map((r) => `- ${r.message}`).join('\n')
  );
});

app.get('/client/:clientId/reminders', (req: Request, res: Response) => {
  const { clientId } = req.params;
  const reminders = getClientReminders(clientId);
  res.type('text/plain').send(formatRemindersForDisplay(reminders));
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
  res.type('text/plain').send(estimate.message);
});

app.get('/client/:clientId/recommendations', (req: Request, res: Response) => {
  const { clientId } = req.params;
  const recs = getTaxProRecommendations(clientId);
  res.type('text/plain').send(recs);
});

// MCP SSE endpoint - ChatGPT connects here
app.get('/sse', async (req: Request, res: Response) => {
  console.log('Received GET request to /sse (establishing MCP SSE stream)');
  
  try {
    // Create a new SSE transport for the client
    const transport = createSseTransport('/messages', res as any);
    
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
  } catch (error) {
    console.error('Error establishing SSE stream:', error);
    if (!res.headersSent) {
      res.status(500).send('Error establishing SSE stream');
    }
  }
});

// MCP Messages endpoint - receives JSON-RPC requests from ChatGPT
app.post('/messages', async (req: Request, res: Response) => {
  console.log('Received POST request to /messages');
  
  // Extract session ID from URL query parameter
  const sessionId = req.query.sessionId as string;
  
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
    await transport.handlePostMessage(req as any, res as any, req.body);
  } catch (error) {
    console.error('Error handling request:', error);
    if (!res.headersSent) {
      res.status(500).send('Error handling request');
    }
  }
});

// Serve index.html on root only
app.get('/', (_req, res) => {
  try {
    const publicDir = path.join(__dirname, '..', 'public');
    const indexPath = path.join(publicDir, 'index.html');
    const html = fs.readFileSync(indexPath, 'utf-8');
    res.type('text/html').send(html);
  } catch (e) {
    res.type('text/plain').send('Tax Intake MCP Bridge - Vercel');
  }
});

export default app;
