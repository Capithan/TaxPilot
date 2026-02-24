/**
 * TaxPilot UI Layer — barrel export
 *
 * This is the public API for the UI system.
 *
 * Usage in MCP handlers:
 *   import { ui } from './ui/index.js';
 *   import { formatIntakeStart } from './ui/formatters/index.js';
 *
 * Structured component system:
 *   import { uiComponents, structuredResponse } from './ui/index.js';
 */
export type { UIAction, UIBadge, UIBanner, UICard, UIField, UIListItem, UIProgressBar, UIResponse, UIResponseMeta, UIResponseType, UISection, } from './types.js';
export { ui, response, card, section, action, badge, progress, listItem, ResponseBuilder, CardBuilder, SectionBuilder, } from './builders.js';
export * as intakeUI from './formatters/intake.js';
export * as checklistUI from './formatters/checklist.js';
export * as routingUI from './formatters/routing.js';
export * as remindersUI from './formatters/reminders.js';
export * as flowUI from './formatters/flow.js';
export type { SessionScreen, SessionState, ButtonComponent, FormFieldComponent, FormGroupComponent, MultiSelectCardComponent, SelectionCardComponent, StatusBadgeComponent, StepProgressComponent, ProgressBarComponent, InfoCardComponent, AppointmentSummaryCardComponent, TaxProCardComponent, ChecklistComponent, BannerComponent, DividerComponent, TextBlockComponent, CarouselComponent, AccordionComponent, AccordionItem, AlertComponent, TabGroupComponent, TabItem, NotificationComponent, TooltipComponent, StatCardComponent, UIComponent, UIActionPayload, StructuredUIResponse, } from './components.types.js';
export { uiComponents, structuredResponse, primaryButton, secondaryButton, dangerButton, formField, formGroup, multiSelect, selectionCard, statusBadge, stepProgress, progressBar, infoCard, appointmentSummary, taxProCard, checklist, banner, divider, textBlock, carousel, accordion, alert, tabGroup, notification, tooltip, statCard, toolAction, messageAction, navigateAction, submitFormAction, StructuredResponseBuilder, } from './components.builders.js';
export { hrbTheme, getVariantColors, getThemeCSSVars } from './theme.js';
export * as structuredExamples from './formatters/structured.examples.js';
//# sourceMappingURL=index.d.ts.map