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
  routeClientToTaxPro,
  createAppointment,
  getAppointmentEstimate,
  getTaxProRecommendations,
} from '../services/routing.js';
import { db } from '../database/index.js';

// Get __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Store active SSE sessions
const sseSessions: Map<string, Response> = new Map();

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

// Checklist endpoints
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

// Reminder endpoints
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

app.get('/tax-pros', (_req: Request, res: Response) => {
  const pros = db.getAllTaxPros();
  res.json(pros);
});

// Define available MCP tools
const mcpTools = [
  { name: 'start_intake', description: 'Start a new client intake session', inputSchema: { type: 'object', properties: { clientId: { type: 'string' } } } },
  { name: 'process_intake_response', description: 'Process client response during intake', inputSchema: { type: 'object', properties: { sessionId: { type: 'string' }, answer: { type: 'string' } }, required: ['sessionId', 'answer'] } },
  { name: 'get_intake_progress', description: 'Get intake session progress', inputSchema: { type: 'object', properties: { sessionId: { type: 'string' } }, required: ['sessionId'] } },
  { name: 'get_client_summary', description: 'Get complete client summary', inputSchema: { type: 'object', properties: { clientId: { type: 'string' } }, required: ['clientId'] } },
  { name: 'generate_document_checklist', description: 'Generate personalized document checklist', inputSchema: { type: 'object', properties: { clientId: { type: 'string' } }, required: ['clientId'] } },
  { name: 'get_pending_documents', description: 'Get pending documents list', inputSchema: { type: 'object', properties: { clientId: { type: 'string' } }, required: ['clientId'] } },
  { name: 'route_to_tax_pro', description: 'Route client to appropriate tax professional', inputSchema: { type: 'object', properties: { clientId: { type: 'string' } }, required: ['clientId'] } },
  { name: 'get_appointment_estimate', description: 'Estimate appointment duration', inputSchema: { type: 'object', properties: { clientId: { type: 'string' } }, required: ['clientId'] } },
];

// Handle MCP tool calls
function handleToolCall(name: string, args: Record<string, unknown>): { content: Array<{ type: string; text: string }> } {
  try {
    switch (name) {
      case 'start_intake': {
        const result = startIntakeSession(args?.clientId as string | undefined);
        return { content: [{ type: 'text', text: `Session started!\nSession ID: ${result.session.id}\nClient ID: ${result.client.id}\n\n${result.nextQuestion}` }] };
      }
      case 'process_intake_response': {
        const result = processIntakeResponse(args.sessionId as string, args.answer as string);
        if (result.intakeCompleted) {
          return { content: [{ type: 'text', text: `Intake complete! Client ID: ${result.client?.id}` }] };
        }
        return { content: [{ type: 'text', text: result.nextQuestion || 'Processing...' }] };
      }
      case 'get_intake_progress': {
        const progress = getIntakeProgress(args.sessionId as string);
        return { content: [{ type: 'text', text: JSON.stringify(progress, null, 2) }] };
      }
      case 'get_client_summary': {
        const summary = getIntakeSummary(args.clientId as string);
        return { content: [{ type: 'text', text: summary }] };
      }
      case 'generate_document_checklist': {
        const checklist = generateDocumentChecklist(args.clientId as string);
        return { content: [{ type: 'text', text: formatChecklistForDisplay(checklist) }] };
      }
      case 'get_pending_documents': {
        const pending = getPendingDocuments(args.clientId as string);
        return { content: [{ type: 'text', text: JSON.stringify(pending, null, 2) }] };
      }
      case 'route_to_tax_pro': {
        const result = routeClientToTaxPro(args.clientId as string);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'get_appointment_estimate': {
        const estimate = getAppointmentEstimate(args.clientId as string);
        return { content: [{ type: 'text', text: estimate.message }] };
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
  console.log('MCP POST request received');
  console.log('Headers:', JSON.stringify(req.headers));
  console.log('Body:', JSON.stringify(req.body));
  
  // If body is empty or not JSON, return error with details
  if (!req.body || Object.keys(req.body).length === 0) {
    console.log('Empty body received');
    res.setHeader('Content-Type', 'application/json');
    return res.status(400).json({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32700, message: 'Parse error: Empty request body' }
    });
  }
  
  const { jsonrpc, method, params, id } = req.body || {};
  
  // Handle initialize request
  if (method === 'initialize') {
    const sessionId = crypto.randomUUID();
    
    // Return JSON response with capabilities
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Mcp-Session-Id', sessionId);
    res.json({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: params?.protocolVersion || '2024-11-05',
        serverInfo: { name: 'tax-intake-mcp', version: '1.0.0' },
        capabilities: { 
          tools: { listChanged: false }
        }
      }
    });
    console.log(`MCP session initialized: ${sessionId}`);
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
    const toolResult = handleToolCall(params?.name, params?.arguments || {});
    res.setHeader('Content-Type', 'application/json');
    res.json({
      jsonrpc: '2.0',
      id,
      result: toolResult
    });
    return;
  }
  
  // Handle ping
  if (method === 'ping') {
    res.setHeader('Content-Type', 'application/json');
    res.json({ jsonrpc: '2.0', id, result: {} });
    return;
  }
  
  // Unknown method
  res.setHeader('Content-Type', 'application/json');
  res.status(400).json({
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
  
  // Send server info
  const serverInfo = {
    jsonrpc: '2.0',
    method: 'notifications/initialized',
    params: {
      serverInfo: { name: 'tax-intake-mcp', version: '1.0.0' },
      capabilities: { tools: {} }
    }
  };
  res.write(`event: message\n`);
  res.write(`data: ${JSON.stringify(serverInfo)}\n\n`);
  
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
          protocolVersion: '2024-11-05',
          serverInfo: { name: 'tax-intake-mcp', version: '1.0.0' },
          capabilities: { tools: {} }
        }
      };
      break;
      
    case 'tools/list':
      response = {
        jsonrpc: '2.0',
        id,
        result: { tools: mcpTools }
      };
      break;
      
    case 'tools/call':
      const toolResult = handleToolCall(params.name, params.arguments || {});
      response = {
        jsonrpc: '2.0',
        id,
        result: toolResult
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
const isMainModule = import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`;
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
