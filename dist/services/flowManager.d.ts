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
import { ConversationFlowState, FlowActionResult } from '../types/index.js';
/**
 * Initialize a new conversation flow
 */
export declare function initializeFlow(clientId: string, sessionId: string): ConversationFlowState;
/**
 * Get the current flow state for a client
 */
export declare function getFlowState(clientId: string): ConversationFlowState | null;
/**
 * Get or create flow state
 */
export declare function getOrCreateFlowState(clientId: string, sessionId: string): ConversationFlowState;
/**
 * Get current flow status and what to do next
 */
export declare function getFlowStatus(clientId: string): FlowActionResult | null;
/**
 * Mark a stage as complete and advance to the next stage
 */
export declare function advanceFlow(clientId: string, stageData?: Record<string, unknown>): FlowActionResult | null;
/**
 * Update flow state with specific data
 */
export declare function updateFlowState(clientId: string, updates: Partial<ConversationFlowState>): ConversationFlowState | null;
/**
 * Mark summary as confirmed
 */
export declare function confirmSummary(clientId: string): FlowActionResult | null;
/**
 * Set scheduling preferences
 */
export declare function setSchedulingPreferences(clientId: string, preferences: {
    preferredDates: string[];
    preferredTimes: string[];
    appointmentType: 'virtual' | 'in_person';
}): FlowActionResult | null;
/**
 * Set selected tax professional
 */
export declare function setSelectedTaxPro(clientId: string, taxProId: string): FlowActionResult | null;
/**
 * Get a formatted display of the current flow progress
 */
export declare function getFlowProgressDisplay(clientId: string): string;
/**
 * Auto-detect and update flow stage based on client/session state
 * This syncs the flow with actual progress in case of any disconnects
 */
export declare function syncFlowWithState(clientId: string, sessionId: string): ConversationFlowState;
/**
 * Get comprehensive instructions for the AI on what to do next
 */
export declare function getNextActionInstructions(clientId: string): string;
//# sourceMappingURL=flowManager.d.ts.map