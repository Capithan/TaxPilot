/**
 * UIResponse → StructuredUIResponse Converter
 *
 * Transforms the UIResponse format (type, title, cards, sections, actions)
 * used by checklist, routing, reminders formatters into the
 * StructuredUIResponse format (screen, components[]) that the chat.html
 * TaxPilotRenderer can render as interactive components.
 */
/**
 * Convert a UIResponse into a StructuredUIResponse with `screen` + `components[]`.
 * If the input already has `screen` + `components`, return it as-is.
 */
export declare function uiResponseToStructured(resp: Record<string, unknown>): Record<string, unknown>;
//# sourceMappingURL=uiResponseToStructured.d.ts.map