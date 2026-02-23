import OpenAI from 'openai';
import { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';

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
  routeClientToTaxPro,
  createAppointment,
  getAppointmentEstimate,
  getTaxProRecommendations,
} from '../services/routing.js';

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
- Ask ONE question at a time during intake.
- Always start with start_intake for new clients.
- Never give tax advice — say "Your tax professional will advise on that."
- Confirm before booking appointments.
- Keep sensitive data handling professional.

## Flow
1. Call start_intake → get sessionId + clientId + first question
2. Present question to user, wait for answer
3. Call process_intake_response with their answer → get next question
4. Repeat until intake is complete
5. Call get_client_summary to show overview
6. Call generate_checklist to show required documents
7. When ready, call route_to_tax_pro and get_recommendations
8. Call create_appointment when user confirms a time
`;

// ─── Tool definitions (function calling) ─────────────────────────────────────
const tools: ChatCompletionTool[] = [
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
      description: 'Submit the client answer to the current intake question and get the next question.',
      parameters: {
        type: 'object',
        properties: {
          sessionId: { type: 'string', description: 'Session ID from start_intake' },
          answer: { type: 'string', description: 'Client answer' },
        },
        required: ['sessionId', 'answer'],
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

// ─── Execute a tool call against local services ──────────────────────────────
function executeTool(name: string, args: Record<string, unknown>): string {
  try {
    switch (name) {
      case 'start_intake': {
        const result = startIntakeSession(args?.clientId as string | undefined);
        return JSON.stringify({
          sessionId: result.session.id,
          clientId: result.client.id,
          currentStep: result.currentStep,
          nextQuestion: result.nextQuestion,
        });
      }
      case 'process_intake_response': {
        const result = processIntakeResponse(args.sessionId as string, args.answer as string);
        return JSON.stringify(result);
      }
      case 'get_intake_progress': {
        const progress = getIntakeProgress(args.sessionId as string);
        return JSON.stringify(progress);
      }
      case 'get_client_summary': {
        return getIntakeSummary(args.clientId as string);
      }
      case 'generate_checklist': {
        const checklist = generateDocumentChecklist(args.clientId as string);
        return formatChecklistForDisplay(checklist);
      }
      case 'get_pending_documents': {
        const pending = getPendingDocuments(args.clientId as string);
        return JSON.stringify(pending);
      }
      case 'mark_document_collected': {
        const result = markDocumentCollected(args.clientId as string, args.documentId as string);
        return JSON.stringify(result);
      }
      case 'create_reminders': {
        const reminder = createBatchDocumentReminder(
          args.clientId as string,
          (args.appointmentId as string) || 'pending'
        );
        return reminder
          ? JSON.stringify(reminder)
          : JSON.stringify({ message: 'No pending documents — no reminder needed.' });
      }
      case 'route_to_tax_pro': {
        const result = routeClientToTaxPro(args.clientId as string);
        return JSON.stringify(result);
      }
      case 'get_recommendations': {
        return getTaxProRecommendations(args.clientId as string);
      }
      case 'get_appointment_estimate': {
        const est = getAppointmentEstimate(args.clientId as string);
        return est.message;
      }
      case 'create_appointment': {
        const appt = createAppointment(
          args.clientId as string,
          args.taxProId as string,
          new Date(args.scheduledAt as string),
          (args.type as 'virtual' | 'in_person') || 'virtual'
        );
        return JSON.stringify(appt);
      }
      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (error) {
    return JSON.stringify({ error: error instanceof Error ? error.message : String(error) });
  }
}

// ─── ChatGPT-powered conversation handler ────────────────────────────────────

export interface ChatSession {
  id: string;
  messages: ChatCompletionMessageParam[];
  clientId?: string;
  sessionId?: string;
}

const chatSessions = new Map<string, ChatSession>();

/**
 * Create or retrieve a chat session.
 */
export function getOrCreateChatSession(chatId: string): ChatSession {
  if (!chatSessions.has(chatId)) {
    chatSessions.set(chatId, {
      id: chatId,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }],
    });
  }
  return chatSessions.get(chatId)!;
}

/**
 * Send a user message and get an AI response with automatic function calling.
 * The OpenAI SDK handles the conversation; tool calls are executed locally.
 */
export async function chat(
  chatId: string,
  userMessage: string,
  options?: { model?: string }
): Promise<{ reply: string; chatId: string }> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = options?.model || process.env.OPENAI_MODEL || 'gpt-4o';

  const session = getOrCreateChatSession(chatId);
  session.messages.push({ role: 'user', content: userMessage });

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
    session.messages.push(assistantMessage as ChatCompletionMessageParam);

    // If there are tool calls, execute them and feed results back
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      for (const toolCall of assistantMessage.tool_calls) {
        // Handle both standard function calls and any future tool types
        const fn = 'function' in toolCall ? (toolCall as any).function : null;
        if (!fn) continue;
        const args = JSON.parse(fn.arguments);
        const result = executeTool(fn.name, args);

        session.messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: result,
        });
      }
      continue; // go around the loop — ChatGPT may want to call more tools
    }

    // No tool calls → we have the final assistant reply
    return {
      reply: assistantMessage.content || '',
      chatId: session.id,
    };
  }

  return { reply: 'I ran into a processing limit. Please try again.', chatId };
}

/**
 * Reset a chat session.
 */
export function resetChatSession(chatId: string): void {
  chatSessions.delete(chatId);
}

/**
 * List active chat sessions (for admin/debug).
 */
export function listChatSessions(): string[] {
  return Array.from(chatSessions.keys());
}
