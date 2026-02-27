/**
 * MCP Apps Widget Template — ChatGPT App UI
 *
 * Returns a self-contained HTML document with inline CSS + JavaScript.
 * ChatGPT loads this via resources/read and then delivers tool data
 * to the iframe via the MCP Apps bridge (postMessage).
 *
 * Architecture (per https://developers.openai.com/apps-sdk/build/chatgpt-ui/):
 *   1. ChatGPT calls resources/read → gets this template (text/html;profile=mcp-app)
 *   2. ChatGPT sends structuredContent via ui/notifications/tool-result
 *   3. window.openai.toolOutput has the initial structuredContent
 *   4. Widget JS reads data and renders HRB-branded components
 */
export declare const APP_WIDGET_MIME_TYPE = "text/html+skybridge";
export declare function getAppWidgetHtml(): string;
//# sourceMappingURL=appWidgetHtml.d.ts.map