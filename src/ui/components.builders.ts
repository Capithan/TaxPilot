/**
 * TaxPilot Structured UI Component Builders (v2)
 *
 * Fluent builder API for constructing StructuredUIResponse objects
 * with the new HRB component system. Used by backend formatters.
 */

import type {
  SessionScreen,
  SessionState,
  ButtonComponent,
  ButtonVariant,
  ButtonSize,
  FormFieldComponent,
  FormFieldType,
  FormGroupComponent,
  MultiSelectCardComponent,
  SelectionCardComponent,
  ChoiceOption,
  StatusBadgeComponent,
  BadgeVariant,
  StepProgressComponent,
  ProgressBarComponent,
  InfoCardComponent,
  AppointmentSummaryCardComponent,
  TaxProCardComponent,
  ChecklistComponent,
  BannerComponent,
  DividerComponent,
  TextBlockComponent,
  CarouselComponent,
  UIActionPayload,
  UIComponent,
  StructuredUIResponse,
} from './components.types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// BUTTON BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

export function primaryButton(label: string, action: UIActionPayload): ButtonComponent {
  return { component: 'Button', label, variant: 'primary', action };
}

export function secondaryButton(label: string, action: UIActionPayload): ButtonComponent {
  return { component: 'Button', label, variant: 'secondary', action };
}

export function dangerButton(label: string, action: UIActionPayload): ButtonComponent {
  return { component: 'Button', label, variant: 'danger', action };
}

export function button(
  label: string,
  variant: ButtonVariant,
  action: UIActionPayload,
  opts?: { icon?: string; size?: ButtonSize; disabled?: boolean },
): ButtonComponent {
  return { component: 'Button', label, variant, action, ...opts };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORM BUILDERS
// ═══════════════════════════════════════════════════════════════════════════════

export function formField(
  id: string,
  label: string,
  type: FormFieldType,
  opts?: Partial<Omit<FormFieldComponent, 'component' | 'id' | 'label' | 'type'>>,
): FormFieldComponent {
  return { component: 'FormField', id, label, type, ...opts };
}

export function formGroup(
  fields: FormFieldComponent[],
  submitAction: UIActionPayload,
  opts?: { title?: string; subtitle?: string; submitLabel?: string },
): FormGroupComponent {
  return { component: 'FormGroup', fields, submitAction, ...opts };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SELECTION BUILDERS
// ═══════════════════════════════════════════════════════════════════════════════

export function multiSelect(
  title: string,
  options: ChoiceOption[],
  submitAction: UIActionPayload,
  opts?: { subtitle?: string; multiSelect?: boolean; minSelect?: number; maxSelect?: number; submitLabel?: string },
): MultiSelectCardComponent {
  return {
    component: 'MultiSelectCard',
    title,
    options,
    multiSelect: opts?.multiSelect ?? true,
    submitAction,
    ...opts,
  };
}

export function selectionCard(
  title: string,
  options: SelectionCardComponent['options'],
  action: UIActionPayload,
): SelectionCardComponent {
  return { component: 'SelectionCard', title, options, action };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATUS & PROGRESS BUILDERS
// ═══════════════════════════════════════════════════════════════════════════════

export function statusBadge(
  text: string,
  variant: BadgeVariant,
  opts?: { icon?: string; pulse?: boolean },
): StatusBadgeComponent {
  return { component: 'StatusBadge', text, variant, ...opts };
}

export function stepProgress(
  steps: StepProgressComponent['steps'],
  currentIndex: number,
): StepProgressComponent {
  return { component: 'StepProgress', steps, currentIndex };
}

export function progressBar(
  current: number,
  total: number,
  opts?: { label?: string; showPercent?: boolean },
): ProgressBarComponent {
  return { component: 'ProgressBar', current, total, ...opts };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CARD BUILDERS
// ═══════════════════════════════════════════════════════════════════════════════

export function infoCard(
  title: string,
  fields: InfoCardComponent['fields'],
  opts?: Partial<Omit<InfoCardComponent, 'component' | 'title' | 'fields'>>,
): InfoCardComponent {
  return { component: 'InfoCard', title, fields, ...opts };
}

export function appointmentSummary(
  appointment: AppointmentSummaryCardComponent['appointment'],
  taxPro: AppointmentSummaryCardComponent['taxPro'],
  client: AppointmentSummaryCardComponent['client'],
  opts?: Partial<Omit<AppointmentSummaryCardComponent, 'component' | 'appointment' | 'taxPro' | 'client'>>,
): AppointmentSummaryCardComponent {
  return {
    component: 'AppointmentSummaryCard',
    status: opts?.status ?? 'confirmed',
    appointment,
    taxPro,
    client,
    ...opts,
  };
}

export function taxProCard(
  taxPro: TaxProCardComponent['taxPro'],
  opts?: Partial<Omit<TaxProCardComponent, 'component' | 'taxPro'>>,
): TaxProCardComponent {
  return { component: 'TaxProCard', taxPro, ...opts };
}

export function checklist(
  title: string,
  items: ChecklistComponent['items'],
  opts?: { icon?: string; counter?: { done: number; total: number } },
): ChecklistComponent {
  return { component: 'Checklist', title, items, ...opts };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAYOUT BUILDERS
// ═══════════════════════════════════════════════════════════════════════════════

export function banner(
  text: string,
  variant: BannerComponent['variant'],
  opts?: { icon?: string; dismissible?: boolean; confetti?: boolean },
): BannerComponent {
  return { component: 'Banner', text, variant, ...opts };
}

export function divider(label?: string): DividerComponent {
  return { component: 'Divider', label };
}

export function textBlock(
  text: string,
  style?: TextBlockComponent['style'],
): TextBlockComponent {
  return { component: 'TextBlock', text, style };
}

export function carousel(
  items: CarouselComponent['items'],
): CarouselComponent {
  return { component: 'Carousel', items };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

export function toolAction(toolName: string, toolArgs: Record<string, unknown> = {}): UIActionPayload {
  return { type: 'tool_call', toolName, toolArgs };
}

export function messageAction(message: string): UIActionPayload {
  return { type: 'send_message', message };
}

export function navigateAction(screen: SessionScreen): UIActionPayload {
  return { type: 'navigate', screen };
}

export function submitFormAction(formData: Record<string, string>): UIActionPayload {
  return { type: 'submit_form', formData };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESPONSE BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

export class StructuredResponseBuilder {
  private _resp: StructuredUIResponse;

  constructor(screen: SessionScreen, toolName: string) {
    this._resp = {
      id: `ui-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      screen,
      components: [],
      _meta: {
        toolName,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /** Add any component */
  add(component: UIComponent): this {
    this._resp.components.push(component);
    return this;
  }

  /** Add a banner */
  banner(text: string, variant: BannerComponent['variant'], opts?: { icon?: string; confetti?: boolean }): this {
    return this.add({ component: 'Banner', text, variant, ...opts });
  }

  /** Add a text block */
  text(text: string, style?: TextBlockComponent['style']): this {
    return this.add({ component: 'TextBlock', text, style });
  }

  /** Add a progress bar */
  progress(current: number, total: number, label?: string): this {
    return this.add({ component: 'ProgressBar', current, total, label, showPercent: true });
  }

  /** Add step progress */
  steps(steps: StepProgressComponent['steps'], currentIndex: number): this {
    return this.add({ component: 'StepProgress', steps, currentIndex });
  }

  /** Add info card */
  card(title: string, fields: InfoCardComponent['fields'], opts?: Partial<InfoCardComponent>): this {
    return this.add({ component: 'InfoCard', title, fields, ...opts });
  }

  /** Add a primary button */
  primaryButton(label: string, action: UIActionPayload, icon?: string): this {
    return this.add({ component: 'Button', label, variant: 'primary', action, icon });
  }

  /** Add a secondary button */
  secondaryButton(label: string, action: UIActionPayload, icon?: string): this {
    return this.add({ component: 'Button', label, variant: 'secondary', action, icon });
  }

  /** Add divider */
  divider(label?: string): this {
    return this.add({ component: 'Divider', label });
  }

  /** Set session state updates */
  stateUpdates(updates: Partial<SessionState>): this {
    this._resp.stateUpdates = updates;
    return this;
  }

  /** Set raw data */
  data(data: Record<string, unknown>): this {
    this._resp.data = data;
    return this;
  }

  /** Set next suggested tools */
  nextTools(...tools: string[]): this {
    this._resp._meta.nextSuggestedTools = tools;
    return this;
  }

  build(): StructuredUIResponse {
    return this._resp;
  }

  toJSON(): string {
    return JSON.stringify(this._resp, null, 2);
  }
}

/** Entry point for building structured UI responses */
export function structuredResponse(screen: SessionScreen, toolName: string): StructuredResponseBuilder {
  return new StructuredResponseBuilder(screen, toolName);
}

// Convenience namespace
export const uiComponents = {
  structuredResponse,
  primaryButton,
  secondaryButton,
  dangerButton,
  button,
  formField,
  formGroup,
  multiSelect,
  selectionCard,
  statusBadge,
  stepProgress,
  progressBar,
  infoCard,
  appointmentSummary,
  taxProCard,
  checklist,
  banner,
  divider,
  textBlock,
  carousel,
  toolAction,
  messageAction,
  navigateAction,
  submitFormAction,
} as const;
