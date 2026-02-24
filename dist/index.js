#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, ListPromptsRequestSchema, GetPromptRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { startIntakeSession, processIntakeResponse, processStructuredIntakeResponse, getIntakeProgress, getIntakeSummary, } from './services/intake.js';
import { generateDocumentChecklist, getDocumentChecklist, markDocumentCollected, getPendingDocuments, } from './services/checklist.js';
import { createDocumentReminder, getClientReminders, sendReminder, scheduleAppointmentReminders, } from './services/reminders.js';
import { calculateComplexityScore, getComplexityLevel, findBestTaxPro, routeClientToTaxPro, createAppointment, getAppointmentEstimate, } from './services/routing.js';
import { getFlowState, getOrCreateFlowState, getFlowStatus, advanceFlow, confirmSummary, setSchedulingPreferences, setSelectedTaxPro, syncFlowWithState, getNextActionInstructions, } from './services/flowManager.js';
import { db } from './database/index.js';
// UI Formatters
import { formatIntakeStart, formatIntakeResponse, formatIntakeProgress, formatClientSummary, } from './ui/formatters/intake.js';
import { formatDocumentChecklist, formatDocumentCollected, formatPendingDocuments, } from './ui/formatters/checklist.js';
import { formatComplexityScore, formatRoutingResult, formatTaxProRecommendations, formatAppointmentEstimate, formatAppointmentCreated, formatTaxProList, formatClientProfile, } from './ui/formatters/routing.js';
import { formatRemindersCreated, formatRemindersList, formatReminderSent, } from './ui/formatters/reminders.js';
import { formatFlowStatus, formatFlowAdvanced, formatSummaryConfirmed, formatSchedulingPreferences, formatTaxProSelected, formatFlowProgress, } from './ui/formatters/flow.js';
/** MCP Apps Widget resource URI */
const WIDGET_RESOURCE_URI = 'ui://taxpilot/widget.html';
/** Wrap a UIResponse into the MCP content block format with structuredContent for Apps SDK. */
function toMcpContent(uiResp) {
    return {
        content: [{ type: 'text', text: JSON.stringify(uiResp, null, 2) }],
        structuredContent: uiResp,
    };
}
// Create the MCP server
const server = new Server({
    name: 'tax-intake-mcp',
    version: '1.0.0',
}, {
    capabilities: {
        tools: {},
        prompts: {},
        resources: {},
    },
});
// Define all available tools (with MCP Apps UI metadata injected)
server.setRequestHandler(ListToolsRequestSchema, async () => {
    const rawTools = [
        // Intake Tools
        {
            name: 'start_intake',
            description: 'Start a new client intake session or resume an existing one. This begins the conversational intake process to collect ALL necessary information directly in this conversation - including SSN, bank details, W-2 data, and prior year AGI. This is a demo environment with no external portals.',
            inputSchema: {
                type: 'object',
                properties: {
                    clientId: {
                        type: 'string',
                        description: 'Optional existing client ID to resume intake',
                    },
                },
                required: [],
            },
        },
        {
            name: 'process_intake_response',
            description: 'Process a client response during the intake conversation. Supports two modes: (1) structured form/selection data from UI components, or (2) plain text answer for conversational intake.',
            inputSchema: {
                type: 'object',
                properties: {
                    sessionId: {
                        type: 'string',
                        description: 'The intake session ID',
                    },
                    answer: {
                        type: 'string',
                        description: 'Plain text response from the client (used when no structured form data is provided)',
                    },
                    step: {
                        type: 'string',
                        description: 'The intake step this submission applies to (e.g. personal_info, filing_status, dependents_choice, employment, income_types, deductions, special_situations, document_upload, review)',
                    },
                    formData: {
                        type: 'object',
                        description: 'Structured form field values from a FormGroup submission (key-value pairs of field ID to value)',
                    },
                    selection: {
                        type: 'string',
                        description: 'Single selection ID from a SelectionCard',
                    },
                    selections: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Array of selected option IDs from a MultiSelectCard',
                    },
                },
                required: ['sessionId'],
            },
        },
        {
            name: 'get_intake_progress',
            description: 'Get the current progress of an intake session, including completed steps and remaining questions.',
            inputSchema: {
                type: 'object',
                properties: {
                    sessionId: {
                        type: 'string',
                        description: 'The intake session ID',
                    },
                },
                required: ['sessionId'],
            },
        },
        {
            name: 'get_client_summary',
            description: 'Get a complete summary of a client\'s intake information, including personal details, income types, deductions, and special situations.',
            inputSchema: {
                type: 'object',
                properties: {
                    clientId: {
                        type: 'string',
                        description: 'The client ID',
                    },
                },
                required: ['clientId'],
            },
        },
        // Document Checklist Tools
        {
            name: 'generate_document_checklist',
            description: 'Generate a personalized document checklist based on the client\'s tax situation. This analyzes income types, deductions, and special situations to create a tailored list of required documents.',
            inputSchema: {
                type: 'object',
                properties: {
                    clientId: {
                        type: 'string',
                        description: 'The client ID',
                    },
                },
                required: ['clientId'],
            },
        },
        {
            name: 'get_document_checklist',
            description: 'Retrieve the current document checklist for a client, showing which documents have been collected and which are still pending.',
            inputSchema: {
                type: 'object',
                properties: {
                    clientId: {
                        type: 'string',
                        description: 'The client ID',
                    },
                },
                required: ['clientId'],
            },
        },
        {
            name: 'mark_document_collected',
            description: 'Mark a specific document as collected/received from the client.',
            inputSchema: {
                type: 'object',
                properties: {
                    clientId: {
                        type: 'string',
                        description: 'The client ID',
                    },
                    documentId: {
                        type: 'string',
                        description: 'The document ID to mark as collected',
                    },
                },
                required: ['clientId', 'documentId'],
            },
        },
        {
            name: 'get_pending_documents',
            description: 'Get a list of required documents that the client has not yet provided.',
            inputSchema: {
                type: 'object',
                properties: {
                    clientId: {
                        type: 'string',
                        description: 'The client ID',
                    },
                },
                required: ['clientId'],
            },
        },
        // Reminder Tools
        {
            name: 'create_document_reminders',
            description: 'Create personalized reminders for pending documents. Generates contextual messages like "Don\'t forget your 1099-NEC from Uber".',
            inputSchema: {
                type: 'object',
                properties: {
                    clientId: {
                        type: 'string',
                        description: 'The client ID',
                    },
                    appointmentId: {
                        type: 'string',
                        description: 'The appointment ID to associate reminders with',
                    },
                },
                required: ['clientId', 'appointmentId'],
            },
        },
        {
            name: 'get_client_reminders',
            description: 'Get all scheduled and sent reminders for a client.',
            inputSchema: {
                type: 'object',
                properties: {
                    clientId: {
                        type: 'string',
                        description: 'The client ID',
                    },
                },
                required: ['clientId'],
            },
        },
        {
            name: 'send_reminder',
            description: 'Send a specific reminder to the client via email/SMS.',
            inputSchema: {
                type: 'object',
                properties: {
                    reminderId: {
                        type: 'string',
                        description: 'The reminder ID to send',
                    },
                },
                required: ['reminderId'],
            },
        },
        // Routing Tools
        {
            name: 'calculate_complexity',
            description: 'Calculate the complexity score for a client\'s tax situation. Returns a score from 0-100 and a complexity level (simple, moderate, complex, expert).',
            inputSchema: {
                type: 'object',
                properties: {
                    clientId: {
                        type: 'string',
                        description: 'The client ID',
                    },
                },
                required: ['clientId'],
            },
        },
        {
            name: 'route_to_tax_pro',
            description: 'Automatically route a client to the best-matched tax professional based on their complexity level and required specializations.',
            inputSchema: {
                type: 'object',
                properties: {
                    clientId: {
                        type: 'string',
                        description: 'The client ID',
                    },
                },
                required: ['clientId'],
            },
        },
        {
            name: 'get_tax_pro_recommendations',
            description: 'Get recommended tax professionals for a client without automatically assigning one.',
            inputSchema: {
                type: 'object',
                properties: {
                    clientId: {
                        type: 'string',
                        description: 'The client ID',
                    },
                },
                required: ['clientId'],
            },
        },
        {
            name: 'create_appointment',
            description: 'Create an appointment for a client with a specific tax professional.',
            inputSchema: {
                type: 'object',
                properties: {
                    clientId: {
                        type: 'string',
                        description: 'The client ID',
                    },
                    taxProId: {
                        type: 'string',
                        description: 'The tax professional ID',
                    },
                    scheduledAt: {
                        type: 'string',
                        description: 'The appointment date and time (ISO 8601 format)',
                    },
                    type: {
                        type: 'string',
                        enum: ['virtual', 'in_person'],
                        description: 'The type of appointment',
                    },
                },
                required: ['clientId', 'taxProId', 'scheduledAt'],
            },
        },
        {
            name: 'get_appointment_estimate',
            description: 'Get an estimate of appointment duration and time savings based on intake completion status.',
            inputSchema: {
                type: 'object',
                properties: {
                    clientId: {
                        type: 'string',
                        description: 'The client ID',
                    },
                },
                required: ['clientId'],
            },
        },
        // ============================================
        // CONVERSATION FLOW MANAGEMENT TOOLS
        // ============================================
        {
            name: 'get_conversation_flow',
            description: 'Get the current conversation flow state and instructions for what to do next. ALWAYS call this tool at the start of a conversation and after completing any major action to understand where you are in the flow and what should happen next. This ensures consistent flow across all conversations.',
            inputSchema: {
                type: 'object',
                properties: {
                    clientId: {
                        type: 'string',
                        description: 'The client ID',
                    },
                    sessionId: {
                        type: 'string',
                        description: 'The intake session ID',
                    },
                },
                required: ['clientId'],
            },
        },
        {
            name: 'advance_conversation_flow',
            description: 'Mark the current flow stage as complete and advance to the next stage. Call this after completing the required actions for a stage. Optionally include stage-specific data.',
            inputSchema: {
                type: 'object',
                properties: {
                    clientId: {
                        type: 'string',
                        description: 'The client ID',
                    },
                    stageData: {
                        type: 'object',
                        description: 'Optional data to store for the current stage (e.g., { "shown": true } for summary_review)',
                    },
                },
                required: ['clientId'],
            },
        },
        {
            name: 'confirm_intake_summary',
            description: 'Mark the intake summary as confirmed by the user. Call this when the user explicitly confirms their information is correct. This advances the flow from summary_confirmation to document_checklist.',
            inputSchema: {
                type: 'object',
                properties: {
                    clientId: {
                        type: 'string',
                        description: 'The client ID',
                    },
                },
                required: ['clientId'],
            },
        },
        {
            name: 'set_scheduling_preferences',
            description: 'Record the user\'s scheduling preferences. Call this after collecting their preferred dates, times, and appointment type.',
            inputSchema: {
                type: 'object',
                properties: {
                    clientId: {
                        type: 'string',
                        description: 'The client ID',
                    },
                    preferredDates: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'List of preferred dates (e.g., ["2026-01-25", "2026-01-26"])',
                    },
                    preferredTimes: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'List of preferred times (e.g., ["morning", "afternoon", "10:00 AM"])',
                    },
                    appointmentType: {
                        type: 'string',
                        enum: ['virtual', 'in_person'],
                        description: 'Preferred appointment type',
                    },
                },
                required: ['clientId', 'preferredDates', 'preferredTimes', 'appointmentType'],
            },
        },
        {
            name: 'select_tax_professional',
            description: 'Record the selected tax professional for the client. Call this after routing or when user accepts a recommended tax pro.',
            inputSchema: {
                type: 'object',
                properties: {
                    clientId: {
                        type: 'string',
                        description: 'The client ID',
                    },
                    taxProId: {
                        type: 'string',
                        description: 'The selected tax professional ID',
                    },
                },
                required: ['clientId', 'taxProId'],
            },
        },
        {
            name: 'get_flow_progress',
            description: 'Get a visual display of the conversation flow progress showing completed, current, and remaining stages.',
            inputSchema: {
                type: 'object',
                properties: {
                    clientId: {
                        type: 'string',
                        description: 'The client ID',
                    },
                },
                required: ['clientId'],
            },
        },
        // Utility Tools
        {
            name: 'list_tax_professionals',
            description: 'List all available tax professionals with their specializations and current availability.',
            inputSchema: {
                type: 'object',
                properties: {},
                required: [],
            },
        },
        {
            name: 'get_client',
            description: 'Get complete client profile information.',
            inputSchema: {
                type: 'object',
                properties: {
                    clientId: {
                        type: 'string',
                        description: 'The client ID',
                    },
                },
                required: ['clientId'],
            },
        },
    ];
    // Inject MCP Apps UI metadata into all tools
    const tools = rawTools.map(tool => ({
        ...tool,
        _meta: {
            ui: { resourceUri: WIDGET_RESOURCE_URI },
            'ui/resourceUri': WIDGET_RESOURCE_URI,
        },
    }));
    return { tools };
});
// Handle resource listing (MCP Apps widget)
server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
        resources: [{
                name: 'TaxPilot Widget',
                uri: WIDGET_RESOURCE_URI,
                mimeType: 'text/html;profile=mcp-app',
                description: 'H&R Block TaxPilot interactive UI widget',
            }],
    };
});
// Handle resource reading (serve the widget HTML)
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    if (uri === WIDGET_RESOURCE_URI) {
        // Read widget HTML from public/ directory
        const { readFileSync } = await import('fs');
        const { join, dirname } = await import('path');
        const { fileURLToPath } = await import('url');
        const thisDir = dirname(fileURLToPath(import.meta.url));
        const widgetPath = join(thisDir, '..', 'public', 'taxpilot-widget.html');
        const html = readFileSync(widgetPath, 'utf-8');
        return {
            contents: [{
                    uri: WIDGET_RESOURCE_URI,
                    mimeType: 'text/html;profile=mcp-app',
                    text: html,
                }],
        };
    }
    throw new Error(`Unknown resource: ${uri}`);
});
// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        switch (name) {
            // Intake Tools
            case 'start_intake': {
                const result = startIntakeSession(args?.clientId);
                // Initialize the conversation flow
                const flowState = getOrCreateFlowState(result.client.id, result.session.id);
                advanceFlow(result.client.id, { started: true }); // Advance past welcome stage
                return toMcpContent(formatIntakeStart(result, flowState.currentStage));
            }
            case 'process_intake_response': {
                const sid = args?.sessionId;
                const step = args?.step;
                const formData = args?.formData;
                const selection = args?.selection;
                const selections = args?.selections;
                let result;
                // Prefer structured path when step + form/selection data provided
                if (step && (formData || selection || selections)) {
                    result = processStructuredIntakeResponse(sid, step, formData, selection, selections);
                }
                else {
                    result = processIntakeResponse(sid, args?.answer);
                }
                // Check if intake is complete and advance flow
                if (result.intakeCompleted && result.client) {
                    const flowState = getOrCreateFlowState(result.client.id, sid);
                    advanceFlow(result.client.id, { completed: true });
                }
                // Get progress for the UI
                const intakeProgress = getIntakeProgress(sid);
                return toMcpContent(formatIntakeResponse(result, sid, intakeProgress ? {
                    completedSteps: intakeProgress.completedSteps,
                    totalSteps: intakeProgress.totalSteps,
                    percentComplete: intakeProgress.percentComplete,
                } : undefined));
            }
            case 'get_intake_progress': {
                const progress = getIntakeProgress(args?.sessionId);
                return toMcpContent(formatIntakeProgress(progress, args?.sessionId));
            }
            case 'get_client_summary': {
                const clientId = args?.clientId;
                const summary = getIntakeSummary(clientId);
                const client = db.getClient(clientId);
                // Mark that summary has been shown - advance the flow
                const flowState = getFlowState(clientId);
                if (flowState && flowState.currentStage === 'summary_review') {
                    advanceFlow(clientId, { shown: true });
                }
                if (!client) {
                    return { content: [{ type: 'text', text: 'Client not found' }] };
                }
                return toMcpContent(formatClientSummary(client, summary));
            }
            // Document Checklist Tools
            case 'generate_document_checklist': {
                const clientId = args?.clientId;
                const checklist = generateDocumentChecklist(clientId);
                // Advance the flow
                advanceFlow(clientId, { generated: true, documentCount: checklist.documents.length });
                return toMcpContent(formatDocumentChecklist(checklist, 'generate_document_checklist'));
            }
            case 'get_document_checklist': {
                const checklist = getDocumentChecklist(args?.clientId);
                if (!checklist) {
                    return {
                        content: [{ type: 'text', text: 'No checklist found. Generate one first using generate_document_checklist.' }],
                    };
                }
                return toMcpContent(formatDocumentChecklist(checklist, 'get_document_checklist'));
            }
            case 'mark_document_collected': {
                const result = markDocumentCollected(args?.clientId, args?.documentId);
                return toMcpContent(formatDocumentCollected(result, args?.clientId, args?.documentId));
            }
            case 'get_pending_documents': {
                const pending = getPendingDocuments(args?.clientId);
                return toMcpContent(formatPendingDocuments(pending, args?.clientId));
            }
            // Reminder Tools
            case 'create_document_reminders': {
                const pending = getPendingDocuments(args?.clientId);
                if (pending.length === 0) {
                    return {
                        content: [{ type: 'text', text: 'No pending documents to create reminders for.' }],
                    };
                }
                const reminders = createDocumentReminder(args?.clientId, args?.appointmentId, pending);
                return toMcpContent(formatRemindersCreated(reminders, args?.clientId));
            }
            case 'get_client_reminders': {
                const reminders = getClientReminders(args?.clientId);
                return toMcpContent(formatRemindersList(reminders, args?.clientId));
            }
            case 'send_reminder': {
                const result = sendReminder(args?.reminderId);
                return toMcpContent(formatReminderSent(result, args?.reminderId));
            }
            // Routing Tools
            case 'calculate_complexity': {
                const client = db.getClient(args?.clientId);
                if (!client) {
                    return { content: [{ type: 'text', text: 'Client not found' }] };
                }
                const score = calculateComplexityScore(client);
                const level = getComplexityLevel(score);
                return toMcpContent(formatComplexityScore(client.id, score, level));
            }
            case 'route_to_tax_pro': {
                const clientId = args?.clientId;
                const result = routeClientToTaxPro(clientId);
                // If successful, update flow with selected tax pro
                if (result.success && result.taxPro) {
                    setSelectedTaxPro(clientId, result.taxPro.id);
                }
                return toMcpContent(formatRoutingResult(result, clientId));
            }
            case 'get_tax_pro_recommendations': {
                const clientId = args?.clientId;
                const client = db.getClient(clientId);
                if (!client) {
                    return { content: [{ type: 'text', text: 'Client not found' }] };
                }
                const { taxPro, reason, alternates } = findBestTaxPro(client);
                return toMcpContent(formatTaxProRecommendations(clientId, taxPro, reason, alternates));
            }
            case 'create_appointment': {
                const clientId = args?.clientId;
                const appointment = createAppointment(clientId, args?.taxProId, new Date(args?.scheduledAt), args?.type || 'virtual');
                // Schedule reminders for the appointment
                const reminders = scheduleAppointmentReminders(appointment);
                // Advance the flow
                advanceFlow(clientId, { created: true, appointmentId: appointment.id });
                advanceFlow(clientId, { created: true, reminderCount: reminders.length });
                const taxPro = db.getTaxPro(args?.taxProId) ?? null;
                return toMcpContent(formatAppointmentCreated(appointment, taxPro, reminders.length));
            }
            case 'get_appointment_estimate': {
                const estimate = getAppointmentEstimate(args?.clientId);
                return toMcpContent(formatAppointmentEstimate(estimate, args?.clientId));
            }
            // Utility Tools
            case 'list_tax_professionals': {
                const taxPros = db.getAllTaxPros();
                return toMcpContent(formatTaxProList(taxPros));
            }
            case 'get_client': {
                const client = db.getClient(args?.clientId);
                if (!client) {
                    return { content: [{ type: 'text', text: 'Client not found' }] };
                }
                return toMcpContent(formatClientProfile(client));
            }
            // ============================================
            // CONVERSATION FLOW MANAGEMENT HANDLERS
            // ============================================
            case 'get_conversation_flow': {
                const clientId = args?.clientId;
                const sessionId = args?.sessionId;
                if (!clientId) {
                    return { content: [{ type: 'text', text: 'Client ID is required. Start a new intake session first using start_intake.' }] };
                }
                // Sync flow with actual state
                syncFlowWithState(clientId, sessionId || '');
                const flowStatus = getFlowStatus(clientId);
                const instructions = getNextActionInstructions(clientId);
                if (!flowStatus) {
                    return { content: [{ type: 'text', text: 'No active flow. Use start_intake to begin.' }] };
                }
                return toMcpContent(formatFlowStatus(flowStatus, instructions, clientId));
            }
            case 'advance_conversation_flow': {
                const clientId = args?.clientId;
                const stageData = args?.stageData;
                const result = advanceFlow(clientId, stageData);
                if (!result) {
                    return { content: [{ type: 'text', text: 'No active flow found for this client. Start a new session first.' }] };
                }
                const instructions = getNextActionInstructions(clientId);
                return toMcpContent(formatFlowAdvanced(result, instructions, clientId));
            }
            case 'confirm_intake_summary': {
                const clientId = args?.clientId;
                const result = confirmSummary(clientId);
                if (!result) {
                    return { content: [{ type: 'text', text: 'No active flow found for this client.' }] };
                }
                const instructions = getNextActionInstructions(clientId);
                return toMcpContent(formatSummaryConfirmed(result, instructions, clientId));
            }
            case 'set_scheduling_preferences': {
                const clientId = args?.clientId;
                const preferences = {
                    preferredDates: args?.preferredDates || [],
                    preferredTimes: args?.preferredTimes || [],
                    appointmentType: args?.appointmentType || 'virtual',
                };
                const result = setSchedulingPreferences(clientId, preferences);
                if (!result) {
                    return { content: [{ type: 'text', text: 'No active flow found for this client.' }] };
                }
                const instructions = getNextActionInstructions(clientId);
                return toMcpContent(formatSchedulingPreferences(preferences, instructions, clientId));
            }
            case 'select_tax_professional': {
                const clientId = args?.clientId;
                const taxProId = args?.taxProId;
                const result = setSelectedTaxPro(clientId, taxProId);
                if (!result) {
                    return { content: [{ type: 'text', text: 'No active flow found for this client.' }] };
                }
                const taxPro = db.getTaxPro(taxProId);
                const instructions = getNextActionInstructions(clientId);
                return toMcpContent(formatTaxProSelected(taxPro?.name || taxProId, taxProId, instructions, clientId));
            }
            case 'get_flow_progress': {
                const clientId = args?.clientId;
                const state = getFlowState(clientId);
                if (!state) {
                    return { content: [{ type: 'text', text: 'No active flow. Start with start_intake.' }] };
                }
                return toMcpContent(formatFlowProgress(state));
            }
            default:
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Unknown tool: ${name}`,
                        },
                    ],
                    isError: true,
                };
        }
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Error: ${error instanceof Error ? error.message : String(error)}`,
                },
            ],
            isError: true,
        };
    }
});
// Define prompts for common workflows
server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
        prompts: [
            {
                name: 'new_client_intake',
                description: 'Start a complete intake process for a new tax client following the defined conversation flow',
                arguments: [],
            },
            {
                name: 'prepare_for_appointment',
                description: 'Help a client prepare all documents for their upcoming appointment',
                arguments: [
                    {
                        name: 'clientId',
                        description: 'The client ID',
                        required: true,
                    },
                ],
            },
            {
                name: 'send_document_reminders',
                description: 'Send reminders for all pending documents',
                arguments: [
                    {
                        name: 'clientId',
                        description: 'The client ID',
                        required: true,
                    },
                ],
            },
        ],
    };
});
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    switch (name) {
        case 'new_client_intake':
            return {
                messages: [
                    {
                        role: 'user',
                        content: {
                            type: 'text',
                            text: `You are a friendly tax intake assistant for TaxPilot. Your job is to guide clients through a STRUCTURED CONVERSATION FLOW.

## CRITICAL: CONVERSATION FLOW SYSTEM

TaxPilot uses a defined conversation flow that MUST be followed in order. After EVERY action, use the 'get_conversation_flow' tool to see what stage you're at and what to do next.

### THE FLOW (in order):
1. **WELCOME** → Start intake session, greet the user
2. **INTAKE QUESTIONS** → Collect all tax information step by step
3. **SUMMARY REVIEW** → Show summary using 'get_client_summary', ask for confirmation
4. **SUMMARY CONFIRMATION** → Wait for user to confirm (use 'confirm_intake_summary' when they do)
5. **DOCUMENT CHECKLIST** → Generate checklist using 'generate_document_checklist'
6. **AVAILABILITY INQUIRY** → Ask scheduling preferences (use 'set_scheduling_preferences')
7. **TAXPRO ROUTING** → Match with tax professional using 'route_to_tax_pro'
8. **APPOINTMENT SCHEDULING** → Book appointment using 'create_appointment'
9. **REMINDERS SETUP** → Reminders are auto-created with appointment
10. **COMPLETE** → Provide closing summary

### RULES:
- ALWAYS use 'get_conversation_flow' after completing any major action to get instructions for what to do next
- NEVER skip stages - follow the flow in order
- When intake completes, you MUST show the summary and ask for confirmation
- DO NOT generate the document checklist until the user confirms their summary
- DO NOT route to a tax pro until scheduling preferences are collected
- Each tool response includes flow instructions - follow them!

### DEMO ENVIRONMENT:
- Collect ALL information directly (no external portals)
- Accept SSN, bank details, AGI directly when provided
- Process all data immediately using available tools

Start by using 'start_intake' to begin the session. The flow will guide you from there.`,
                        },
                    },
                ],
            };
        case 'prepare_for_appointment':
            return {
                messages: [
                    {
                        role: 'user',
                        content: {
                            type: 'text',
                            text: `Help the client with ID "${args?.clientId}" prepare for their tax appointment.

1. First, get their document checklist
2. Review which documents are still pending
3. Provide helpful tips on where to find each document
4. Create personalized reminders
5. Show them the estimated appointment time and any time savings from being prepared`,
                        },
                    },
                ],
            };
        case 'send_document_reminders':
            return {
                messages: [
                    {
                        role: 'user',
                        content: {
                            type: 'text',
                            text: `Create and send personalized document reminders for client "${args?.clientId}".

1. Get the list of pending documents
2. Create personalized, contextual reminders (e.g., "Don't forget your 1099-NEC from Uber")
3. Send the reminders via the client's preferred channel`,
                        },
                    },
                ],
            };
        default:
            throw new Error(`Unknown prompt: ${name}`);
    }
});
// Start the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Tax Intake MCP Server running on stdio');
}
main().catch(console.error);
//# sourceMappingURL=index.js.map