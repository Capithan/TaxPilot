/**
 * TaxPilot Structured UI Component Builders (v2)
 *
 * Fluent builder API for constructing StructuredUIResponse objects
 * with the new HRB component system. Used by backend formatters.
 */
// ═══════════════════════════════════════════════════════════════════════════════
// BUTTON BUILDER
// ═══════════════════════════════════════════════════════════════════════════════
export function primaryButton(label, action) {
    return { component: 'Button', label, variant: 'primary', action };
}
export function secondaryButton(label, action) {
    return { component: 'Button', label, variant: 'secondary', action };
}
export function dangerButton(label, action) {
    return { component: 'Button', label, variant: 'danger', action };
}
export function button(label, variant, action, opts) {
    return { component: 'Button', label, variant, action, ...opts };
}
// ═══════════════════════════════════════════════════════════════════════════════
// FORM BUILDERS
// ═══════════════════════════════════════════════════════════════════════════════
export function formField(id, label, type, opts) {
    return { component: 'FormField', id, label, type, ...opts };
}
export function formGroup(fields, submitAction, opts) {
    return { component: 'FormGroup', fields, submitAction, ...opts };
}
// ═══════════════════════════════════════════════════════════════════════════════
// SELECTION BUILDERS
// ═══════════════════════════════════════════════════════════════════════════════
export function multiSelect(title, options, submitAction, opts) {
    return {
        component: 'MultiSelectCard',
        title,
        options,
        multiSelect: opts?.multiSelect ?? true,
        submitAction,
        ...opts,
    };
}
export function selectionCard(title, options, action) {
    return { component: 'SelectionCard', title, options, action };
}
// ═══════════════════════════════════════════════════════════════════════════════
// STATUS & PROGRESS BUILDERS
// ═══════════════════════════════════════════════════════════════════════════════
export function statusBadge(text, variant, opts) {
    return { component: 'StatusBadge', text, variant, ...opts };
}
export function stepProgress(steps, currentIndex) {
    return { component: 'StepProgress', steps, currentIndex };
}
export function progressBar(current, total, opts) {
    return { component: 'ProgressBar', current, total, ...opts };
}
// ═══════════════════════════════════════════════════════════════════════════════
// CARD BUILDERS
// ═══════════════════════════════════════════════════════════════════════════════
export function infoCard(title, fields, opts) {
    return { component: 'InfoCard', title, fields, ...opts };
}
export function appointmentSummary(appointment, taxPro, client, opts) {
    return {
        component: 'AppointmentSummaryCard',
        status: opts?.status ?? 'confirmed',
        appointment,
        taxPro,
        client,
        ...opts,
    };
}
export function taxProCard(taxPro, opts) {
    return { component: 'TaxProCard', taxPro, ...opts };
}
export function checklist(title, items, opts) {
    return { component: 'Checklist', title, items, ...opts };
}
// ═══════════════════════════════════════════════════════════════════════════════
// LAYOUT BUILDERS
// ═══════════════════════════════════════════════════════════════════════════════
export function banner(text, variant, opts) {
    return { component: 'Banner', text, variant, ...opts };
}
export function divider(label) {
    return { component: 'Divider', label };
}
export function textBlock(text, style) {
    return { component: 'TextBlock', text, style };
}
export function carousel(items) {
    return { component: 'Carousel', items };
}
// ═══════════════════════════════════════════════════════════════════════════════
// NEW COMPONENT BUILDERS (v2.1 — BDS-aligned additions)
// ═══════════════════════════════════════════════════════════════════════════════
export function accordion(items, opts) {
    return { component: 'Accordion', items, ...opts };
}
export function alert(text, variant, opts) {
    return { component: 'Alert', text, variant, ...opts };
}
export function tabGroup(tabs, opts) {
    return { component: 'TabGroup', tabs, ...opts };
}
export function notification(message, variant, opts) {
    return { component: 'Notification', message, variant, ...opts };
}
export function tooltip(text, tip, position) {
    return { component: 'Tooltip', text, tooltip: tip, position };
}
export function statCard(value, label, opts) {
    return { component: 'StatCard', value, label, ...opts };
}
// ═══════════════════════════════════════════════════════════════════════════════
// ACTION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
export function toolAction(toolName, toolArgs = {}) {
    return { type: 'tool_call', toolName, toolArgs };
}
export function messageAction(message) {
    return { type: 'send_message', message };
}
export function navigateAction(screen) {
    return { type: 'navigate', screen };
}
export function submitFormAction(formData) {
    return { type: 'submit_form', formData };
}
// ═══════════════════════════════════════════════════════════════════════════════
// RESPONSE BUILDER
// ═══════════════════════════════════════════════════════════════════════════════
export class StructuredResponseBuilder {
    _resp;
    constructor(screen, toolName) {
        this._resp = {
            id: `taxpilot-${screen}-${toolName}`,
            screen,
            components: [],
            _meta: {
                toolName,
                timestamp: new Date().toISOString(),
            },
        };
    }
    /** Add any component */
    add(component) {
        this._resp.components.push(component);
        return this;
    }
    /** Add a banner */
    banner(text, variant, opts) {
        return this.add({ component: 'Banner', text, variant, ...opts });
    }
    /** Add a text block */
    text(text, style) {
        return this.add({ component: 'TextBlock', text, style });
    }
    /** Add a progress bar */
    progress(current, total, label) {
        return this.add({ component: 'ProgressBar', current, total, label, showPercent: true });
    }
    /** Add step progress */
    steps(steps, currentIndex) {
        return this.add({ component: 'StepProgress', steps, currentIndex });
    }
    /** Add info card */
    card(title, fields, opts) {
        return this.add({ component: 'InfoCard', title, fields, ...opts });
    }
    /** Add a primary button */
    primaryButton(label, action, icon) {
        return this.add({ component: 'Button', label, variant: 'primary', action, icon });
    }
    /** Add a secondary button */
    secondaryButton(label, action, icon) {
        return this.add({ component: 'Button', label, variant: 'secondary', action, icon });
    }
    /** Add divider */
    divider(label) {
        return this.add({ component: 'Divider', label });
    }
    /** Set session state updates */
    stateUpdates(updates) {
        this._resp.stateUpdates = updates;
        return this;
    }
    /** Set raw data */
    data(data) {
        this._resp.data = data;
        return this;
    }
    /** Set next suggested tools */
    nextTools(...tools) {
        this._resp._meta.nextSuggestedTools = tools;
        return this;
    }
    build() {
        return this._resp;
    }
    toJSON() {
        return JSON.stringify(this._resp, null, 2);
    }
}
/** Entry point for building structured UI responses */
export function structuredResponse(screen, toolName) {
    return new StructuredResponseBuilder(screen, toolName);
}
// Convenience namespace
export const uiComponents = {
    structuredResponse,
    primaryButton,
    secondaryButton,
    dangerButton,
    button,
    formField,
    formGroup,
    multiSelect,
    selectionCard,
    statusBadge,
    stepProgress,
    progressBar,
    infoCard,
    appointmentSummary,
    taxProCard,
    checklist,
    banner,
    divider,
    textBlock,
    carousel,
    accordion,
    alert,
    tabGroup,
    notification,
    tooltip,
    statCard,
    toolAction,
    messageAction,
    navigateAction,
    submitFormAction,
};
//# sourceMappingURL=components.builders.js.map