import { ClientProfile, IntakeSession, IntakeStep } from '../types/index.js';
export declare function startIntakeSession(clientId?: string): {
    session: IntakeSession;
    client: ClientProfile;
    nextQuestion: string;
    currentStep: IntakeStep;
};
/**
 * Process a structured form submission from the UI.
 *
 * Accepts form field values, selection card choices, or multi-select
 * selections and maps them directly onto the client profile before
 * advancing to the next intake step.
 */
export declare function processStructuredIntakeResponse(sessionId: string, step: string, formData?: Record<string, string>, selection?: string, selections?: string[]): {
    success: boolean;
    nextQuestion?: string;
    currentStep?: IntakeStep;
    stepCompleted?: boolean;
    intakeCompleted?: boolean;
    client?: ClientProfile;
    message?: string;
};
export declare function processIntakeResponse(sessionId: string, answer: string): {
    success: boolean;
    nextQuestion?: string;
    currentStep?: IntakeStep;
    stepCompleted?: boolean;
    intakeCompleted?: boolean;
    client?: ClientProfile;
    message?: string;
};
export declare function getIntakeProgress(sessionId: string): {
    currentStep: IntakeStep;
    completedSteps: IntakeStep[];
    totalSteps: number;
    percentComplete: number;
    remainingSteps: IntakeStep[];
} | null;
export declare function getIntakeSummary(clientId: string): string;
//# sourceMappingURL=intake.d.ts.map