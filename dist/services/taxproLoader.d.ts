import { TaxProfessional } from '../types/index.js';
/**
 * Load tax professionals from JSON file
 * @param jsonPath - Optional path to JSON file. Defaults to Dummy_data_taxpro.json in project root
 */
export declare function loadTaxProsFromJSON(jsonPath?: string): TaxProfessional[];
/**
 * Backward-compatible CSV loader (kept for compatibility and as fallback).
 * Prefer `loadTaxProsFromJSON`.
 */
export declare function loadTaxProsFromCSV(csvPath?: string): TaxProfessional[];
/**
 * Extended tax pro info with CSV-specific fields
 * Used for additional routing logic if needed
 */
export interface ExtendedTaxProInfo {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    yearsExperience: number;
    complexityRange: {
        min: number;
        max: number;
    };
    rawSpecializations: string[];
}
/**
 * Load extended info for all tax pros (for advanced routing)
 */
export declare function loadExtendedTaxProInfo(csvPath?: string): Map<string, ExtendedTaxProInfo>;
//# sourceMappingURL=taxproLoader.d.ts.map