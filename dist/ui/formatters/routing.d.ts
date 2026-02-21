/**
 * Routing & Appointment Domain UI Formatter
 *
 * Transforms complexity scoring, tax pro matching, and appointment
 * data into structured UIResponse objects with pro cards, estimate
 * widgets, and booking confirmation cards.
 */
import type { UIResponse } from '../types.js';
import type { ClientProfile, TaxProfessional, Appointment, ComplexityLevel } from '../../types/index.js';
/** Format calculate_complexity response. */
export declare function formatComplexityScore(clientId: string, score: number, level: ComplexityLevel): UIResponse;
/** Format route_to_tax_pro response. */
export declare function formatRoutingResult(result: {
    success: boolean;
    message: string;
    taxPro?: TaxProfessional;
    clientId?: string;
}, clientId: string): UIResponse;
/** Format get_tax_pro_recommendations response. */
export declare function formatTaxProRecommendations(clientId: string, recommended: TaxProfessional | null, reason: string, alternates: TaxProfessional[]): UIResponse;
/** Format get_appointment_estimate response. */
export declare function formatAppointmentEstimate(estimate: {
    estimatedDuration: number;
    savings: number;
    complexityLevel: ComplexityLevel;
    message: string;
}, clientId: string): UIResponse;
/** Format create_appointment response. */
export declare function formatAppointmentCreated(appointment: Appointment, taxPro: TaxProfessional | null, remindersScheduled: number): UIResponse;
/** Format list_tax_professionals response. */
export declare function formatTaxProList(taxPros: TaxProfessional[]): UIResponse;
/** Format get_client (profile) response. */
export declare function formatClientProfile(client: ClientProfile): UIResponse;
//# sourceMappingURL=routing.d.ts.map