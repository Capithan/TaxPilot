/**
 * TaxPilot UI Component Type System
 *
 * Defines structured UI primitives that MCP tool handlers return.
 * ChatGPT's system prompt contains rendering rules that turn these
 * objects into beautiful card-based layouts with interactive buttons.
 *
 * Architecture:
 *   Business Logic (services/) → UI Formatters (ui/formatters/) → UIResponse
 *   UIResponse is serialized as JSON inside MCP tool content blocks.
 *   The GPT system prompt teaches ChatGPT how to render each component.
 */
/** A clickable action that triggers another MCP tool. */
export interface UIAction {
    /** Button label displayed to the user */
    label: string;
    /** MCP tool name to invoke when clicked */
    toolName: string;
    /** Arguments to pass to the tool */
    toolArgs: Record<string, unknown>;
    /** Visual style hint */
    style: 'primary' | 'secondary' | 'danger' | 'success';
    /** Optional emoji/icon prefix */
    icon?: string;
}
/** A progress indicator. */
export interface UIProgressBar {
    current: number;
    total: number;
    /** e.g. "Step 4 of 9" */
    label?: string;
    /** Computed percentage (0–100) */
    percent: number;
}
/** An inline badge/pill. */
export interface UIBadge {
    text: string;
    variant: 'success' | 'warning' | 'error' | 'info' | 'neutral';
    icon?: string;
}
/** A single key-value field inside a card. */
export interface UIField {
    label: string;
    value: string;
    icon?: string;
}
/** A single list item (checklist row, document row, etc.). */
export interface UIListItem {
    text: string;
    description?: string;
    icon?: string;
    /** Semantic status controls the rendered icon */
    status?: 'done' | 'pending' | 'required' | 'optional' | 'error';
    /** Inline actions for this specific item */
    actions?: UIAction[];
}
/** A titled group of list items (e.g. "Income Documents"). */
export interface UISection {
    title: string;
    icon?: string;
    items: UIListItem[];
    /** Number format: "3 of 5 collected" */
    counter?: {
        done: number;
        total: number;
    };
}
/** A standalone card (tax pro card, summary card, confirmation card). */
export interface UICard {
    id?: string;
    title: string;
    subtitle?: string;
    badge?: UIBadge;
    icon?: string;
    /** Structured key-value fields */
    fields?: UIField[];
    /** Grouped content sections */
    sections?: UISection[];
    /** Card-level action buttons */
    actions?: UIAction[];
    /** Highlighted text callout */
    highlight?: string;
    /** Footer text */
    footer?: string;
}
/** A banner/alert shown at the top of the response. */
export interface UIBanner {
    text: string;
    variant: 'success' | 'info' | 'warning' | 'error';
    icon?: string;
    /** Whether to show a celebration effect */
    confetti?: boolean;
}
/**
 * Every tool response is wrapped in a UIResponse.
 * This is what gets serialized into the MCP content block.
 */
export interface UIResponse {
    /** Discriminator — tells the system prompt which rendering template to use */
    type: UIResponseType;
    /** Main heading */
    title: string;
    /** Secondary heading */
    subtitle?: string;
    /** Global progress bar (e.g. intake progress, checklist progress) */
    progress?: UIProgressBar;
    /** Optional banner at the top */
    banner?: UIBanner;
    /** Array of cards to render */
    cards?: UICard[];
    /** Standalone sections (outside of cards) */
    sections?: UISection[];
    /** Global action buttons (bottom of response) */
    actions?: UIAction[];
    /** Freeform message text (rendered as paragraph below cards) */
    message?: string;
    /** Raw business data (for ChatGPT to reference in conversation) */
    data: Record<string, unknown>;
    /** Metadata for flow control */
    _meta: UIResponseMeta;
}
export interface UIResponseMeta {
    /** Which MCP tool produced this response */
    toolName: string;
    /** ISO timestamp */
    timestamp: string;
    /** Hints for ChatGPT: which tools to suggest calling next */
    nextSuggestedTools?: string[];
    /** Flow stage this response corresponds to */
    flowStage?: string;
}
/**
 * All possible response types. Each has rendering rules in the system prompt.
 */
export type UIResponseType = 'intake_start' | 'intake_question' | 'intake_complete' | 'intake_progress' | 'client_summary' | 'document_checklist' | 'document_collected' | 'pending_documents' | 'reminders_created' | 'reminders_list' | 'reminder_sent' | 'complexity_score' | 'routing_result' | 'tax_pro_recommendations' | 'appointment_estimate' | 'appointment_created' | 'flow_status' | 'flow_advanced' | 'flow_progress' | 'tax_pro_list' | 'client_profile' | 'notification_sent' | 'confirmation_prompt' | 'scheduling_preferences' | 'tax_pro_selected' | 'error';
//# sourceMappingURL=types.d.ts.map