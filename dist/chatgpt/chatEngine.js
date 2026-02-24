import OpenAI from 'openai';
import { startIntakeSession, processIntakeResponse, processStructuredIntakeResponse, getIntakeProgress, getIntakeSummary, } from '../services/intake.js';
import { generateDocumentChecklist, markDocumentCollected, getPendingDocuments, formatChecklistForDisplay, } from '../services/checklist.js';
import { createBatchDocumentReminder, } from '../services/reminders.js';
import { routeClientToTaxPro, createAppointment, getAppointmentEstimate, getTaxProRecommendations, } from '../services/routing.js';
// UI Formatters — produce StructuredUIResponse JSON with interactive components
import { formatIntakeStart, formatIntakeResponse, formatIntakeProgress, formatClientSummary, } from '../ui/formatters/intake.js';
import { db } from '../database/index.js';
// ─── System prompt ───────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are TaxPilot, a friendly and professional AI tax intake assistant.

Your job is to guide clients through:
1. Tax intake — collecting personal & financial information step by step
2. Document checklist — generating a personalized list of required documents
3. Tax pro matching — finding the best tax professional for their needs
4. Appointment scheduling — booking the right time slot

## Personality
- Warm, professional, and reassuring
- Simplify tax jargon
- Celebrate progress with brief encouragements
- Use clear formatting (headings, bullets, emoji sparingly)

## Rules
- Always start with start_intake for new clients.
- Never give tax advice — say "Your tax professional will advise on that."
- Confirm before booking appointments.
- Keep sensitive data handling professional.

## Structured UI Commands
The frontend sends structured commands when users interact with UI components:
- \`[tool:toolName] {...params}\` — the user clicked a button that should invoke a tool. Extract the tool name and parameters, then call that tool directly with those exact parameters.
- \`[form] {...formData}\` — the user submitted a form. The form data should be passed to the appropriate intake processing tool.

When you see these patterns, ALWAYS call the indicated tool with the provided parameters. Do not ask the user to rephrase. Keep your text response brief (1-2 sentences acknowledging progress) — the interactive UI components will be rendered automatically from the tool results.

## Flow
1. Call start_intake → get sessionId + clientId + first question (UI forms render automatically)
2. User interacts with the form/selection UI → their answer comes back as a tool command
3. Call process_intake_response with their answer → next step's UI renders automatically
4. Repeat until intake is complete
5. Call get_client_summary to show overview
6. Call generate_checklist to show required documents
7. When ready, call route_to_tax_pro and get_recommendations
8. Call create_appointment when user confirms a time
`;
// ─── Tool definitions (function calling) ─────────────────────────────────────
const tools = [
    {
        type: 'function',
        function: {
            name: 'start_intake',
            description: 'Start a new client intake session. Returns sessionId, clientId, and the first question.',
            parameters: {
                type: 'object',
                properties: {
                    clientId: { type: 'string', description: 'Optional existing client ID' },
                },
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'process_intake_response',
            description: 'Submit the client answer to the current intake question. Supports structured form data, single selection, multi-selection, or plain text answer.',
            parameters: {
                type: 'object',
                properties: {
                    sessionId: { type: 'string', description: 'Session ID from start_intake' },
                    answer: { type: 'string', description: 'Client answer (plain text)' },
                    step: { type: 'string', description: 'The intake step this submission applies to' },
                    formData: { type: 'object', description: 'Structured form field values (key-value pairs)' },
                    selection: { type: 'string', description: 'Single selection ID from a SelectionCard' },
                    selections: { type: 'array', items: { type: 'string' }, description: 'Multi-select option IDs' },
                },
                required: ['sessionId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_intake_progress',
            description: 'Get current intake progress for a session.',
            parameters: {
                type: 'object',
                properties: { sessionId: { type: 'string' } },
                required: ['sessionId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_client_summary',
            description: 'Get a formatted summary of all client information collected during intake.',
            parameters: {
                type: 'object',
                properties: { clientId: { type: 'string' } },
                required: ['clientId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'generate_checklist',
            description: 'Generate a personalized document checklist based on client tax situation.',
            parameters: {
                type: 'object',
                properties: { clientId: { type: 'string' } },
                required: ['clientId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_pending_documents',
            description: 'List documents still needed from the client.',
            parameters: {
                type: 'object',
                properties: { clientId: { type: 'string' } },
                required: ['clientId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'mark_document_collected',
            description: 'Mark a specific document as received from the client.',
            parameters: {
                type: 'object',
                properties: {
                    clientId: { type: 'string' },
                    documentId: { type: 'string' },
                },
                required: ['clientId', 'documentId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'create_reminders',
            description: 'Create reminders for all pending documents for a client.',
            parameters: {
                type: 'object',
                properties: {
                    clientId: { type: 'string' },
                    appointmentId: { type: 'string', description: 'Optional appointment ID' },
                },
                required: ['clientId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'route_to_tax_pro',
            description: 'Analyze client complexity and match to the best tax professional.',
            parameters: {
                type: 'object',
                properties: { clientId: { type: 'string' } },
                required: ['clientId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_recommendations',
            description: 'Get a ranked list of recommended tax professionals for the client.',
            parameters: {
                type: 'object',
                properties: { clientId: { type: 'string' } },
                required: ['clientId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_appointment_estimate',
            description: 'Estimate appointment duration based on client complexity.',
            parameters: {
                type: 'object',
                properties: { clientId: { type: 'string' } },
                required: ['clientId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'create_appointment',
            description: 'Book an appointment for the client with a tax professional.',
            parameters: {
                type: 'object',
                properties: {
                    clientId: { type: 'string' },
                    taxProId: { type: 'string' },
                    scheduledAt: { type: 'string', description: 'ISO datetime string' },
                    type: { type: 'string', enum: ['virtual', 'in_person'] },
                },
                required: ['clientId', 'taxProId', 'scheduledAt'],
            },
        },
    },
];
function executeTool(name, args) {
    try {
        switch (name) {
            case 'start_intake': {
                const result = startIntakeSession(args?.clientId);
                // Build structured UI with the interactive form for step 1
                const structuredUI = formatIntakeStart(result);
                return {
                    text: JSON.stringify({
                        sessionId: result.session.id,
                        clientId: result.client.id,
                        currentStep: result.currentStep,
                        nextQuestion: result.nextQuestion,
                    }),
                    structuredUI,
                };
            }
            case 'process_intake_response': {
                const step = args.step;
                const formData = args.formData;
                const selection = args.selection;
                const selections = args.selections;
                let result;
                if (step && (formData || selection || selections)) {
                    result = processStructuredIntakeResponse(args.sessionId, step, formData, selection, selections);
                }
                else {
                    result = processIntakeResponse(args.sessionId, args.answer);
                }
                // Build structured UI for the next step
                const sessionId = args.sessionId;
                const progressInfo = getIntakeProgress(sessionId);
                const structuredUI = formatIntakeResponse(result, sessionId, progressInfo ? {
                    completedSteps: progressInfo.completedSteps,
                    totalSteps: progressInfo.totalSteps,
                    percentComplete: progressInfo.percentComplete,
                } : undefined);
                return {
                    text: JSON.stringify(result),
                    structuredUI,
                };
            }
            case 'get_intake_progress': {
                const progress = getIntakeProgress(args.sessionId);
                const structuredUI = formatIntakeProgress(progress, args.sessionId);
                return {
                    text: JSON.stringify(progress),
                    structuredUI,
                };
            }
            case 'get_client_summary': {
                const summaryText = getIntakeSummary(args.clientId);
                const client = db.getClient(args.clientId);
                if (client) {
                    const structuredUI = formatClientSummary(client, summaryText);
                    return { text: summaryText, structuredUI };
                }
                return { text: summaryText };
            }
            case 'generate_checklist': {
                const checklist = generateDocumentChecklist(args.clientId);
                return { text: formatChecklistForDisplay(checklist) };
            }
            case 'get_pending_documents': {
                const pending = getPendingDocuments(args.clientId);
                return { text: JSON.stringify(pending) };
            }
            case 'mark_document_collected': {
                const result = markDocumentCollected(args.clientId, args.documentId);
                return { text: JSON.stringify(result) };
            }
            case 'create_reminders': {
                const reminder = createBatchDocumentReminder(args.clientId, args.appointmentId || 'pending');
                return {
                    text: reminder
                        ? JSON.stringify(reminder)
                        : JSON.stringify({ message: 'No pending documents — no reminder needed.' }),
                };
            }
            case 'route_to_tax_pro': {
                const result = routeClientToTaxPro(args.clientId);
                return { text: JSON.stringify(result) };
            }
            case 'get_recommendations': {
                return { text: getTaxProRecommendations(args.clientId) };
            }
            case 'get_appointment_estimate': {
                const est = getAppointmentEstimate(args.clientId);
                return { text: est.message };
            }
            case 'create_appointment': {
                const appt = createAppointment(args.clientId, args.taxProId, new Date(args.scheduledAt), args.type || 'virtual');
                return { text: JSON.stringify(appt) };
            }
            default:
                return { text: JSON.stringify({ error: `Unknown tool: ${name}` }) };
        }
    }
    catch (error) {
        return { text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }) };
    }
}
const chatSessions = new Map();
/**
 * Create or retrieve a chat session.
 */
export function getOrCreateChatSession(chatId) {
    if (!chatSessions.has(chatId)) {
        chatSessions.set(chatId, {
            id: chatId,
            messages: [{ role: 'system', content: SYSTEM_PROMPT }],
        });
    }
    return chatSessions.get(chatId);
}
/**
 * Send a user message and get an AI response with automatic function calling.
 * The OpenAI SDK handles the conversation; tool calls are executed locally.
 * When tools produce structured UI (forms, cards, etc.), the UI JSON is
 * returned alongside the text reply so the frontend can render it directly.
 */
export async function chat(chatId, userMessage, options) {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = options?.model || process.env.OPENAI_MODEL || 'gpt-4o';
    const session = getOrCreateChatSession(chatId);
    session.messages.push({ role: 'user', content: userMessage });
    // Track the last structured UI produced by any tool call in this turn
    let lastStructuredUI;
    // Loop: let ChatGPT call tools until it produces a final text reply
    let maxIterations = 10; // safety limit
    while (maxIterations-- > 0) {
        const completion = await openai.chat.completions.create({
            model,
            messages: session.messages,
            tools,
            tool_choice: 'auto',
        });
        const choice = completion.choices[0];
        const assistantMessage = choice.message;
        session.messages.push(assistantMessage);
        // If there are tool calls, execute them and feed results back
        if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
            for (const toolCall of assistantMessage.tool_calls) {
                // Handle both standard function calls and any future tool types
                const fn = 'function' in toolCall ? toolCall.function : null;
                if (!fn)
                    continue;
                const args = JSON.parse(fn.arguments);
                const toolResult = executeTool(fn.name, args);
                // Capture structured UI if the tool produced one
                if (toolResult.structuredUI) {
                    lastStructuredUI = toolResult.structuredUI;
                }
                session.messages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: toolResult.text,
                });
            }
            continue; // go around the loop — ChatGPT may want to call more tools
        }
        // No tool calls → we have the final assistant reply
        return {
            reply: assistantMessage.content || '',
            chatId: session.id,
            structuredUI: lastStructuredUI,
        };
    }
    return { reply: 'I ran into a processing limit. Please try again.', chatId, structuredUI: lastStructuredUI };
}
/**
 * Reset a chat session.
 */
export function resetChatSession(chatId) {
    chatSessions.delete(chatId);
}
/**
 * List active chat sessions (for admin/debug).
 */
export function listChatSessions() {
    return Array.from(chatSessions.keys());
}
//# sourceMappingURL=chatEngine.js.map