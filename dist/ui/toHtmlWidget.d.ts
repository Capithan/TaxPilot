/**
 * Server-Side HTML Renderer for MCP Apps Widget
 *
 * Converts a UIResponse or StructuredUIResponse into a complete, self-contained
 * HTML document with inline CSS (using the HRB brand theme).
 *
 * This runs on the SERVER and produces STATIC HTML that can be returned via
 * resources/read.  The document needs ZERO JavaScript — ChatGPT simply renders
 * it inside an iframe and the user sees a fully rendered UI.
 *
 * This solves the "Waiting for tool results" problem by pre-rendering the tool
 * result so the widget never needs to fetch data at runtime.
 */
/**
 * Build a complete self-contained HTML document from a UIResponse or
 * StructuredUIResponse.  Includes all CSS inline.  No JavaScript.
 *
 * Returns null if there is nothing to render.
 */
export declare function toHtmlWidget(resp: Record<string, unknown> | null | undefined): string | null;
//# sourceMappingURL=toHtmlWidget.d.ts.map