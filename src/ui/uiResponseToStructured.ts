/**
 * UIResponse → StructuredUIResponse Converter
 *
 * Transforms the UIResponse format (type, title, cards, sections, actions)
 * used by checklist, routing, reminders formatters into the
 * StructuredUIResponse format (screen, components[]) that the chat.html
 * TaxPilotRenderer can render as interactive components.
 */

import type { UIResponse, UIAction, UICard, UISection, UIBanner } from './types.js';

/** Map UIResponse.type to a StructuredUIResponse screen name. */
const TYPE_TO_SCREEN: Record<string, string> = {
  intake_start: 'intake',
  intake_question: 'intake',
  intake_complete: 'summary',
  intake_progress: 'intake',
  client_summary: 'summary',
  document_checklist: 'document_checklist',
  document_collected: 'document_checklist',
  pending_documents: 'document_checklist',
  reminders_created: 'confirmation',
  reminders_list: 'confirmation',
  reminder_sent: 'confirmation',
  complexity_score: 'taxpro_matching',
  routing_result: 'taxpro_matching',
  tax_pro_recommendations: 'taxpro_matching',
  appointment_estimate: 'appointment_booking',
  appointment_booking: 'appointment_booking',
  appointment_created: 'confirmation',
  office_locator: 'office_locator',
  flow_status: 'home',
  flow_advanced: 'home',
  flow_progress: 'home',
  tax_pro_list: 'taxpro_matching',
  client_profile: 'summary',
  notification_sent: 'confirmation',
  confirmation_prompt: 'summary',
  scheduling_preferences: 'appointment_booking',
  tax_pro_selected: 'taxpro_matching',
  error: 'home',
};

function stableId(screen: string, toolName?: string): string {
  return toolName ? `taxpilot-${screen}-${toolName}` : `taxpilot-${screen}`;
}

/** Convert a UIAction to a button component for the renderer. */
function actionToButton(a: UIAction): Record<string, unknown> {
  return {
    type: 'button',
    label: `${a.icon ? a.icon + ' ' : ''}${a.label}`,
    variant: a.style === 'success' ? 'primary'
      : a.style === 'danger' ? 'danger'
      : a.style === 'secondary' ? 'secondary'
      : 'primary',
    icon: a.icon,
    action: {
      type: 'tool_call',
      tool: a.toolName,
      toolName: a.toolName,
      parameters: a.toolArgs || {},
    },
  };
}

/** Convert a UICard to an info_card component. */
function cardToInfoCard(c: UICard): Record<string, unknown>[] {
  const components: Record<string, unknown>[] = [];

  const fields = (c.fields || []).map(f => ({
    label: f.label,
    value: f.value,
    icon: f.icon,
  }));

  const badge = c.badge
    ? { text: c.badge.text, variant: c.badge.variant }
    : undefined;

  components.push({
    type: 'info_card',
    title: c.title,
    badge,
    fields,
    highlight: c.highlight,
  });

  // If the card has inline sections, convert them to checklists
  if (c.sections && c.sections.length > 0) {
    c.sections.forEach(sec => {
      components.push(...sectionToChecklist(sec));
    });
  }

  // Card-level actions as buttons
  if (c.actions && c.actions.length > 0) {
    c.actions.forEach(a => {
      components.push(actionToButton(a));
    });
  }

  return components;
}

/** Convert a UISection to a checklist component. */
function sectionToChecklist(sec: UISection): Record<string, unknown>[] {
  const done = sec.items.filter(i => i.status === 'done').length;
  const total = sec.items.length;

  const items = sec.items.map(item => {
    const itemActions = (item.actions || []).map(a => actionToButton(a));
    return {
      id: item.text.replace(/\s+/g, '_').toLowerCase(),
      text: `${item.icon ? item.icon + ' ' : ''}${item.text}`,
      description: item.description,
      status: item.status === 'done' ? 'collected'
        : item.status === 'required' ? 'required'
        : 'pending',
      actions: itemActions.length > 0 ? itemActions : undefined,
    };
  });

  return [{
    type: 'checklist',
    title: sec.title,
    icon: sec.icon || '📋',
    counter: sec.counter || { done, total },
    items,
  }];
}

/**
 * Convert a UIResponse into a StructuredUIResponse with `screen` + `components[]`.
 * If the input already has `screen` + `components`, return it as-is.
 */
export function uiResponseToStructured(resp: Record<string, unknown>): Record<string, unknown> {
  // Already in StructuredUIResponse format
  if (resp.screen && Array.isArray(resp.components)) {
    return resp;
  }

  // Legacy UIResponse format — convert
  const uiResp = resp as unknown as UIResponse;
  const components: Record<string, unknown>[] = [];

  // 1. Banner
  if (uiResp.banner) {
    components.push({
      type: 'banner',
      text: uiResp.banner.text,
      variant: uiResp.banner.variant || 'info',
      icon: uiResp.banner.icon,
      confetti: uiResp.banner.confetti,
    });
  }

  // 2. Title as heading
  if (uiResp.title) {
    components.push({
      type: 'text_block',
      text: uiResp.title,
      style: 'heading',
    });
  }

  // 3. Subtitle
  if (uiResp.subtitle) {
    components.push({
      type: 'text_block',
      text: uiResp.subtitle,
      style: 'subheading',
    });
  }

  // 4. Progress bar
  if (uiResp.progress) {
    components.push({
      type: 'progress_bar',
      value: uiResp.progress.current,
      max: uiResp.progress.total,
      label: uiResp.progress.label || `${uiResp.progress.current} of ${uiResp.progress.total}`,
    });
  }

  // 5. Cards → info_card components
  if (uiResp.cards && uiResp.cards.length > 0) {
    uiResp.cards.forEach(card => {
      components.push(...cardToInfoCard(card));
    });
  }

  // 6. Sections → checklist components
  if (uiResp.sections && uiResp.sections.length > 0) {
    uiResp.sections.forEach(sec => {
      components.push(...sectionToChecklist(sec));
    });
  }

  // 7. Message as text
  if (uiResp.message) {
    components.push({
      type: 'text_block',
      text: uiResp.message,
      style: 'body',
    });
  }

  // 8. Global actions → button components
  if (uiResp.actions && uiResp.actions.length > 0) {
    uiResp.actions.forEach(a => {
      components.push(actionToButton(a));
    });
  }

  // Determine screen
  const screen = TYPE_TO_SCREEN[uiResp.type] || 'home';
  const toolName = uiResp._meta?.toolName || uiResp.type || '';

  return {
    id: stableId(screen, toolName),
    screen,
    components,
    stateUpdates: {
      screen,
      ...(uiResp._meta?.flowStage ? { flowStage: uiResp._meta.flowStage } : {}),
    },
    data: uiResp.data || {},
    _meta: {
      toolName: uiResp._meta?.toolName || '',
      timestamp: uiResp._meta?.timestamp || new Date().toISOString(),
      nextSuggestedTools: uiResp._meta?.nextSuggestedTools,
    },
  };
}
