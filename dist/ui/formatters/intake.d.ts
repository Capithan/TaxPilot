/**
 * Intake Domain UI Formatter (v2 — Structured UI-First)
 *
 * Produces StructuredUIResponse objects with interactive form fields,
 * selection cards, and multi-select components so every intake step
 * presents proper input controls from the very start.
 *
 * Follows OpenAI UX Principles:
 *   - "Design for conversational entry" — proper input affordances
 *   - "Helpful UI only" — every widget advances the current task
 *   - "Optimize for conversation, not navigation" — concise, inline forms
 */
import type { ClientProfile, IntakeStep } from '../../types/index.js';
/** Format the start_intake tool response — shows the first step's form immediately. */
export declare function formatIntakeStart(result: {
    session: {
        id: string;
    };
    client: {
        id: string;
    };
    currentStep: IntakeStep;
    nextQuestion: string;
}, flowStage?: string): Record<string, unknown>;
/** Format the process_intake_response tool response — shows next step's form. */
export declare function formatIntakeResponse(result: {
    success: boolean;
    nextQuestion?: string;
    currentStep?: IntakeStep;
    stepCompleted?: boolean;
    intakeCompleted?: boolean;
    client?: ClientProfile;
    message?: string;
}, sessionId: string, progressInfo?: {
    completedSteps: string[];
    totalSteps: number;
    percentComplete: number;
}): Record<string, unknown>;
/** Format the get_intake_progress tool response. */
export declare function formatIntakeProgress(progress: {
    currentStep: IntakeStep;
    completedSteps: IntakeStep[];
    totalSteps: number;
    percentComplete: number;
    remainingSteps: IntakeStep[];
} | null, sessionId: string): Record<string, unknown>;
/** Format the get_client_summary tool response. */
export declare function formatClientSummary(client: ClientProfile, summaryText: string): Record<string, unknown>;
//# sourceMappingURL=intake.d.ts.map