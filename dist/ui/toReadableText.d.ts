/**
 * Converts a UIResponse or StructuredUIResponse into clean, human-readable
 * text that ChatGPT can present conversationally.
 *
 * This is the text that goes into content[0].text in the MCP tool result.
 * structuredContent still carries the full component tree for UI-capable clients.
 */
/**
 * Convert any UIResponse or StructuredUIResponse into clean readable text.
 * Auto-detects the format based on the presence of `components` (structured)
 * vs `cards`/`type` (UIResponse builder format).
 */
export declare function toReadableText(resp: Record<string, unknown>): string;
//# sourceMappingURL=toReadableText.d.ts.map