/**
 * Checklist Domain UI Formatter
 *
 * Transforms document checklist data into structured UIResponse objects
 * with categorized sections, collection status, and mark-as-collected actions.
 */
import type { UIResponse } from '../types.js';
import type { DocumentChecklist, DocumentItem } from '../../types/index.js';
/** Format the generate_document_checklist / get_document_checklist response. */
export declare function formatDocumentChecklist(checklist: DocumentChecklist, toolName?: 'generate_document_checklist' | 'get_document_checklist'): UIResponse;
/** Format mark_document_collected response. */
export declare function formatDocumentCollected(result: {
    success: boolean;
    document?: DocumentItem;
    message?: string;
}, clientId: string, documentId: string): UIResponse;
/** Format get_pending_documents response. */
export declare function formatPendingDocuments(pending: DocumentItem[], clientId: string): UIResponse;
//# sourceMappingURL=checklist.d.ts.map