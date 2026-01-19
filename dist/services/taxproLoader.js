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
    const specs = csvSpecs.split(',').map(s => s.trim().toLowerCase());
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
 * Load tax professionals from CSV file
 * @param csvPath - Optional path to CSV file. Defaults to Dummy_data_taxpro.csv in project root
 */
export function loadTaxProsFromCSV(csvPath) {
    // Try multiple possible locations for the CSV file
    const possiblePaths = [
        csvPath,
        path.join(process.cwd(), 'Dummy_data_taxpro.csv'),
        path.join(process.cwd(), 'data', 'Dummy_data_taxpro.csv'),
        path.join(__dirname, '..', '..', 'Dummy_data_taxpro.csv'),
        path.join(__dirname, '..', '..', '..', 'Dummy_data_taxpro.csv'),
    ].filter(Boolean);
    let fileContent = null;
    let usedPath = '';
    for (const tryPath of possiblePaths) {
        try {
            if (fs.existsSync(tryPath)) {
                fileContent = fs.readFileSync(tryPath, 'utf-8');
                usedPath = tryPath;
                break;
            }
        }
        catch (err) {
            // Continue to next path
        }
    }
    if (!fileContent) {
        console.warn('Tax pros CSV file not found, using empty list. Searched:', possiblePaths);
        return [];
    }
    console.log(`Loading tax professionals from: ${usedPath}`);
    const rows = parseCSV(fileContent);
    const taxPros = [];
    for (const row of rows) {
        // Skip inactive tax pros
        if (row.is_active?.toUpperCase() !== 'TRUE') {
            continue;
        }
        const minComplexity = parseInt(row.complexity_level_min, 10) || 0;
        const maxComplexity = parseInt(row.complexity_level_max, 10) || 100;
        const appointmentsPerDay = parseInt(row.appointments_per_day, 10) || 8;
        const taxPro = {
            id: row.tax_pro_id,
            name: `${row.first_name} ${row.last_name}`,
            email: row.email,
            specializations: mapSpecializations(row.specializations),
            maxComplexity: determineMaxComplexity(minComplexity, maxComplexity),
            currentLoad: 0, // Start with no load
            maxDailyAppointments: appointmentsPerDay,
            available: true,
            rating: parseFloat(row.rating) || 4.5,
        };
        taxPros.push(taxPro);
    }
    console.log(`Loaded ${taxPros.length} active tax professionals from CSV`);
    return taxPros;
}
/**
 * Load extended info for all tax pros (for advanced routing)
 */
export function loadExtendedTaxProInfo(csvPath) {
    const possiblePaths = [
        csvPath,
        path.join(process.cwd(), 'Dummy_data_taxpro.csv'),
        path.join(process.cwd(), 'data', 'Dummy_data_taxpro.csv'),
    ].filter(Boolean);
    let fileContent = null;
    for (const tryPath of possiblePaths) {
        try {
            if (fs.existsSync(tryPath)) {
                fileContent = fs.readFileSync(tryPath, 'utf-8');
                break;
            }
        }
        catch (err) {
            // Continue to next path
        }
    }
    const infoMap = new Map();
    if (!fileContent)
        return infoMap;
    const rows = parseCSV(fileContent);
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