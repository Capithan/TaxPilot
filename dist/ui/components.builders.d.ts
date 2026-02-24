/**
 * TaxPilot Structured UI Component Builders (v2)
 *
 * Fluent builder API for constructing StructuredUIResponse objects
 * with the new HRB component system. Used by backend formatters.
 */
import type { SessionScreen, SessionState, ButtonComponent, ButtonVariant, ButtonSize, FormFieldComponent, FormFieldType, FormGroupComponent, MultiSelectCardComponent, SelectionCardComponent, ChoiceOption, StatusBadgeComponent, BadgeVariant, StepProgressComponent, ProgressBarComponent, InfoCardComponent, AppointmentSummaryCardComponent, TaxProCardComponent, ChecklistComponent, BannerComponent, DividerComponent, TextBlockComponent, CarouselComponent, AccordionComponent, AccordionItem, AlertComponent, TabGroupComponent, TabItem, NotificationComponent, TooltipComponent, StatCardComponent, UIActionPayload, UIComponent, StructuredUIResponse } from './components.types.js';
export declare function primaryButton(label: string, action: UIActionPayload): ButtonComponent;
export declare function secondaryButton(label: string, action: UIActionPayload): ButtonComponent;
export declare function dangerButton(label: string, action: UIActionPayload): ButtonComponent;
export declare function button(label: string, variant: ButtonVariant, action: UIActionPayload, opts?: {
    icon?: string;
    size?: ButtonSize;
    disabled?: boolean;
}): ButtonComponent;
export declare function formField(id: string, label: string, type: FormFieldType, opts?: Partial<Omit<FormFieldComponent, 'component' | 'id' | 'label' | 'type'>>): FormFieldComponent;
export declare function formGroup(fields: FormFieldComponent[], submitAction: UIActionPayload, opts?: {
    title?: string;
    subtitle?: string;
    submitLabel?: string;
}): FormGroupComponent;
export declare function multiSelect(title: string, options: ChoiceOption[], submitAction: UIActionPayload, opts?: {
    subtitle?: string;
    multiSelect?: boolean;
    minSelect?: number;
    maxSelect?: number;
    submitLabel?: string;
}): MultiSelectCardComponent;
export declare function selectionCard(title: string, options: SelectionCardComponent['options'], action: UIActionPayload): SelectionCardComponent;
export declare function statusBadge(text: string, variant: BadgeVariant, opts?: {
    icon?: string;
    pulse?: boolean;
}): StatusBadgeComponent;
export declare function stepProgress(steps: StepProgressComponent['steps'], currentIndex: number): StepProgressComponent;
export declare function progressBar(current: number, total: number, opts?: {
    label?: string;
    showPercent?: boolean;
}): ProgressBarComponent;
export declare function infoCard(title: string, fields: InfoCardComponent['fields'], opts?: Partial<Omit<InfoCardComponent, 'component' | 'title' | 'fields'>>): InfoCardComponent;
export declare function appointmentSummary(appointment: AppointmentSummaryCardComponent['appointment'], taxPro: AppointmentSummaryCardComponent['taxPro'], client: AppointmentSummaryCardComponent['client'], opts?: Partial<Omit<AppointmentSummaryCardComponent, 'component' | 'appointment' | 'taxPro' | 'client'>>): AppointmentSummaryCardComponent;
export declare function taxProCard(taxPro: TaxProCardComponent['taxPro'], opts?: Partial<Omit<TaxProCardComponent, 'component' | 'taxPro'>>): TaxProCardComponent;
export declare function checklist(title: string, items: ChecklistComponent['items'], opts?: {
    icon?: string;
    counter?: {
        done: number;
        total: number;
    };
}): ChecklistComponent;
export declare function banner(text: string, variant: BannerComponent['variant'], opts?: {
    icon?: string;
    dismissible?: boolean;
    confetti?: boolean;
}): BannerComponent;
export declare function divider(label?: string): DividerComponent;
export declare function textBlock(text: string, style?: TextBlockComponent['style']): TextBlockComponent;
export declare function carousel(items: CarouselComponent['items']): CarouselComponent;
export declare function accordion(items: AccordionItem[], opts?: {
    title?: string;
}): AccordionComponent;
export declare function alert(text: string, variant: AlertComponent['variant'], opts?: {
    title?: string;
    icon?: string;
    dismissible?: boolean;
    actions?: ButtonComponent[];
}): AlertComponent;
export declare function tabGroup(tabs: TabItem[], opts?: {
    title?: string;
}): TabGroupComponent;
export declare function notification(message: string, variant: NotificationComponent['variant'], opts?: {
    icon?: string;
    duration?: number;
    showInline?: boolean;
}): NotificationComponent;
export declare function tooltip(text: string, tip: string, position?: TooltipComponent['position']): TooltipComponent;
export declare function statCard(value: string, label: string, opts?: {
    icon?: string;
    trend?: StatCardComponent['trend'];
}): StatCardComponent;
export declare function toolAction(toolName: string, toolArgs?: Record<string, unknown>): UIActionPayload;
export declare function messageAction(message: string): UIActionPayload;
export declare function navigateAction(screen: SessionScreen): UIActionPayload;
export declare function submitFormAction(formData: Record<string, string>): UIActionPayload;
export declare class StructuredResponseBuilder {
    private _resp;
    constructor(screen: SessionScreen, toolName: string);
    /** Add any component */
    add(component: UIComponent): this;
    /** Add a banner */
    banner(text: string, variant: BannerComponent['variant'], opts?: {
        icon?: string;
        confetti?: boolean;
    }): this;
    /** Add a text block */
    text(text: string, style?: TextBlockComponent['style']): this;
    /** Add a progress bar */
    progress(current: number, total: number, label?: string): this;
    /** Add step progress */
    steps(steps: StepProgressComponent['steps'], currentIndex: number): this;
    /** Add info card */
    card(title: string, fields: InfoCardComponent['fields'], opts?: Partial<InfoCardComponent>): this;
    /** Add a primary button */
    primaryButton(label: string, action: UIActionPayload, icon?: string): this;
    /** Add a secondary button */
    secondaryButton(label: string, action: UIActionPayload, icon?: string): this;
    /** Add divider */
    divider(label?: string): this;
    /** Set session state updates */
    stateUpdates(updates: Partial<SessionState>): this;
    /** Set raw data */
    data(data: Record<string, unknown>): this;
    /** Set next suggested tools */
    nextTools(...tools: string[]): this;
    build(): StructuredUIResponse;
    toJSON(): string;
}
/** Entry point for building structured UI responses */
export declare function structuredResponse(screen: SessionScreen, toolName: string): StructuredResponseBuilder;
export declare const uiComponents: {
    readonly structuredResponse: typeof structuredResponse;
    readonly primaryButton: typeof primaryButton;
    readonly secondaryButton: typeof secondaryButton;
    readonly dangerButton: typeof dangerButton;
    readonly button: typeof button;
    readonly formField: typeof formField;
    readonly formGroup: typeof formGroup;
    readonly multiSelect: typeof multiSelect;
    readonly selectionCard: typeof selectionCard;
    readonly statusBadge: typeof statusBadge;
    readonly stepProgress: typeof stepProgress;
    readonly progressBar: typeof progressBar;
    readonly infoCard: typeof infoCard;
    readonly appointmentSummary: typeof appointmentSummary;
    readonly taxProCard: typeof taxProCard;
    readonly checklist: typeof checklist;
    readonly banner: typeof banner;
    readonly divider: typeof divider;
    readonly textBlock: typeof textBlock;
    readonly carousel: typeof carousel;
    readonly accordion: typeof accordion;
    readonly alert: typeof alert;
    readonly tabGroup: typeof tabGroup;
    readonly notification: typeof notification;
    readonly tooltip: typeof tooltip;
    readonly statCard: typeof statCard;
    readonly toolAction: typeof toolAction;
    readonly messageAction: typeof messageAction;
    readonly navigateAction: typeof navigateAction;
    readonly submitFormAction: typeof submitFormAction;
};
//# sourceMappingURL=components.builders.d.ts.map