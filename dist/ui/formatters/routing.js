/**
 * Routing & Appointment Domain UI Formatter
 *
 * Transforms complexity scoring, tax pro matching, and appointment
 * data into structured UIResponse objects with pro cards, estimate
 * widgets, and booking confirmation cards.
 */
import { ui } from '../builders.js';
// ─── Helpers ─────────────────────────────────────────────────────────────────
function complexityBadge(level, score) {
    switch (level) {
        case 'simple': return { text: `Simple${score != null ? ` (${score})` : ''}`, variant: 'success', icon: '🟢' };
        case 'moderate': return { text: `Moderate${score != null ? ` (${score})` : ''}`, variant: 'info', icon: '🟡' };
        case 'complex': return { text: `Complex${score != null ? ` (${score})` : ''}`, variant: 'warning', icon: '🟠' };
        case 'expert': return { text: `Expert${score != null ? ` (${score})` : ''}`, variant: 'error', icon: '🔴' };
        default: return { text: level, variant: 'neutral' };
    }
}
function complexityInterpretation(level) {
    switch (level) {
        case 'simple': return 'Standard return with W-2 income and basic deductions. Quick appointment expected.';
        case 'moderate': return 'Multiple income sources or itemized deductions. May require additional documentation.';
        case 'complex': return 'Business income, rental properties, or investments. Requires experienced tax professional.';
        case 'expert': return 'Advanced situations like foreign accounts, crypto, or audit representation. Requires specialist.';
        default: return 'Unknown complexity level';
    }
}
function stars(rating) {
    return '⭐'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '½' : '');
}
function slotsText(pro) {
    const remaining = pro.maxDailyAppointments - pro.currentLoad;
    return remaining > 0 ? `${remaining} slot${remaining > 1 ? 's' : ''} available` : 'Fully booked';
}
// ─── Formatters ──────────────────────────────────────────────────────────────
/** Format calculate_complexity response. */
export function formatComplexityScore(clientId, score, level) {
    return ui.response('complexity_score', 'calculate_complexity')
        .title('📊 Complexity Analysis')
        .subtitle(`Score: ${score}/100`)
        .card('Tax Complexity', c => c
        .icon('📊')
        .badge(level.charAt(0).toUpperCase() + level.slice(1), complexityBadge(level).variant, complexityBadge(level).icon)
        .field('Score', `${score}/100`, '🎯')
        .field('Level', level.charAt(0).toUpperCase() + level.slice(1), '📈')
        .highlight(complexityInterpretation(level)))
        .action('Find Best Tax Pro', 'route_to_tax_pro', { clientId }, 'primary', '👨‍💼')
        .action('View Recommendations', 'get_tax_pro_recommendations', { clientId }, 'secondary', '📋')
        .data({ clientId, complexityScore: score, complexityLevel: level })
        .nextTools('route_to_tax_pro', 'get_tax_pro_recommendations')
        .build();
}
/** Format route_to_tax_pro response. */
export function formatRoutingResult(result, clientId) {
    if (!result.success || !result.taxPro) {
        return ui.response('routing_result', 'route_to_tax_pro')
            .title('❌ Routing Failed')
            .banner(result.message, 'error', { icon: '❌' })
            .action('View All Tax Pros', 'list_tax_professionals', {}, 'secondary', '📋')
            .data({ clientId, success: false, message: result.message })
            .build();
    }
    const pro = result.taxPro;
    return ui.response('routing_result', 'route_to_tax_pro')
        .title('✅ Tax Professional Assigned!')
        .subtitle(`Matched with ${pro.name}`)
        .banner('Perfect match found based on your tax situation!', 'success', { icon: '🎯' })
        .card(pro.name, c => c
        .icon('👨‍💼')
        .badge('⭐ Assigned', 'success', '✅')
        .field('Name', pro.name, '👤')
        .field('Email', pro.email, '📧')
        .field('Rating', `${stars(pro.rating)} (${pro.rating}/5)`, '⭐')
        .field('Specializations', pro.specializations.map(s => s.replace(/_/g, ' ')).join(', '), '📌')
        .field('Availability', slotsText(pro), '📅')
        .highlight(result.message))
        .action('Book Appointment', 'create_appointment', {
        clientId,
        taxProId: pro.id,
    }, 'primary', '📅')
        .action('Get Time Estimate', 'get_appointment_estimate', { clientId }, 'secondary', '⏱️')
        .action('See Other Options', 'get_tax_pro_recommendations', { clientId }, 'secondary', '🔄')
        .data({
        clientId,
        taxProId: pro.id,
        taxProName: pro.name,
        success: true,
    })
        .nextTools('create_appointment', 'get_appointment_estimate', 'set_scheduling_preferences')
        .flowStage('appointment_scheduling')
        .build();
}
/** Format get_tax_pro_recommendations response. */
export function formatTaxProRecommendations(clientId, recommended, reason, alternates) {
    const builder = ui.response('tax_pro_recommendations', 'get_tax_pro_recommendations')
        .title('👨‍💼 Recommended Tax Professionals')
        .subtitle(recommended ? `Best match: ${recommended.name}` : 'No perfect match found');
    if (recommended) {
        builder.card(recommended.name, c => c
            .icon('👨‍💼')
            .badge('⭐ Best Match', 'success', '⭐')
            .field('Rating', `${stars(recommended.rating)} (${recommended.rating}/5)`, '⭐')
            .field('Specializations', recommended.specializations.map(s => s.replace(/_/g, ' ')).join(', '), '📌')
            .field('Availability', slotsText(recommended), '📅')
            .field('Max Complexity', recommended.maxComplexity, '📊')
            .highlight(reason)
            .action('Select This Pro', 'select_tax_professional', {
            clientId,
            taxProId: recommended.id,
        }, 'primary', '✅')
            .action('Book Directly', 'create_appointment', {
            clientId,
            taxProId: recommended.id,
        }, 'success', '📅'));
    }
    alternates.forEach((alt, i) => {
        builder.card(alt.name, c => c
            .icon('👤')
            .badge(`Alternative ${i + 1}`, 'neutral')
            .field('Rating', `${stars(alt.rating)} (${alt.rating}/5)`, '⭐')
            .field('Specializations', alt.specializations.map(s => s.replace(/_/g, ' ')).join(', '), '📌')
            .field('Availability', slotsText(alt), '📅')
            .action('Select This Pro', 'select_tax_professional', {
            clientId,
            taxProId: alt.id,
        }, 'secondary', '✅'));
    });
    builder.data({
        clientId,
        recommendedId: recommended?.id,
        recommendedName: recommended?.name,
        alternateCount: alternates.length,
        reason,
    });
    builder.nextTools('select_tax_professional', 'create_appointment');
    builder.flowStage('taxpro_routing');
    return builder.build();
}
/** Format get_appointment_estimate response. */
export function formatAppointmentEstimate(estimate, clientId) {
    const badge = complexityBadge(estimate.complexityLevel);
    const builder = ui.response('appointment_estimate', 'get_appointment_estimate')
        .title('⏱️ Appointment Estimate')
        .subtitle(`${estimate.estimatedDuration} minutes · ${estimate.complexityLevel} complexity`);
    builder.card('Time Estimate', c => {
        c.icon('⏱️')
            .badge(badge.text, badge.variant, badge.icon)
            .field('Duration', `${estimate.estimatedDuration} minutes`, '⏱️')
            .field('Complexity', estimate.complexityLevel, '📊');
        if (estimate.savings > 0) {
            c.field('Time Saved', `${estimate.savings} minutes`, '🎉')
                .highlight(`Saving ${estimate.savings} minutes thanks to your pre-intake! 🎉`);
        }
    });
    builder.action('Book Appointment', 'create_appointment', { clientId }, 'primary', '📅');
    builder.data({
        clientId,
        estimatedDuration: estimate.estimatedDuration,
        timeSaved: estimate.savings,
        complexityLevel: estimate.complexityLevel,
    });
    builder.nextTools('create_appointment', 'set_scheduling_preferences');
    return builder.build();
}
/** Format create_appointment response. */
export function formatAppointmentCreated(appointment, taxPro, remindersScheduled) {
    return ui.response('appointment_created', 'create_appointment')
        .title('✅ Appointment Confirmed!')
        .banner('Your appointment has been booked!', 'success', { icon: '🎉', confetti: true })
        .card('Appointment Details', c => c
        .icon('📅')
        .badge('Confirmed', 'success', '✅')
        .field('Appointment ID', appointment.id, '🔑')
        .field('Date & Time', appointment.scheduledAt.toISOString(), '📅')
        .field('Duration', `${appointment.duration} minutes`, '⏱️')
        .field('Type', appointment.type === 'virtual' ? '💻 Virtual Meeting' : '🏢 In Person', '📍')
        .field('Tax Professional', taxPro?.name || appointment.taxProId, '👨‍💼')
        .field('Complexity', appointment.estimatedComplexity, '📊')
        .field('Reminders', `${remindersScheduled} scheduled`, '🔔')
        .highlight('You\'re all set! You\'ll receive reminders before your appointment.'))
        .action('View Reminders', 'get_client_reminders', {
        clientId: appointment.clientId,
    }, 'secondary', '🔔')
        .action('View Checklist', 'get_document_checklist', {
        clientId: appointment.clientId,
    }, 'secondary', '📋')
        .data({
        appointmentId: appointment.id,
        clientId: appointment.clientId,
        taxProId: appointment.taxProId,
        scheduledAt: appointment.scheduledAt.toISOString(),
        duration: appointment.duration,
        type: appointment.type,
        remindersScheduled,
    })
        .nextTools('get_client_reminders', 'get_flow_progress')
        .flowStage('complete')
        .build();
}
/** Format list_tax_professionals response. */
export function formatTaxProList(taxPros) {
    const builder = ui.response('tax_pro_list', 'list_tax_professionals')
        .title('👥 Available Tax Professionals')
        .subtitle(`${taxPros.length} professionals available`);
    taxPros.forEach(pro => {
        const available = pro.currentLoad < pro.maxDailyAppointments;
        builder.card(pro.name, c => c
            .id(pro.id)
            .icon(available ? '🟢' : '🔴')
            .badge(available ? 'Available' : 'Fully Booked', available ? 'success' : 'error')
            .field('Email', pro.email, '📧')
            .field('Specializations', pro.specializations.map(s => s.replace(/_/g, ' ')).join(', '), '📌')
            .field('Max Complexity', pro.maxComplexity, '📊')
            .field('Availability', slotsText(pro), '📅')
            .field('Rating', `${stars(pro.rating)} (${pro.rating}/5)`, '⭐'));
    });
    builder.data({ count: taxPros.length });
    return builder.build();
}
/** Format get_client (profile) response. */
export function formatClientProfile(client) {
    return ui.response('client_profile', 'get_client')
        .title(`👤 ${client.firstName || 'New'} ${client.lastName || 'Client'}`)
        .subtitle(`ID: ${client.id}`)
        .card('Client Profile', c => c
        .icon('👤')
        .field('Name', `${client.firstName} ${client.lastName}`, '🏷️')
        .field('Email', client.email || '—', '📧')
        .field('Phone', client.phone || '—', '📱')
        .field('Filing Status', client.filingStatus.replace(/_/g, ' '), '📋')
        .field('Intake Status', client.intakeCompleted ? 'Complete' : 'In Progress', client.intakeCompleted ? '✅' : '⏳')
        .field('Complexity Score', String(client.complexityScore), '📊'))
        .data({ clientId: client.id, raw: client })
        .build();
}
//# sourceMappingURL=routing.js.map