import { ClientProfile, TaxProfessional, ComplexityLevel, Specialization, Appointment } from '../types/index.js';
export declare function calculateComplexityScore(client: ClientProfile): number;
export declare function getComplexityLevel(score: number): ComplexityLevel;
export declare function getRequiredSpecializations(client: ClientProfile): Specialization[];
export declare function findBestTaxPro(client: ClientProfile): {
    taxPro: TaxProfessional | null;
    reason: string;
    alternates: TaxProfessional[];
};
export declare function routeClientToTaxPro(clientId: string): {
    success: boolean;
    taxPro?: TaxProfessional;
    message: string;
    alternates?: TaxProfessional[];
};
export declare function createAppointment(clientId: string, taxProId: string, scheduledAt: Date, type?: 'virtual' | 'in_person'): Appointment;
export declare function getAppointmentEstimate(clientId: string): {
    estimatedDuration: number;
    savings: number;
    complexityLevel: ComplexityLevel;
    message: string;
};
export declare function getTaxProRecommendations(clientId: string): string;
//# sourceMappingURL=routing.d.ts.map