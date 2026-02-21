/**
 * Flow Management UI Formatter
 *
 * Transforms conversation flow state and progress data into
 * structured UIResponse objects with stage indicators and next-step actions.
 */
import type { UIResponse } from '../types.js';
import type { ConversationFlowState, FlowActionResult } from '../../types/index.js';
/** Format get_conversation_flow response. */
export declare function formatFlowStatus(flowResult: FlowActionResult, instructions: string, clientId: string): UIResponse;
/** Format advance_conversation_flow response. */
export declare function formatFlowAdvanced(flowResult: FlowActionResult, instructions: string, clientId: string): UIResponse;
/** Format confirm_intake_summary response. */
export declare function formatSummaryConfirmed(flowResult: FlowActionResult, instructions: string, clientId: string): UIResponse;
/** Format set_scheduling_preferences response. */
export declare function formatSchedulingPreferences(preferences: {
    preferredDates: string[];
    preferredTimes: string[];
    appointmentType: 'virtual' | 'in_person';
}, instructions: string, clientId: string): UIResponse;
/** Format select_tax_professional response. */
export declare function formatTaxProSelected(taxProName: string, taxProId: string, instructions: string, clientId: string): UIResponse;
/** Format get_flow_progress response. */
export declare function formatFlowProgress(state: ConversationFlowState): UIResponse;
//# sourceMappingURL=flow.d.ts.map