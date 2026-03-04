/**
 * Office Locator Service
 *
 * Hardcoded H&R Block office locations for the demo.
 * Returns nearby offices based on a simple keyword/city match.
 */
export interface OfficeLocation {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
    lat: number;
    lng: number;
    distanceMi: number;
    hours: string;
    nextAvailable: string;
    services: string[];
}
/**
 * Find nearby offices. In a real app this would use geolocation.
 * For the demo, returns all offices sorted by distance.
 */
export declare function findNearbyOffices(query?: string, limit?: number): OfficeLocation[];
/**
 * Get a specific office by ID.
 */
export declare function getOffice(officeId: string): OfficeLocation | undefined;
//# sourceMappingURL=offices.d.ts.map