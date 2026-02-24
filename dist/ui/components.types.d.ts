/**
 * TaxPilot Structured UI Component Type System (v2 — HRB Native App)
 *
 * Extended component types for the ChatGPT native app experience.
 * Adds form inputs, multi-select cards, branded appointment summaries,
 * and session-state-aware rendering.
 *
 * Architecture:
 *   Backend (services/) → UI Formatters (ui/formatters/) → StructuredUIResponse
 *   ChatGPT returns JSON → Frontend renderer interprets → HRB-branded components
 */
/**
 * Top-level session screens. UI rendering depends on current screen.
 */
export type SessionScreen = 'home' | 'service_selection' | 'intake' | 'summary' | 'document_checklist' | 'taxpro_matching' | 'appointment_booking' | 'confirmation' | 'complete';
export interface SessionState {
    screen: SessionScreen;
    chatId: string | null;
    clientId: string | null;
    sessionId: string | null;
    taxProId: string | null;
    appointmentId: string | null;
    intakeProgress: number;
    currentIntakeStep: string | null;
    completedSteps: string[];
    /** Arbitrary context from previous responses */
    context: Record<string, unknown>;
}
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';
export interface ButtonComponent {
    component: 'Button';
    label: string;
    variant: ButtonVariant;
    size?: ButtonSize;
    icon?: string;
    disabled?: boolean;
    /** What happens on click */
    action: UIActionPayload;
}
export type FormFieldType = 'text' | 'email' | 'phone' | 'date' | 'select' | 'textarea' | 'number';
export interface FormFieldComponent {
    component: 'FormField';
    id: string;
    label: string;
    type: FormFieldType;
    placeholder?: string;
    required?: boolean;
    value?: string;
    /** For select type */
    options?: Array<{
        label: string;
        value: string;
    }>;
    /** Validation message */
    error?: string;
    helperText?: string;
}
export interface FormGroupComponent {
    component: 'FormGroup';
    title?: string;
    subtitle?: string;
    fields: FormFieldComponent[];
    submitAction: UIActionPayload;
    submitLabel?: string;
}
export interface ChoiceOption {
    id: string;
    label: string;
    description?: string;
    icon?: string;
    /** Pre-selected */
    selected?: boolean;
}
export interface MultiSelectCardComponent {
    component: 'MultiSelectCard';
    title: string;
    subtitle?: string;
    options: ChoiceOption[];
    /** Allow multiple selections */
    multiSelect: boolean;
    /** Min/max selections */
    minSelect?: number;
    maxSelect?: number;
    /** Action when submitted */
    submitAction: UIActionPayload;
    submitLabel?: string;
}
/** Single-choice inline selector (like service type) */
export interface SelectionCardComponent {
    component: 'SelectionCard';
    title: string;
    options: Array<{
        id: string;
        label: string;
        description?: string;
        icon?: string;
        badge?: string;
    }>;
    action: UIActionPayload;
}
export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'brand';
export interface StatusBadgeComponent {
    component: 'StatusBadge';
    text: string;
    variant: BadgeVariant;
    icon?: string;
    /** Pulsing dot animation */
    pulse?: boolean;
}
export interface StepProgressComponent {
    component: 'StepProgress';
    steps: Array<{
        id: string;
        label: string;
        status: 'done' | 'active' | 'upcoming';
        icon?: string;
    }>;
    currentIndex: number;
}
export interface ProgressBarComponent {
    component: 'ProgressBar';
    current: number;
    total: number;
    label?: string;
    /** Show percentage text */
    showPercent?: boolean;
}
export interface InfoCardComponent {
    component: 'InfoCard';
    title: string;
    subtitle?: string;
    icon?: string;
    badge?: {
        text: string;
        variant: BadgeVariant;
    };
    fields: Array<{
        label: string;
        value: string;
        icon?: string;
    }>;
    /** Highlighted callout text */
    highlight?: string;
    footer?: string;
    actions?: ButtonComponent[];
}
/** Branded appointment summary — mirrors H&R Block confirmation pages */
export interface AppointmentSummaryCardComponent {
    component: 'AppointmentSummaryCard';
    status: 'scheduled' | 'confirmed' | 'cancelled';
    appointment: {
        id: string;
        date: string;
        time: string;
        duration: string;
        type: string;
        location?: string;
    };
    taxPro: {
        name: string;
        title?: string;
        rating?: number;
        specializations?: string[];
        photoUrl?: string;
    };
    client: {
        name: string;
        complexityLevel?: string;
        documentStatus?: string;
    };
    actions?: ButtonComponent[];
    /** Confirmation number */
    confirmationId?: string;
}
/** Tax professional recommendation card */
export interface TaxProCardComponent {
    component: 'TaxProCard';
    taxPro: {
        id: string;
        name: string;
        title?: string;
        rating: number;
        specializations: string[];
        availability: string;
        photoUrl?: string;
    };
    /** Why this pro is recommended */
    matchReason?: string;
    /** Is this the best match? */
    recommended?: boolean;
    actions?: ButtonComponent[];
}
/** Document checklist group */
export interface ChecklistComponent {
    component: 'Checklist';
    title: string;
    icon?: string;
    items: Array<{
        id: string;
        text: string;
        description?: string;
        status: 'collected' | 'pending' | 'required' | 'optional';
        actions?: ButtonComponent[];
    }>;
    counter?: {
        done: number;
        total: number;
    };
}
/** Alert/banner at top of response */
export interface BannerComponent {
    component: 'Banner';
    text: string;
    variant: 'success' | 'info' | 'warning' | 'error';
    icon?: string;
    dismissible?: boolean;
    confetti?: boolean;
}
/** Horizontal divider */
export interface DividerComponent {
    component: 'Divider';
    label?: string;
}
/** Text paragraph block */
export interface TextBlockComponent {
    component: 'TextBlock';
    text: string;
    style?: 'body' | 'caption' | 'heading' | 'subheading';
}
/** A carousel of cards for horizontal scrolling */
export interface CarouselComponent {
    component: 'Carousel';
    items: (TaxProCardComponent | InfoCardComponent)[];
}
export interface AccordionItem {
    title: string;
    content?: string;
    icon?: string;
    badge?: string;
    expanded?: boolean;
    /** Nested components rendered inside the panel */
    components?: UIComponent[];
}
export interface AccordionComponent {
    component: 'Accordion';
    title?: string;
    items: AccordionItem[];
}
export interface AlertComponent {
    component: 'Alert';
    title?: string;
    text: string;
    variant: 'success' | 'info' | 'warning' | 'error';
    icon?: string;
    dismissible?: boolean;
    actions?: ButtonComponent[];
}
export interface TabItem {
    label: string;
    icon?: string;
    content?: string;
    components?: UIComponent[];
}
export interface TabGroupComponent {
    component: 'TabGroup';
    title?: string;
    tabs: TabItem[];
}
export interface NotificationComponent {
    component: 'Notification';
    message: string;
    variant: 'success' | 'info' | 'warning' | 'error';
    icon?: string;
    duration?: number;
    /** Also render as inline content */
    showInline?: boolean;
}
export interface TooltipComponent {
    component: 'Tooltip';
    text: string;
    tooltip: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
}
export interface StatCardComponent {
    component: 'StatCard';
    value: string;
    label: string;
    icon?: string;
    trend?: {
        direction: 'up' | 'down' | 'neutral';
        text?: string;
    };
}
/**
 * Unified action payload — defines what happens when user interacts.
 */
export interface UIActionPayload {
    /** The type of action to perform */
    type: 'tool_call' | 'send_message' | 'navigate' | 'set_input' | 'submit_form';
    /** MCP tool name (for tool_call) */
    toolName?: string;
    /** Arguments for the tool */
    toolArgs?: Record<string, unknown>;
    /** Message to send (for send_message) */
    message?: string;
    /** Screen to navigate to (for navigate) */
    screen?: SessionScreen;
    /** Form field values (for submit_form) */
    formData?: Record<string, string>;
}
/**
 * Union of all renderable components.
 */
export type UIComponent = ButtonComponent | FormFieldComponent | FormGroupComponent | MultiSelectCardComponent | SelectionCardComponent | StatusBadgeComponent | StepProgressComponent | ProgressBarComponent | InfoCardComponent | AppointmentSummaryCardComponent | TaxProCardComponent | ChecklistComponent | BannerComponent | DividerComponent | TextBlockComponent | CarouselComponent | AccordionComponent | AlertComponent | TabGroupComponent | NotificationComponent | TooltipComponent | StatCardComponent;
/**
 * A structured UI response that the ChatGPT assistant returns.
 * The frontend renderer walks the `components` array and renders each one.
 */
export interface StructuredUIResponse {
    /** Response identifier */
    id: string;
    /** Which screen this response targets */
    screen: SessionScreen;
    /** Ordered list of components to render */
    components: UIComponent[];
    /** Session state updates to apply */
    stateUpdates?: Partial<SessionState>;
    /** Raw data for ChatGPT's internal reference (not rendered) */
    data?: Record<string, unknown>;
    /** Metadata */
    _meta: {
        toolName: string;
        timestamp: string;
        nextSuggestedTools?: string[];
    };
}
//# sourceMappingURL=components.types.d.ts.map