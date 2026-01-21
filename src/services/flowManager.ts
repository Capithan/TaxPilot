/**
 * Conversation Flow Manager
 * 
 * This module manages the TaxPilot conversation flow, ensuring every
 * conversation follows the same sequence of stages. It tracks progress
 * and provides guidance on what action should happen next.
 * 
 * FLOW SEQUENCE:
 * 1. welcome                 → Greet user, start intake session
 * 2. intake_questions        → Collect all tax information
 * 3. summary_review          → Generate and show summary
 * 4. summary_confirmation    → User confirms or edits
 * 5. document_checklist      → Generate document requirements
 * 6. availability_inquiry    → Ask scheduling preferences
 * 7. taxpro_routing          → Match with tax professional
 * 8. appointment_scheduling  → Book the appointment
 * 9. reminders_setup         → Set up reminders
 * 10. complete               → Flow finished
 */

import {
  ConversationStage,
  ConversationFlowState,
  FlowActionResult,
  ClientProfile,
} from '../types/index.js';
import { db } from '../database/index.js';

// Define the flow sequence in order
const FLOW_SEQUENCE: ConversationStage[] = [
  'welcome',
  'intake_questions',
  'summary_review',
  'summary_confirmation',
  'document_checklist',
  'availability_inquiry',
  'taxpro_routing',
  'appointment_scheduling',
  'reminders_setup',
  'complete',
];

// Store for active conversation flows (in production, use database)
const activeFlows: Map<string, ConversationFlowState> = new Map();

/**
 * Instructions and actions for each stage of the flow
 */
const STAGE_CONFIG: Record<ConversationStage, {
  description: string;
  nextAction: string;
  instructions: string;
  suggestedTools: string[];
  completionCheck: (state: ConversationFlowState, client?: ClientProfile) => { canProceed: boolean; blockers: string[] };
}> = {
  welcome: {
    description: 'Initial greeting and session setup',
    nextAction: 'Start intake session and greet the user',
    instructions: `Welcome the user to TaxPilot. Introduce yourself as their tax intake assistant. 
Use the 'start_intake' tool to begin a new session, then proceed to ask the first intake question.
Be warm, friendly, and explain that you'll guide them through gathering all necessary information.`,
    suggestedTools: ['start_intake'],
    completionCheck: (state) => {
      const hasSession = !!state.sessionId && state.sessionId.length > 0;
      return {
        canProceed: hasSession,
        blockers: hasSession ? [] : ['Intake session must be started'],
      };
    },
  },

  intake_questions: {
    description: 'Collecting all tax information from the user',
    nextAction: 'Continue asking intake questions',
    instructions: `You are in the intake questions phase. Continue collecting information by:
1. Ask the current intake question shown in the flow
2. Use 'process_intake_response' to record each answer
3. Move through all intake steps: personal_info, filing_status, dependents, employment, income_types, deductions, special_situations
4. Use 'get_intake_progress' to check progress if needed
5. Once intake is complete, automatically transition to the summary review stage

Be conversational and explain why each piece of information matters for their taxes.`,
    suggestedTools: ['process_intake_response', 'get_intake_progress'],
    completionCheck: (state, client) => {
      const isComplete = client?.intakeCompleted === true;
      return {
        canProceed: isComplete,
        blockers: isComplete ? [] : ['All intake questions must be completed'],
      };
    },
  },

  summary_review: {
    description: 'Generating and displaying the intake summary',
    nextAction: 'Generate and present the summary to the user',
    instructions: `The intake is complete! Now you must:
1. Use 'get_client_summary' to generate a comprehensive summary
2. Present the summary clearly to the user
3. Explicitly ask: "Please review this information. Is everything correct? Would you like to make any changes?"
4. Wait for the user's confirmation before proceeding

DO NOT skip this step or proceed until the user confirms their information is correct.`,
    suggestedTools: ['get_client_summary'],
    completionCheck: (state) => {
      // This stage completes when summary has been shown (tracked in stageData)
      const summaryShown = state.stageData.summary_review as { shown?: boolean } | undefined;
      return {
        canProceed: summaryShown?.shown === true,
        blockers: summaryShown?.shown ? [] : ['Summary must be displayed to user'],
      };
    },
  },

  summary_confirmation: {
    description: 'Waiting for user to confirm or request edits',
    nextAction: 'Wait for user confirmation or process edit requests',
    instructions: `You are waiting for the user to confirm their intake summary. 

If user CONFIRMS (says "yes", "correct", "looks good", etc.):
- Mark the summary as confirmed and proceed to document checklist

If user wants to EDIT:
- Ask what they'd like to change
- Use 'process_intake_response' to update the specific information
- Re-display the updated summary for confirmation

DO NOT proceed until you receive explicit confirmation.`,
    suggestedTools: ['process_intake_response', 'get_client_summary'],
    completionCheck: (state) => {
      return {
        canProceed: state.summaryConfirmed === true,
        blockers: state.summaryConfirmed ? [] : ['User must confirm their summary information'],
      };
    },
  },

  document_checklist: {
    description: 'Generating the personalized document checklist',
    nextAction: 'Generate and present the document checklist',
    instructions: `Now generate the personalized document checklist based on the user's tax situation:
1. Use 'generate_document_checklist' to create the tailored list
2. Present the checklist clearly, organized by category
3. Explain which documents are required vs optional
4. Offer tips on where to find each document (e.g., "Your W-2 should come from your employer by end of January")
5. After presenting, transition to asking about their availability for an appointment

This checklist is based on their specific income types, deductions, and special situations.`,
    suggestedTools: ['generate_document_checklist', 'get_document_checklist'],
    completionCheck: (state) => {
      const checklistGenerated = state.stageData.document_checklist as { generated?: boolean } | undefined;
      return {
        canProceed: checklistGenerated?.generated === true,
        blockers: checklistGenerated?.generated ? [] : ['Document checklist must be generated and shown'],
      };
    },
  },

  availability_inquiry: {
    description: 'Asking about scheduling preferences',
    nextAction: 'Ask about appointment availability and preferences',
    instructions: `Now ask about the user's scheduling preferences:
1. Ask: "When would you prefer to meet with your tax professional?"
2. Inquire about preferred dates/times
3. Ask if they prefer virtual or in-person appointments
4. Use 'get_appointment_estimate' to show estimated duration based on their complexity

Example: "Based on your tax situation, your appointment should take about X minutes. When works best for you?"

Record their preferences before proceeding to tax professional matching.`,
    suggestedTools: ['get_appointment_estimate'],
    completionCheck: (state) => {
      const hasPreferences = state.preferredSchedule !== undefined;
      return {
        canProceed: hasPreferences,
        blockers: hasPreferences ? [] : ['Scheduling preferences must be collected'],
      };
    },
  },

  taxpro_routing: {
    description: 'Matching with the right tax professional',
    nextAction: 'Route client to appropriate tax professional',
    instructions: `Now match the user with the best tax professional:
1. Use 'calculate_complexity' to show their tax complexity level
2. Use 'route_to_tax_pro' to find the best match based on:
   - Complexity level
   - Required specializations (crypto, foreign income, business, etc.)
   - Tax pro availability
3. Present the matched tax professional with explanation of why they're a good fit
4. Mention any alternate options if available
5. Ask if they'd like to proceed with booking

Explain the matching logic: "Based on your [complexity level] tax situation with [specializations needed], we've matched you with [Tax Pro Name]."`,
    suggestedTools: ['calculate_complexity', 'route_to_tax_pro', 'get_tax_pro_recommendations', 'list_tax_professionals'],
    completionCheck: (state) => {
      const hasTaxPro = state.selectedTaxProId !== undefined;
      return {
        canProceed: hasTaxPro,
        blockers: hasTaxPro ? [] : ['Tax professional must be selected'],
      };
    },
  },

  appointment_scheduling: {
    description: 'Creating the appointment',
    nextAction: 'Book the appointment',
    instructions: `Book the appointment with the selected tax professional:
1. Use 'create_appointment' with:
   - The client ID
   - Selected tax professional ID  
   - Preferred date/time
   - Appointment type (virtual/in-person)
2. Confirm the appointment details to the user
3. Mention that reminders will be set up

Show: "Your appointment is booked for [date/time] with [Tax Pro Name]. You'll receive reminders about your appointment and any pending documents."`,
    suggestedTools: ['create_appointment'],
    completionCheck: (state, client) => {
      const hasAppointment = client?.appointmentId !== undefined;
      return {
        canProceed: hasAppointment,
        blockers: hasAppointment ? [] : ['Appointment must be created'],
      };
    },
  },

  reminders_setup: {
    description: 'Setting up document and appointment reminders',
    nextAction: 'Set up reminders for documents and appointment',
    instructions: `Set up helpful reminders for the user:
1. Use 'create_document_reminders' to create personalized reminders for pending documents
2. Confirm reminders have been scheduled
3. Mention when they'll receive reminders (24 hours before, 1 hour before)
4. Provide final summary of next steps

The system automatically schedules appointment reminders when the appointment is created.`,
    suggestedTools: ['create_document_reminders', 'get_client_reminders', 'get_pending_documents'],
    completionCheck: (state) => {
      const remindersCreated = state.stageData.reminders_setup as { created?: boolean } | undefined;
      return {
        canProceed: remindersCreated?.created === true,
        blockers: remindersCreated?.created ? [] : ['Reminders should be created'],
      };
    },
  },

  complete: {
    description: 'Conversation flow completed',
    nextAction: 'Provide closing summary and offer additional help',
    instructions: `The intake flow is complete! Provide a closing summary:
1. Recap what was accomplished:
   - Intake completed
   - Documents checklist provided
   - Matched with [Tax Pro Name]
   - Appointment scheduled for [date/time]
   - Reminders set up
2. Thank the user for their time
3. Provide contact information for questions
4. Wish them well with their tax preparation

The conversation can continue for follow-up questions, but the main flow is complete.`,
    suggestedTools: ['get_client', 'get_client_summary'],
    completionCheck: () => ({
      canProceed: true,
      blockers: [],
    }),
  },
};

/**
 * Initialize a new conversation flow
 */
export function initializeFlow(clientId: string, sessionId: string): ConversationFlowState {
  const state: ConversationFlowState = {
    clientId,
    sessionId,
    currentStage: 'welcome',
    completedStages: [],
    stageData: {} as Record<ConversationStage, unknown>,
    startedAt: new Date(),
    lastActivityAt: new Date(),
    summaryConfirmed: false,
  };

  activeFlows.set(clientId, state);
  return state;
}

/**
 * Get the current flow state for a client
 */
export function getFlowState(clientId: string): ConversationFlowState | null {
  return activeFlows.get(clientId) || null;
}

/**
 * Get or create flow state
 */
export function getOrCreateFlowState(clientId: string, sessionId: string): ConversationFlowState {
  const existing = activeFlows.get(clientId);
  if (existing) {
    existing.lastActivityAt = new Date();
    return existing;
  }
  return initializeFlow(clientId, sessionId);
}

/**
 * Get current flow status and what to do next
 */
export function getFlowStatus(clientId: string): FlowActionResult | null {
  const state = activeFlows.get(clientId);
  if (!state) {
    return null;
  }

  const client = db.getClient(clientId);
  const config = STAGE_CONFIG[state.currentStage];
  const completionResult = config.completionCheck(state, client || undefined);

  const currentIndex = FLOW_SEQUENCE.indexOf(state.currentStage);
  const progress = {
    current: currentIndex + 1,
    total: FLOW_SEQUENCE.length,
    percentage: Math.round(((currentIndex + 1) / FLOW_SEQUENCE.length) * 100),
  };

  return {
    currentStage: state.currentStage,
    nextAction: config.nextAction,
    instructions: config.instructions,
    canProceed: completionResult.canProceed,
    blockers: completionResult.blockers,
    suggestedTools: config.suggestedTools,
    progress,
  };
}

/**
 * Mark a stage as complete and advance to the next stage
 */
export function advanceFlow(
  clientId: string,
  stageData?: Record<string, unknown>
): FlowActionResult | null {
  const state = activeFlows.get(clientId);
  if (!state) {
    return null;
  }

  const client = db.getClient(clientId);
  const currentConfig = STAGE_CONFIG[state.currentStage];
  const completionResult = currentConfig.completionCheck(state, client || undefined);

  // Store any stage data
  if (stageData) {
    state.stageData[state.currentStage] = {
      ...(state.stageData[state.currentStage] as Record<string, unknown> || {}),
      ...stageData,
    };
  }

  // Re-check completion after storing data
  const updatedResult = currentConfig.completionCheck(state, client || undefined);
  
  if (updatedResult.canProceed) {
    // Mark current stage as complete
    if (!state.completedStages.includes(state.currentStage)) {
      state.completedStages.push(state.currentStage);
    }

    // Move to next stage
    const currentIndex = FLOW_SEQUENCE.indexOf(state.currentStage);
    if (currentIndex < FLOW_SEQUENCE.length - 1) {
      state.currentStage = FLOW_SEQUENCE[currentIndex + 1];
    }

    state.lastActivityAt = new Date();
    activeFlows.set(clientId, state);
  }

  return getFlowStatus(clientId);
}

/**
 * Update flow state with specific data
 */
export function updateFlowState(
  clientId: string,
  updates: Partial<ConversationFlowState>
): ConversationFlowState | null {
  const state = activeFlows.get(clientId);
  if (!state) {
    return null;
  }

  Object.assign(state, updates, { lastActivityAt: new Date() });
  activeFlows.set(clientId, state);
  return state;
}

/**
 * Mark summary as confirmed
 */
export function confirmSummary(clientId: string): FlowActionResult | null {
  const state = activeFlows.get(clientId);
  if (!state) {
    return null;
  }

  state.summaryConfirmed = true;
  state.stageData.summary_confirmation = { confirmed: true };
  
  return advanceFlow(clientId);
}

/**
 * Set scheduling preferences
 */
export function setSchedulingPreferences(
  clientId: string,
  preferences: {
    preferredDates: string[];
    preferredTimes: string[];
    appointmentType: 'virtual' | 'in_person';
  }
): FlowActionResult | null {
  const state = activeFlows.get(clientId);
  if (!state) {
    return null;
  }

  state.preferredSchedule = preferences;
  state.stageData.availability_inquiry = { collected: true, preferences };
  
  return advanceFlow(clientId);
}

/**
 * Set selected tax professional
 */
export function setSelectedTaxPro(clientId: string, taxProId: string): FlowActionResult | null {
  const state = activeFlows.get(clientId);
  if (!state) {
    return null;
  }

  state.selectedTaxProId = taxProId;
  state.stageData.taxpro_routing = { selected: true, taxProId };
  
  return advanceFlow(clientId);
}

/**
 * Get a formatted display of the current flow progress
 */
export function getFlowProgressDisplay(clientId: string): string {
  const state = activeFlows.get(clientId);
  if (!state) {
    return 'No active conversation flow found.';
  }

  const currentIndex = FLOW_SEQUENCE.indexOf(state.currentStage);
  let display = '## Conversation Flow Progress\n\n';
  
  FLOW_SEQUENCE.forEach((stage, index) => {
    const config = STAGE_CONFIG[stage];
    let status: string;
    
    if (state.completedStages.includes(stage)) {
      status = '✅';
    } else if (index === currentIndex) {
      status = '🔵';
    } else {
      status = '⬜';
    }

    display += `${status} **${index + 1}. ${stage.replace(/_/g, ' ').toUpperCase()}**\n`;
    display += `   ${config.description}\n\n`;
  });

  const percentage = Math.round(((currentIndex + 1) / FLOW_SEQUENCE.length) * 100);
  display += `\n**Progress:** ${percentage}% complete`;

  return display;
}

/**
 * Auto-detect and update flow stage based on client/session state
 * This syncs the flow with actual progress in case of any disconnects
 */
export function syncFlowWithState(clientId: string, sessionId: string): ConversationFlowState {
  const client = db.getClient(clientId);
  let state = activeFlows.get(clientId);

  if (!state) {
    state = initializeFlow(clientId, sessionId);
  }

  // Auto-detect stage based on what's been completed
  if (client) {
    // If intake is completed but not confirmed, we're at summary review
    if (client.intakeCompleted && !state.summaryConfirmed) {
      if (!state.completedStages.includes('welcome')) {
        state.completedStages.push('welcome');
      }
      if (!state.completedStages.includes('intake_questions')) {
        state.completedStages.push('intake_questions');
      }
      if (state.currentStage === 'welcome' || state.currentStage === 'intake_questions') {
        state.currentStage = 'summary_review';
      }
    }

    // If there's a document checklist, that stage is done
    if (client.documentsCollected.length > 0 || client.documentsPending.length > 0) {
      state.stageData.document_checklist = { generated: true };
    }

    // If there's an assigned tax pro
    if (client.assignedTaxPro) {
      state.selectedTaxProId = client.assignedTaxPro;
    }

    // If there's an appointment
    if (client.appointmentId) {
      if (!state.completedStages.includes('appointment_scheduling')) {
        state.completedStages.push('appointment_scheduling');
      }
    }
  }

  state.lastActivityAt = new Date();
  activeFlows.set(clientId, state);
  return state;
}

/**
 * Get comprehensive instructions for the AI on what to do next
 */
export function getNextActionInstructions(clientId: string): string {
  const status = getFlowStatus(clientId);
  if (!status) {
    return `No active flow found. Start a new intake session with 'start_intake' tool.`;
  }

  let instructions = `## Current Flow Stage: ${status.currentStage.replace(/_/g, ' ').toUpperCase()}\n\n`;
  instructions += `**Progress:** ${status.progress.percentage}% (Step ${status.progress.current} of ${status.progress.total})\n\n`;
  instructions += `### What to do next:\n${status.nextAction}\n\n`;
  instructions += `### Detailed Instructions:\n${status.instructions}\n\n`;
  
  if (status.suggestedTools && status.suggestedTools.length > 0) {
    instructions += `### Suggested Tools:\n`;
    status.suggestedTools.forEach(tool => {
      instructions += `- \`${tool}\`\n`;
    });
  }

  if (status.blockers && status.blockers.length > 0) {
    instructions += `\n### Blockers (resolve before proceeding):\n`;
    status.blockers.forEach(blocker => {
      instructions += `- ⚠️ ${blocker}\n`;
    });
  }

  return instructions;
}
