import { DocumentChecklist, DocumentItem } from '../types/index.js';
export declare function generateDocumentChecklist(clientId: string): DocumentChecklist;
export declare function getDocumentChecklist(clientId: string): DocumentChecklist | null;
export declare function markDocumentCollected(clientId: string, documentId: string): {
    success: boolean;
    message: string;
};
export declare function formatChecklistForDisplay(checklist: DocumentChecklist): string;
export declare function getPendingDocuments(clientId: string): DocumentItem[];
export declare function getGigEconomyDocuments(employers: string[]): DocumentItem[];
//# sourceMappingURL=checklist.d.ts.map