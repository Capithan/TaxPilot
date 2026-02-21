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
export {};
//# sourceMappingURL=types.js.map