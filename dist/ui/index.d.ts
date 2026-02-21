/**
 * TaxPilot UI Layer — barrel export
 *
 * This is the public API for the UI system.
 *
 * Usage in MCP handlers:
 *   import { ui } from './ui/index.js';
 *   import { formatIntakeStart } from './ui/formatters/index.js';
 */
export type { UIAction, UIBadge, UIBanner, UICard, UIField, UIListItem, UIProgressBar, UIResponse, UIResponseMeta, UIResponseType, UISection, } from './types.js';
export { ui, response, card, section, action, badge, progress, listItem, ResponseBuilder, CardBuilder, SectionBuilder, } from './builders.js';
export * as intakeUI from './formatters/intake.js';
export * as checklistUI from './formatters/checklist.js';
export * as routingUI from './formatters/routing.js';
export * as remindersUI from './formatters/reminders.js';
export * as flowUI from './formatters/flow.js';
//# sourceMappingURL=index.d.ts.map