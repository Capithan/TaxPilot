/**
 * Office Locator Service
 *
 * Hardcoded H&R Block office locations for the demo.
 * Returns nearby offices based on a simple keyword/city match.
 */
// Demo offices — mix of real-ish H&R Block locations
const OFFICES = [
    {
        id: 'office-001',
        name: '9728-C DYER',
        address: '9728-C Dyer St',
        city: 'El Paso',
        state: 'TX',
        zip: '79924',
        phone: '915-751-1490',
        lat: 31.8566,
        lng: -106.4348,
        distanceMi: 0.93,
        hours: '9:00am - 7:00pm',
        nextAvailable: 'Mar. 5',
        services: ['Tax Preparation', 'Tax Planning', 'Audit Support'],
    },
    {
        id: 'office-002',
        name: 'RUSHFAIR SHOPPING CENTER',
        address: '10060 Rushing Ste 10',
        city: 'El Paso',
        state: 'TX',
        zip: '79924',
        phone: '915-751-6220',
        lat: 31.8400,
        lng: -106.4300,
        distanceMi: 1.7,
        hours: '9:00am - 7:00pm',
        nextAvailable: 'Mar. 6',
        services: ['Tax Preparation', 'Tax Planning'],
    },
    {
        id: 'office-003',
        name: 'SURETY VILLAGE SHOPPING CENTER',
        address: '9521 Viscount Blvd Ste A3',
        city: 'El Paso',
        state: 'TX',
        zip: '79925',
        phone: '915-593-4288',
        lat: 31.8167,
        lng: -106.3900,
        distanceMi: 1.97,
        hours: '9:00am - 7:00pm',
        nextAvailable: 'Mar. 5',
        services: ['Tax Preparation', 'Tax Planning', 'Bookkeeping'],
    },
    {
        id: 'office-004',
        name: 'GATEWAY EAST',
        address: '7512 Gateway East Blvd',
        city: 'El Paso',
        state: 'TX',
        zip: '79915',
        phone: '915-778-4440',
        lat: 31.7910,
        lng: -106.3700,
        distanceMi: 3.2,
        hours: '9:00am - 7:00pm',
        nextAvailable: 'Mar. 7',
        services: ['Tax Preparation', 'Audit Support'],
    },
    {
        id: 'office-005',
        name: 'MESA HILLS',
        address: '4708 N Mesa St',
        city: 'El Paso',
        state: 'TX',
        zip: '79912',
        phone: '915-544-7667',
        lat: 31.8050,
        lng: -106.4650,
        distanceMi: 4.1,
        hours: '9:00am - 8:00pm',
        nextAvailable: 'Mar. 5',
        services: ['Tax Preparation', 'Tax Planning', 'Audit Support', 'Bookkeeping'],
    },
    {
        id: 'office-006',
        name: 'DOWNTOWN MAIN',
        address: '221 N Kansas St Ste 100',
        city: 'El Paso',
        state: 'TX',
        zip: '79901',
        phone: '915-532-3150',
        lat: 31.7600,
        lng: -106.4450,
        distanceMi: 5.5,
        hours: '8:00am - 8:00pm',
        nextAvailable: 'Mar. 5',
        services: ['Tax Preparation', 'Tax Planning', 'Audit Support', 'Bookkeeping', 'Financial Planning'],
    },
];
/**
 * Find nearby offices. In a real app this would use geolocation.
 * For the demo, returns all offices sorted by distance.
 */
export function findNearbyOffices(query, limit = 6) {
    let results = [...OFFICES];
    // Simple keyword filter on city/name/address
    if (query) {
        const q = query.toLowerCase();
        results = results.filter((o) => o.city.toLowerCase().includes(q) ||
            o.name.toLowerCase().includes(q) ||
            o.address.toLowerCase().includes(q) ||
            o.state.toLowerCase().includes(q) ||
            o.zip.includes(q));
        // If no matches, return all (user may just want "offices near me")
        if (results.length === 0)
            results = [...OFFICES];
    }
    return results.sort((a, b) => a.distanceMi - b.distanceMi).slice(0, limit);
}
/**
 * Get a specific office by ID.
 */
export function getOffice(officeId) {
    return OFFICES.find((o) => o.id === officeId);
}
//# sourceMappingURL=offices.js.map