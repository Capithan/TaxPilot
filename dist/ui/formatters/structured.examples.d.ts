/**
 * Structured UI Response Examples
 *
 * Demonstrates how backend formatters produce StructuredUIResponse objects
 * for each screen state. These are the JSON payloads the ChatGPT assistant
 * includes in its responses for the frontend to render.
 */
import type { StructuredUIResponse } from '../components.types.js';
export declare function buildHomeScreen(): StructuredUIResponse;
export declare function buildServiceSelection(): StructuredUIResponse;
export declare function buildIntakePersonalInfo(sessionId: string, clientId: string): StructuredUIResponse;
export declare function buildIntakeFilingStatus(sessionId: string): StructuredUIResponse;
export declare function buildSummaryReview(clientId: string): StructuredUIResponse;
export declare function buildDocumentChecklist(clientId: string): StructuredUIResponse;
export declare function buildTaxProRecommendations(clientId: string): StructuredUIResponse;
export declare function buildAppointmentBooking(clientId: string, taxProId: string): StructuredUIResponse;
export declare function buildAppointmentConfirmation(clientId: string, appointmentId: string): StructuredUIResponse;
//# sourceMappingURL=structured.examples.d.ts.map