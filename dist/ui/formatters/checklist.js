/**
 * Checklist Domain UI Formatter
 *
 * Transforms document checklist data into structured UIResponse objects
 * with categorized sections, collection status, and mark-as-collected actions.
 */
import { ui } from '../builders.js';
const CATEGORY_LABELS = {
    identity: { label: 'Identity Documents', icon: '🪪' },
    income: { label: 'Income Documents', icon: '💰' },
    expenses: { label: 'Expense Records', icon: '🧾' },
    investments: { label: 'Investment Documents', icon: '📈' },
    property: { label: 'Property Documents', icon: '🏠' },
    business: { label: 'Business Documents', icon: '🏢' },
    healthcare: { label: 'Healthcare Documents', icon: '🏥' },
    education: { label: 'Education Documents', icon: '🎓' },
    other: { label: 'Other Documents', icon: '📄' },
};
function docToListItem(doc, clientId) {
    return {
        text: doc.name,
        description: doc.description,
        icon: doc.collected ? '✅' : doc.required ? '⚠️' : '📋',
        status: doc.collected ? 'done' : doc.required ? 'required' : 'optional',
        actions: doc.collected ? [] : [
            ui.action('Mark Collected', 'mark_document_collected', { clientId, documentId: doc.id }, 'success', '✅'),
        ],
    };
}
/** Format the generate_document_checklist / get_document_checklist response. */
export function formatDocumentChecklist(checklist, toolName = 'generate_document_checklist') {
    const total = checklist.documents.length;
    const collected = checklist.documents.filter(d => d.collected).length;
    const required = checklist.documents.filter(d => d.required && !d.collected).length;
    const builder = ui.response('document_checklist', toolName)
        .title('📋 Your Document Checklist')
        .subtitle(`${collected}/${total} collected · ${required} required remaining`)
        .progress(collected, total, `${collected} of ${total} documents`);
    if (collected === total) {
        builder.banner('All documents collected! You\'re ready for your appointment.', 'success', {
            icon: '🎉',
            confetti: true,
        });
    }
    else if (required > 0) {
        builder.banner(`${required} required document${required > 1 ? 's' : ''} still needed.`, 'warning', { icon: '⚠️' });
    }
    // Group by category
    const byCategory = new Map();
    checklist.documents.forEach(doc => {
        const list = byCategory.get(doc.category) || [];
        list.push(doc);
        byCategory.set(doc.category, list);
    });
    byCategory.forEach((docs, category) => {
        const catInfo = CATEGORY_LABELS[category] || { label: category, icon: '📄' };
        const catCollected = docs.filter(d => d.collected).length;
        builder.section(catInfo.label, sb => {
            sb.icon(catInfo.icon);
            sb.counter(catCollected, docs.length);
            docs.forEach(doc => {
                const item = docToListItem(doc, checklist.clientId);
                sb.item(item.text, {
                    description: item.description,
                    icon: item.icon,
                    status: item.status,
                    actions: item.actions,
                });
            });
        });
    });
    // Global actions
    builder.action('View Pending Only', 'get_pending_documents', {
        clientId: checklist.clientId,
    }, 'secondary', '📋');
    if (collected < total) {
        builder.action('Set Up Reminders', 'create_document_reminders', {
            clientId: checklist.clientId,
        }, 'primary', '🔔');
    }
    builder.data({
        clientId: checklist.clientId,
        totalDocuments: total,
        collected,
        pending: total - collected,
        requiredPending: required,
    });
    builder.nextTools(collected < total ? 'mark_document_collected' : 'route_to_tax_pro', 'get_pending_documents');
    builder.flowStage('document_checklist');
    return builder.build();
}
/** Format mark_document_collected response. */
export function formatDocumentCollected(result, clientId, documentId) {
    const builder = ui.response('document_collected', 'mark_document_collected')
        .title('✅ Document Collected')
        .banner('Document marked as received!', 'success', { icon: '✅' });
    builder.card('Collected Document', c => {
        c.icon('📄')
            .badge('Collected', 'success', '✅')
            .field('Document ID', documentId, '🔑')
            .field('Client', clientId, '👤');
    });
    builder.action('View Full Checklist', 'get_document_checklist', {
        clientId,
    }, 'secondary', '📋');
    builder.action('View Remaining', 'get_pending_documents', {
        clientId,
    }, 'primary', '📋');
    builder.data({ clientId, documentId, success: true });
    builder.nextTools('get_document_checklist', 'get_pending_documents');
    return builder.build();
}
/** Format get_pending_documents response. */
export function formatPendingDocuments(pending, clientId) {
    if (pending.length === 0) {
        return ui.response('pending_documents', 'get_pending_documents')
            .title('✅ All Documents Collected!')
            .banner('You\'re all set — every required document has been received.', 'success', {
            icon: '🎉',
            confetti: true,
        })
            .action('Find a Tax Pro', 'route_to_tax_pro', { clientId }, 'primary', '👨‍💼')
            .action('Get Appointment Estimate', 'get_appointment_estimate', { clientId }, 'secondary', '⏱️')
            .data({ clientId, pendingCount: 0 })
            .nextTools('route_to_tax_pro', 'set_scheduling_preferences')
            .build();
    }
    const builder = ui.response('pending_documents', 'get_pending_documents')
        .title(`📋 ${pending.length} Document${pending.length > 1 ? 's' : ''} Remaining`)
        .subtitle('These documents are still needed');
    // Group pending by category
    const byCategory = new Map();
    pending.forEach(doc => {
        const list = byCategory.get(doc.category) || [];
        list.push(doc);
        byCategory.set(doc.category, list);
    });
    byCategory.forEach((docs, category) => {
        const catInfo = CATEGORY_LABELS[category] || { label: category, icon: '📄' };
        builder.section(catInfo.label, sb => {
            sb.icon(catInfo.icon);
            docs.forEach(doc => {
                sb.item(doc.name, {
                    description: doc.description,
                    icon: doc.required ? '⚠️' : '📋',
                    status: doc.required ? 'required' : 'optional',
                    actions: [
                        ui.action('Mark Collected', 'mark_document_collected', {
                            clientId,
                            documentId: doc.id,
                        }, 'success', '✅'),
                    ],
                });
            });
        });
    });
    builder.action('Set Up Reminders', 'create_document_reminders', {
        clientId,
    }, 'primary', '🔔');
    builder.data({ clientId, pendingCount: pending.length });
    builder.nextTools('mark_document_collected', 'create_document_reminders');
    return builder.build();
}
//# sourceMappingURL=checklist.js.map