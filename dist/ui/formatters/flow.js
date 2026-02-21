/**
 * Flow Management UI Formatter
 *
 * Transforms conversation flow state and progress data into
 * structured UIResponse objects with stage indicators and next-step actions.
 */
import { ui } from '../builders.js';
// ─── Constants ───────────────────────────────────────────────────────────────
const STAGE_LABELS = {
    welcome: { label: 'Welcome', icon: '👋' },
    intake_questions: { label: 'Intake Questions', icon: '📝' },
    summary_review: { label: 'Summary Review', icon: '📄' },
    summary_confirmation: { label: 'Summary Confirmation', icon: '✅' },
    document_checklist: { label: 'Document Checklist', icon: '📋' },
    availability_inquiry: { label: 'Scheduling', icon: '📅' },
    taxpro_routing: { label: 'Tax Pro Matching', icon: '👨‍💼' },
    appointment_scheduling: { label: 'Appointment Booking', icon: '🗓️' },
    reminders_setup: { label: 'Reminders', icon: '🔔' },
    complete: { label: 'Complete', icon: '🎉' },
};
const FLOW_SEQUENCE = [
    'welcome', 'intake_questions', 'summary_review', 'summary_confirmation',
    'document_checklist', 'availability_inquiry', 'taxpro_routing',
    'appointment_scheduling', 'reminders_setup', 'complete',
];
function stageBadge(stage, completedStages, currentStage) {
    if (completedStages.includes(stage))
        return { text: 'Done', variant: 'success', icon: '✅' };
    if (stage === currentStage)
        return { text: 'Current', variant: 'info', icon: '🔵' };
    return { text: 'Upcoming', variant: 'neutral', icon: '⬜' };
}
// ─── Formatters ──────────────────────────────────────────────────────────────
/** Format get_conversation_flow response. */
export function formatFlowStatus(flowResult, instructions, clientId) {
    const stageInfo = STAGE_LABELS[flowResult.currentStage];
    const builder = ui.response('flow_status', 'get_conversation_flow')
        .title(`${stageInfo.icon} ${stageInfo.label}`)
        .subtitle(`Step ${flowResult.progress.current} of ${flowResult.progress.total}`)
        .progress(flowResult.progress.current, flowResult.progress.total, `${flowResult.progress.percentage}% complete`);
    builder.card('Current Stage', c => {
        c.icon(stageInfo.icon)
            .field('Stage', stageInfo.label, '📍')
            .field('Progress', `${flowResult.progress.percentage}%`, '📊')
            .field('Next Action', flowResult.nextAction, '➡️');
        if (flowResult.blockers && flowResult.blockers.length > 0) {
            c.section('Blockers', sb => {
                sb.icon('⚠️');
                flowResult.blockers.forEach(b => sb.item(b, { icon: '🚫', status: 'error' }));
            });
        }
    });
    // Suggested tools as actions
    if (flowResult.suggestedTools) {
        flowResult.suggestedTools.forEach(tool => {
            builder.action(tool.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), tool, { clientId }, 'primary');
        });
    }
    builder.message(instructions);
    builder.data({
        clientId,
        currentStage: flowResult.currentStage,
        progress: flowResult.progress,
        canProceed: flowResult.canProceed,
    });
    builder.nextTools(...(flowResult.suggestedTools || []));
    builder.flowStage(flowResult.currentStage);
    return builder.build();
}
/** Format advance_conversation_flow response. */
export function formatFlowAdvanced(flowResult, instructions, clientId) {
    const stageInfo = STAGE_LABELS[flowResult.currentStage];
    return ui.response('flow_advanced', 'advance_conversation_flow')
        .title('✅ Flow Advanced!')
        .subtitle(`Now at: ${stageInfo.label}`)
        .banner(`Moved to ${stageInfo.label}`, 'success', { icon: '✅' })
        .progress(flowResult.progress.current, flowResult.progress.total, `${flowResult.progress.percentage}% complete`)
        .message(instructions)
        .data({
        clientId,
        currentStage: flowResult.currentStage,
        progress: flowResult.progress,
    })
        .nextTools(...(flowResult.suggestedTools || []))
        .flowStage(flowResult.currentStage)
        .build();
}
/** Format confirm_intake_summary response. */
export function formatSummaryConfirmed(flowResult, instructions, clientId) {
    return ui.response('flow_advanced', 'confirm_intake_summary')
        .title('✅ Summary Confirmed!')
        .subtitle('Moving to document checklist')
        .banner('Great! Your information has been confirmed.', 'success', { icon: '✅' })
        .action('Generate Document Checklist', 'generate_document_checklist', {
        clientId,
    }, 'primary', '📋')
        .message(instructions)
        .data({ clientId, summaryConfirmed: true })
        .nextTools('generate_document_checklist')
        .flowStage('document_checklist')
        .build();
}
/** Format set_scheduling_preferences response. */
export function formatSchedulingPreferences(preferences, instructions, clientId) {
    return ui.response('scheduling_preferences', 'set_scheduling_preferences')
        .title('✅ Scheduling Preferences Saved')
        .banner('Your availability has been recorded!', 'success', { icon: '📅' })
        .card('Your Preferences', c => c
        .icon('📅')
        .badge('Saved', 'success', '✅')
        .field('Preferred Dates', preferences.preferredDates.join(', ') || 'Any', '📅')
        .field('Preferred Times', preferences.preferredTimes.join(', ') || 'Any', '🕐')
        .field('Type', preferences.appointmentType === 'virtual' ? '💻 Virtual' : '🏢 In Person', '📍'))
        .action('Find Best Tax Pro', 'route_to_tax_pro', { clientId }, 'primary', '👨‍💼')
        .action('View Recommendations', 'get_tax_pro_recommendations', { clientId }, 'secondary', '📋')
        .message(instructions)
        .data({ clientId, preferences })
        .nextTools('route_to_tax_pro', 'get_tax_pro_recommendations')
        .flowStage('taxpro_routing')
        .build();
}
/** Format select_tax_professional response. */
export function formatTaxProSelected(taxProName, taxProId, instructions, clientId) {
    return ui.response('tax_pro_selected', 'select_tax_professional')
        .title(`✅ Selected: ${taxProName}`)
        .banner(`${taxProName} has been selected as your tax professional!`, 'success', { icon: '👨‍💼' })
        .action('Book Appointment', 'create_appointment', {
        clientId,
        taxProId,
    }, 'primary', '📅')
        .action('Get Time Estimate', 'get_appointment_estimate', { clientId }, 'secondary', '⏱️')
        .message(instructions)
        .data({ clientId, taxProId, taxProName })
        .nextTools('create_appointment', 'get_appointment_estimate')
        .flowStage('appointment_scheduling')
        .build();
}
/** Format get_flow_progress response. */
export function formatFlowProgress(state) {
    const currentIndex = FLOW_SEQUENCE.indexOf(state.currentStage);
    const percent = Math.round(((currentIndex + 1) / FLOW_SEQUENCE.length) * 100);
    const builder = ui.response('flow_progress', 'get_flow_progress')
        .title('📊 Your Progress')
        .subtitle(`${percent}% complete`)
        .progress(currentIndex + 1, FLOW_SEQUENCE.length, `Step ${currentIndex + 1} of ${FLOW_SEQUENCE.length}`);
    // Build a section with all stages
    builder.section('Conversation Flow', sb => {
        sb.icon('🔄');
        FLOW_SEQUENCE.forEach(stage => {
            const info = STAGE_LABELS[stage];
            const badge = stageBadge(stage, state.completedStages, state.currentStage);
            sb.item(`${info.icon} ${info.label}`, {
                status: state.completedStages.includes(stage) ? 'done'
                    : stage === state.currentStage ? 'pending'
                        : 'optional',
                icon: badge.icon,
            });
        });
    });
    builder.data({
        clientId: state.clientId,
        currentStage: state.currentStage,
        completedStages: state.completedStages,
        percent,
    });
    return builder.build();
}
//# sourceMappingURL=flow.js.map