import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { ServerResponse } from 'http';

import {
  startIntakeSession,
  processIntakeResponse,
  getIntakeProgress,
  getIntakeSummary,
} from './services/intake.js';
import {
  generateDocumentChecklist,
  getDocumentChecklist,
  markDocumentCollected,
  formatChecklistForDisplay,
  getPendingDocuments,
} from './services/checklist.js';
import {
  createDocumentReminder,
  getClientReminders,
  formatRemindersForDisplay,
} from './services/reminders.js';
import {
  routeClientToTaxPro,
  createAppointment,
  getAppointmentEstimate,
  getTaxProRecommendations,
} from './services/routing.js';

// Store active transports
export const transports: Record<string, SSEServerTransport> = {};

// Create a new MCP server instance for each session
export function createMcpServer(): Server {
  const server = new Server(
    {
      name: 'tax-intake-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Define tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'start_intake',
          description: 'Start a new client intake session. This begins the conversational intake process to collect all necessary information before the tax appointment.',
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
          description: "Process a client response during the intake conversation. Send the client's answer to continue gathering information.",
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: { type: 'string', description: 'The intake session ID' },
              answer: { type: 'string', description: "The client's response to the current intake question" },
            },
            required: ['sessionId', 'answer'],
          },
        },
        {
          name: 'get_intake_progress',
          description: 'Get the current progress of an intake session.',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: { type: 'string', description: 'The intake session ID' },
            },
            required: ['sessionId'],
          },
        },
        {
          name: 'get_client_summary',
          description: "Get a complete summary of a client's intake information.",
          inputSchema: {
            type: 'object',
            properties: {
              clientId: { type: 'string', description: 'The client ID' },
            },
            required: ['clientId'],
          },
        },
        {
          name: 'generate_document_checklist',
          description: "Generate a personalized document checklist based on the client's tax situation.",
          inputSchema: {
            type: 'object',
            properties: {
              clientId: { type: 'string', description: 'The client ID' },
            },
            required: ['clientId'],
          },
        },
        {
          name: 'get_document_checklist',
          description: 'Retrieve the current document checklist for a client.',
          inputSchema: {
            type: 'object',
            properties: {
              clientId: { type: 'string', description: 'The client ID' },
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
              clientId: { type: 'string', description: 'The client ID' },
              documentId: { type: 'string', description: 'The document ID to mark as collected' },
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
              clientId: { type: 'string', description: 'The client ID' },
            },
            required: ['clientId'],
          },
        },
        {
          name: 'create_document_reminders',
          description: 'Create personalized reminders for pending documents.',
          inputSchema: {
            type: 'object',
            properties: {
              clientId: { type: 'string', description: 'The client ID' },
              appointmentId: { type: 'string', description: 'Optional appointment ID' },
            },
            required: ['clientId'],
          },
        },
        {
          name: 'get_client_reminders',
          description: 'Get all reminders scheduled for a client.',
          inputSchema: {
            type: 'object',
            properties: {
              clientId: { type: 'string', description: 'The client ID' },
            },
            required: ['clientId'],
          },
        },
        {
          name: 'route_to_tax_pro',
          description: 'Analyze client complexity and route to the appropriate tax professional.',
          inputSchema: {
            type: 'object',
            properties: {
              clientId: { type: 'string', description: 'The client ID' },
            },
            required: ['clientId'],
          },
        },
        {
          name: 'get_appointment_estimate',
          description: 'Estimate appointment duration based on complexity and intake completion.',
          inputSchema: {
            type: 'object',
            properties: {
              clientId: { type: 'string', description: 'The client ID' },
            },
            required: ['clientId'],
          },
        },
        {
          name: 'get_tax_pro_recommendations',
          description: 'Get recommended tax professionals based on client needs.',
          inputSchema: {
            type: 'object',
            properties: {
              clientId: { type: 'string', description: 'The client ID' },
            },
            required: ['clientId'],
          },
        },
        {
          name: 'create_appointment',
          description: 'Schedule an appointment between client and tax professional.',
          inputSchema: {
            type: 'object',
            properties: {
              clientId: { type: 'string', description: 'The client ID' },
              taxProId: { type: 'string', description: 'The tax professional ID' },
              scheduledAt: { type: 'string', description: 'ISO date-time for the appointment' },
              type: { type: 'string', enum: ['in-person', 'virtual'], description: 'Appointment type' },
            },
            required: ['clientId', 'taxProId', 'scheduledAt'],
          },
        },
      ],
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'start_intake': {
          const result = startIntakeSession(args?.clientId as string | undefined);
          return {
            content: [
              {
                type: 'text',
                text: `Intake session started!\n\nSession ID: ${result.session.id}\nClient ID: ${result.client.id}\n\n${result.nextQuestion}`,
              },
            ],
          };
        }

        case 'process_intake_response': {
          const result = processIntakeResponse(args?.sessionId as string, args?.answer as string);
          if (result.intakeCompleted) {
            return {
              content: [{ type: 'text', text: `Intake complete! Client ID: ${result.client?.id}\n\nYou can now generate a document checklist or get tax pro recommendations.` }],
            };
          }
          return {
            content: [{ type: 'text', text: result.nextQuestion || 'Processing...' }],
          };
        }

        case 'get_intake_progress': {
          const progress = getIntakeProgress(args?.sessionId as string);
          return {
            content: [{ type: 'text', text: JSON.stringify(progress, null, 2) }],
          };
        }

        case 'get_client_summary': {
          const summary = getIntakeSummary(args?.clientId as string);
          return {
            content: [{ type: 'text', text: summary }],
          };
        }

        case 'generate_document_checklist': {
          const checklist = generateDocumentChecklist(args?.clientId as string);
          return {
            content: [{ type: 'text', text: formatChecklistForDisplay(checklist) }],
          };
        }

        case 'get_document_checklist': {
          const checklist = getDocumentChecklist(args?.clientId as string);
          if (!checklist) {
            return { content: [{ type: 'text', text: 'No checklist found. Generate one first.' }] };
          }
          return {
            content: [{ type: 'text', text: formatChecklistForDisplay(checklist) }],
          };
        }

        case 'mark_document_collected': {
          const result = markDocumentCollected(args?.clientId as string, args?.documentId as string);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        }

        case 'get_pending_documents': {
          const pending = getPendingDocuments(args?.clientId as string);
          return {
            content: [{ type: 'text', text: JSON.stringify(pending, null, 2) }],
          };
        }

        case 'create_document_reminders': {
          const pending = getPendingDocuments(args?.clientId as string);
          if (pending.length === 0) {
            return { content: [{ type: 'text', text: 'No pending documents - no reminders needed!' }] };
          }
          const reminders = createDocumentReminder(args?.clientId as string, args?.appointmentId as string, pending);
          return {
            content: [{ type: 'text', text: reminders.map((r: { message: string }) => `- ${r.message}`).join('\n') }],
          };
        }

        case 'get_client_reminders': {
          const reminders = getClientReminders(args?.clientId as string);
          return {
            content: [{ type: 'text', text: formatRemindersForDisplay(reminders) }],
          };
        }

        case 'route_to_tax_pro': {
          const result = routeClientToTaxPro(args?.clientId as string);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        }

        case 'get_appointment_estimate': {
          const estimate = getAppointmentEstimate(args?.clientId as string);
          return {
            content: [{ type: 'text', text: estimate.message }],
          };
        }

        case 'get_tax_pro_recommendations': {
          const recs = getTaxProRecommendations(args?.clientId as string);
          return {
            content: [{ type: 'text', text: recs }],
          };
        }

        case 'create_appointment': {
          const appointment = createAppointment(
            args?.clientId as string,
            args?.taxProId as string,
            new Date(args?.scheduledAt as string),
            args?.type as 'in_person' | 'virtual'
          );
          return {
            content: [{ type: 'text', text: JSON.stringify(appointment, null, 2) }],
          };
        }

        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  });

  return server;
}

// Create SSE transport for a response
export function createSseTransport(endpoint: string, res: ServerResponse): SSEServerTransport {
  return new SSEServerTransport(endpoint, res);
}
