/**
 * Intake Domain UI Formatter
 *
 * Transforms raw intake service results into structured UIResponse objects
 * with cards, progress bars, and interactive action buttons.
 */
import type { UIResponse } from '../types.js';
import type { ClientProfile, IntakeStep } from '../../types/index.js';
/** Format the start_intake tool response. */
export declare function formatIntakeStart(result: {
    session: {
        id: string;
    };
    client: {
        id: string;
    };
    currentStep: IntakeStep;
    nextQuestion: string;
}, flowStage?: string): UIResponse;
/** Format the process_intake_response tool response. */
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
}): UIResponse;
/** Format the get_intake_progress tool response. */
export declare function formatIntakeProgress(progress: {
    currentStep: IntakeStep;
    completedSteps: IntakeStep[];
    totalSteps: number;
    percentComplete: number;
    remainingSteps: IntakeStep[];
} | null, sessionId: string): UIResponse;
/** Format the get_client_summary tool response. */
export declare function formatClientSummary(client: ClientProfile, summaryText: string): UIResponse;
//# sourceMappingURL=intake.d.ts.map