import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
// ES Module compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/**
 * Simple CSV parser - no external dependencies needed
 */
function parseCSV(content) {
    const lines = content.trim().split('\n');
    if (lines.length < 2)
        return [];
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const values = [];
        let current = '';
        let inQuotes = false;
        // Handle quoted fields with commas
        for (const char of lines[i]) {
            if (char === '"') {
                inQuotes = !inQuotes;
            }
            else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            }
            else {
                current += char;
            }
        }
        values.push(current.trim());
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        rows.push(row);
    }
    return rows;
}
function readFirstExistingFile(possiblePaths) {
    for (const tryPath of possiblePaths) {
        try {
            if (fs.existsSync(tryPath)) {
                return { content: fs.readFileSync(tryPath, 'utf-8'), usedPath: tryPath };
            }
        }
        catch {
            // Continue to next path
        }
    }
    return null;
}
function parseTaxProJson(content) {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed))
        return [];
    return parsed;
}
/**
 * Map CSV specializations to internal Specialization type
 */
function mapSpecializations(csvSpecs) {
    const specMap = {
        'individual returns': 'individual',
        'self-employment': 'self_employment',
        'small business': 'small_business',
        'investments': 'investments',
        'real estate': 'real_estate',
        'cryptocurrency': 'crypto',
        'foreign income': 'foreign_income',
        'estate planning': 'estate_planning',
        'audit representation': 'audit_representation',
    };
    const specs = (Array.isArray(csvSpecs) ? csvSpecs : csvSpecs.split(','))
        .map(s => s.trim().toLowerCase())
        .filter(Boolean);
    const mapped = [];
    for (const spec of specs) {
        const mapped_spec = specMap[spec];
        if (mapped_spec) {
            mapped.push(mapped_spec);
        }
        else {
            // Try partial matching
            for (const [key, value] of Object.entries(specMap)) {
                if (spec.includes(key) || key.includes(spec)) {
                    if (!mapped.includes(value)) {
                        mapped.push(value);
                    }
                    break;
                }
            }
        }
    }
    // Default to individual if no matches
    if (mapped.length === 0) {
        mapped.push('individual');
    }
    return mapped;
}
/**
 * Determine max complexity level based on complexity range
 */
function determineMaxComplexity(minLevel, maxLevel) {
    // Based on COMPLEXITY_THRESHOLDS in routing.ts:
    // simple: 0-20, moderate: 21-50, complex: 51-80, expert: 81+
    if (maxLevel >= 81)
        return 'expert';
    if (maxLevel >= 51)
        return 'complex';
    if (maxLevel >= 21)
        return 'moderate';
    return 'simple';
}
/**
 * Load tax professionals from JSON file
 * @param jsonPath - Optional path to JSON file. Defaults to Dummy_data_taxpro.json in project root
 */
export function loadTaxProsFromJSON(jsonPath) {
    const possiblePaths = [
        jsonPath,
        path.join(process.cwd(), 'Dummy_data_taxpro.json'),
        path.join(process.cwd(), 'data', 'Dummy_data_taxpro.json'),
        path.join(__dirname, '..', '..', 'Dummy_data_taxpro.json'),
        path.join(__dirname, '..', '..', '..', 'Dummy_data_taxpro.json'),
    ].filter(Boolean);
    const found = readFirstExistingFile(possiblePaths);
    if (!found) {
        console.warn('Tax pros JSON file not found, falling back to CSV. Searched:', possiblePaths);
        return loadTaxProsFromCSV();
    }
    console.log(`Loading tax professionals from: ${found.usedPath}`);
    let rows = [];
    try {
        rows = parseTaxProJson(found.content);
    }
    catch (err) {
        console.warn('Failed to parse tax pros JSON, falling back to CSV:', err);
        return loadTaxProsFromCSV();
    }
    const taxPros = [];
    for (const row of rows) {
        if (!row?.is_active)
            continue;
        const minComplexity = Number(row.complexity_level_min ?? 0);
        const maxComplexity = Number(row.complexity_level_max ?? 100);
        const appointmentsPerDay = Number(row.appointments_per_day ?? 8);
        taxPros.push({
            id: String(row.tax_pro_id),
            name: `${row.first_name} ${row.last_name}`,
            email: row.email,
            specializations: mapSpecializations(row.specializations),
            maxComplexity: determineMaxComplexity(minComplexity, maxComplexity),
            currentLoad: 0,
            maxDailyAppointments: appointmentsPerDay,
            available: true,
            rating: Number(row.rating ?? 4.5),
        });
    }
    console.log(`Loaded ${taxPros.length} active tax professionals from JSON`);
    return taxPros;
}
/**
 * Backward-compatible CSV loader (kept for compatibility and as fallback).
 * Prefer `loadTaxProsFromJSON`.
 */
export function loadTaxProsFromCSV(csvPath) {
    const possiblePaths = [
        csvPath,
        path.join(process.cwd(), 'Dummy_data_taxpro.csv'),
        path.join(process.cwd(), 'data', 'Dummy_data_taxpro.csv'),
        path.join(__dirname, '..', '..', 'Dummy_data_taxpro.csv'),
        path.join(__dirname, '..', '..', '..', 'Dummy_data_taxpro.csv'),
    ].filter(Boolean);
    const found = readFirstExistingFile(possiblePaths);
    if (!found) {
        console.warn('Tax pros CSV file not found, using empty list. Searched:', possiblePaths);
        return [];
    }
    console.log(`Loading tax professionals from: ${found.usedPath}`);
    const rows = parseCSV(found.content);
    const taxPros = [];
    for (const row of rows) {
        if (row.is_active?.toUpperCase() !== 'TRUE')
            continue;
        const minComplexity = parseInt(row.complexity_level_min, 10) || 0;
        const maxComplexity = parseInt(row.complexity_level_max, 10) || 100;
        const appointmentsPerDay = parseInt(row.appointments_per_day, 10) || 8;
        taxPros.push({
            id: row.tax_pro_id,
            name: `${row.first_name} ${row.last_name}`,
            email: row.email,
            specializations: mapSpecializations(row.specializations),
            maxComplexity: determineMaxComplexity(minComplexity, maxComplexity),
            currentLoad: 0,
            maxDailyAppointments: appointmentsPerDay,
            available: true,
            rating: parseFloat(row.rating) || 4.5,
        });
    }
    console.log(`Loaded ${taxPros.length} active tax professionals from CSV`);
    return taxPros;
}
/**
 * Load extended info for all tax pros (for advanced routing)
 */
export function loadExtendedTaxProInfo(csvPath) {
    const infoMap = new Map();
    // Prefer JSON, fall back to CSV
    const jsonPaths = [
        csvPath,
        path.join(process.cwd(), 'Dummy_data_taxpro.json'),
        path.join(process.cwd(), 'data', 'Dummy_data_taxpro.json'),
    ].filter(Boolean);
    const foundJson = readFirstExistingFile(jsonPaths);
    if (foundJson) {
        try {
            const rows = parseTaxProJson(foundJson.content);
            for (const row of rows) {
                if (!row?.is_active)
                    continue;
                const rawSpecs = Array.isArray(row.specializations)
                    ? row.specializations
                    : String(row.specializations ?? '').split(',');
                infoMap.set(String(row.tax_pro_id), {
                    id: String(row.tax_pro_id),
                    firstName: row.first_name,
                    lastName: row.last_name,
                    phone: row.phone,
                    yearsExperience: Number(row.years_experience ?? 0),
                    complexityRange: {
                        min: Number(row.complexity_level_min ?? 0),
                        max: Number(row.complexity_level_max ?? 100),
                    },
                    rawSpecializations: rawSpecs.map(s => String(s).trim()).filter(Boolean),
                });
            }
            return infoMap;
        }
        catch {
            // If JSON parse fails, continue to CSV fallback
        }
    }
    const csvPaths = [
        csvPath,
        path.join(process.cwd(), 'Dummy_data_taxpro.csv'),
        path.join(process.cwd(), 'data', 'Dummy_data_taxpro.csv'),
    ].filter(Boolean);
    const foundCsv = readFirstExistingFile(csvPaths);
    if (!foundCsv)
        return infoMap;
    const rows = parseCSV(foundCsv.content);
    for (const row of rows) {
        if (row.is_active?.toUpperCase() !== 'TRUE')
            continue;
        infoMap.set(row.tax_pro_id, {
            id: row.tax_pro_id,
            firstName: row.first_name,
            lastName: row.last_name,
            phone: row.phone,
            yearsExperience: parseInt(row.years_experience, 10) || 0,
            complexityRange: {
                min: parseInt(row.complexity_level_min, 10) || 0,
                max: parseInt(row.complexity_level_max, 10) || 100,
            },
            rawSpecializations: row.specializations.split(',').map(s => s.trim()),
        });
    }
    return infoMap;
}
//# sourceMappingURL=taxproLoader.js.map