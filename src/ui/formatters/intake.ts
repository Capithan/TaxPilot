/**
 * Intake Domain UI Formatter (v2 — Structured UI-First)
 *
 * Produces StructuredUIResponse objects with interactive form fields,
 * selection cards, and multi-select components so every intake step
 * presents proper input controls from the very start.
 *
 * Follows OpenAI UX Principles:
 *   - "Design for conversational entry" — proper input affordances
 *   - "Helpful UI only" — every widget advances the current task
 *   - "Optimize for conversation, not navigation" — concise, inline forms
 */

import type { ClientProfile, IntakeStep } from '../../types/index.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const STEP_LABELS: Record<string, string> = {
  personal_info: 'Personal Information',
  filing_status: 'Filing Status',
  dependents: 'Dependents',
  employment: 'Employment',
  income_types: 'Income Types',
  deductions: 'Deductions',
  special_situations: 'Special Situations',
  document_upload: 'Document Upload',
  review: 'Review',
  complete: 'Complete',
};

const TOTAL_STEPS = 9;

const ALL_STEP_IDS: IntakeStep[] = [
  'personal_info', 'filing_status', 'dependents', 'employment',
  'income_types', 'deductions', 'special_situations', 'document_upload', 'review',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Stable deterministic ID for a given screen + step combination.
 *  ChatGPT's tree reconciler matches nodes by id — random ids cause
 *  "Cannot moveNode" errors because the reconciler can't correlate
 *  old vs new trees. Using a stable id lets reconciliation succeed.
 */
function stableId(screen: string, step?: string): string {
  return step ? `taxpilot-${screen}-${step}` : `taxpilot-${screen}`;
}

/** Build the step-progress component shown at the top of every intake screen. */
function buildStepProgress(currentStep: IntakeStep, completedSteps: string[]) {
  return {
    type: 'step_progress' as const,
    steps: ALL_STEP_IDS.map(id => ({
      id,
      label: STEP_LABELS[id] || id,
      status: completedSteps.includes(id) ? 'done' as const
        : id === currentStep ? 'active' as const
        : 'upcoming' as const,
    })),
    currentIndex: ALL_STEP_IDS.indexOf(currentStep),
  };
}

/** Build a progress bar for the intake. */
function buildProgressBar(completedSteps: string[]) {
  return {
    type: 'progress_bar' as const,
    value: completedSteps.length,
    max: TOTAL_STEPS,
    label: `Step ${completedSteps.length + 1} of ${TOTAL_STEPS}`,
  };
}

/** Tool-call action in the renderer's expected format. */
function toolCallAction(tool: string, parameters: Record<string, unknown> = {}) {
  return { type: 'tool_call' as const, tool, parameters };
}

/** Submit-form action in the renderer's expected format. */
function submitFormAction() {
  return { type: 'submit_form' as const };
}

// ─── Step-specific UI builders ───────────────────────────────────────────────

function personalInfoUI(sessionId: string) {
  return {
    type: 'form_group',
    title: 'Tell us about yourself',
    description: 'We need some basic information to get started with your tax return.',
    fields: [
      { type: 'form_field', id: 'firstName', label: 'First Name', fieldType: 'text', placeholder: 'John', required: true },
      { type: 'form_field', id: 'lastName', label: 'Last Name', fieldType: 'text', placeholder: 'Smith', required: true },
      { type: 'form_field', id: 'email', label: 'Email Address', fieldType: 'email', placeholder: 'john.smith@email.com', required: true },
      { type: 'form_field', id: 'phone', label: 'Phone Number', fieldType: 'phone', placeholder: '(555) 123-4567', required: true },
      { type: 'form_field', id: 'dateOfBirth', label: 'Date of Birth', fieldType: 'date', placeholder: 'MM/DD/YYYY', helperText: 'Enter as MM/DD/YYYY', required: true },
      { type: 'form_field', id: 'address', label: 'Current Address', fieldType: 'textarea', placeholder: '123 Main St, City, State, ZIP', rows: 2, required: true },
    ],
    submitLabel: 'Continue →',
    action: toolCallAction('process_intake_response', { sessionId, step: 'personal_info' }),
  };
}

function filingStatusUI(sessionId: string) {
  return {
    type: 'selection_card',
    title: 'What is your filing status?',
    options: [
      { id: 'single', label: 'Single', description: 'Unmarried or legally separated', icon: '👤' },
      { id: 'married_filing_jointly', label: 'Married Filing Jointly', description: 'Married and filing a combined return', icon: '👫' },
      { id: 'married_filing_separately', label: 'Married Filing Separately', description: 'Married but each filing their own return', icon: '↔️' },
      { id: 'head_of_household', label: 'Head of Household', description: 'Unmarried and paying 50%+ of household costs', icon: '🏠' },
      { id: 'qualifying_widow', label: 'Qualifying Surviving Spouse', description: 'Spouse passed away in the last 2 years', icon: '🕊️' },
    ],
    action: toolCallAction('process_intake_response', { sessionId, step: 'filing_status' }),
  };
}

function dependentsUI(sessionId: string) {
  return [
    {
      type: 'selection_card',
      title: 'Do you have any dependents to claim?',
      options: [
        { id: 'yes', label: 'Yes, I have dependents', description: 'Children or qualifying relatives', icon: '👨‍👩‍👧‍👦' },
        { id: 'no', label: 'No dependents', description: 'Skip this section', icon: '➡️' },
      ],
      action: toolCallAction('process_intake_response', { sessionId, step: 'dependents_choice' }),
    },
  ];
}

function dependentFormUI(sessionId: string) {
  return {
    type: 'form_group',
    title: 'Add a Dependent',
    description: 'Provide information for each dependent you wish to claim.',
    fields: [
      { type: 'form_field', id: 'depFirstName', label: 'First Name', fieldType: 'text', placeholder: 'Jane', required: true },
      { type: 'form_field', id: 'depLastName', label: 'Last Name', fieldType: 'text', placeholder: 'Smith', required: true },
      { type: 'form_field', id: 'depRelationship', label: 'Relationship', fieldType: 'select', required: true, options: [
        { label: 'Son', value: 'son' },
        { label: 'Daughter', value: 'daughter' },
        { label: 'Stepchild', value: 'stepchild' },
        { label: 'Foster child', value: 'foster_child' },
        { label: 'Sibling', value: 'sibling' },
        { label: 'Parent', value: 'parent' },
        { label: 'Other relative', value: 'other' },
      ]},
      { type: 'form_field', id: 'depDOB', label: 'Date of Birth', fieldType: 'date', required: true },
      { type: 'form_field', id: 'depMonths', label: 'Months Lived With You', fieldType: 'number', placeholder: '12', required: true, helpText: 'Number of months in 2025 this dependent lived with you' },
    ],
    submitLabel: 'Add Dependent & Continue →',
    action: toolCallAction('process_intake_response', { sessionId, step: 'dependents_add' }),
  };
}

function employmentUI(sessionId: string) {
  return {
    type: 'form_group',
    title: 'Employment Information',
    description: 'Tell us about your employment and income sources in 2025.',
    fields: [
      { type: 'form_field', id: 'employerName', label: 'Primary Employer Name', fieldType: 'text', placeholder: 'Acme Corporation', required: true },
      { type: 'form_field', id: 'jobTitle', label: 'Job Title', fieldType: 'text', placeholder: 'Software Engineer' },
      { type: 'form_field', id: 'incomeType', label: 'Income Type', fieldType: 'select', required: true, options: [
        { label: 'W-2 Employee', value: 'W2' },
        { label: '1099 Contractor', value: '1099' },
        { label: 'Both W-2 and 1099', value: 'both' },
      ]},
      { type: 'form_field', id: 'selfEmployed', label: 'Self-Employment / Freelance', fieldType: 'select', required: true, options: [
        { label: 'Yes — I have self-employment or freelance income', value: 'yes' },
        { label: 'No', value: 'no' },
      ]},
      { type: 'form_field', id: 'estimatedIncome', label: 'Estimated Total Income', fieldType: 'number', placeholder: '75000', helpText: 'Approximate gross income for 2025' },
    ],
    submitLabel: 'Continue →',
    action: toolCallAction('process_intake_response', { sessionId, step: 'employment' }),
  };
}

function incomeTypesUI(sessionId: string) {
  return {
    type: 'multi_select',
    title: 'Additional Income Sources',
    subtitle: 'Besides employment, did you receive any of these income types in 2025? Select all that apply.',
    multiSelect: true,
    minSelect: 0,
    options: [
      { id: 'investment_income', label: 'Investments', description: 'Stocks, bonds, mutual funds', icon: '📈' },
      { id: 'dividends', label: 'Dividends', description: 'Dividend income from stocks/funds', icon: '💵' },
      { id: 'rental_income', label: 'Rental Income', description: 'Income from rental property', icon: '🏘️' },
      { id: 'retirement_distributions', label: 'Retirement Distributions', description: '401(k), IRA, or pension withdrawals', icon: '🏦' },
      { id: 'social_security', label: 'Social Security', description: 'Social Security benefits received', icon: '🏛️' },
      { id: 'crypto_income', label: 'Cryptocurrency', description: 'Bitcoin, Ethereum, or other crypto', icon: '₿' },
      { id: 'gig_economy', label: 'Gig Economy', description: 'Uber, Lyft, DoorDash, etc.', icon: '🚗' },
      { id: 'foreign_income', label: 'Foreign Income', description: 'Income earned outside the U.S.', icon: '🌍' },
      { id: 'unemployment', label: 'Unemployment', description: 'Unemployment compensation', icon: '📋' },
      { id: 'other', label: 'Other Income', description: 'Alimony, gambling, other sources', icon: '📦' },
    ],
    submitLabel: 'Continue →',
    action: toolCallAction('process_intake_response', { sessionId, step: 'income_types' }),
  };
}

function deductionsUI(sessionId: string) {
  return {
    type: 'multi_select',
    title: 'Potential Deductions & Credits',
    subtitle: 'Select any deductions that may apply to you. This helps us maximize your refund.',
    multiSelect: true,
    minSelect: 0,
    options: [
      { id: 'mortgage_interest', label: 'Mortgage Interest', description: 'Interest on your home loan', icon: '🏠' },
      { id: 'property_taxes', label: 'Property Taxes', description: 'Real estate property taxes paid', icon: '🏡' },
      { id: 'charitable_donations', label: 'Charitable Donations', description: 'Cash or property given to charities', icon: '❤️' },
      { id: 'student_loan_interest', label: 'Student Loan Interest', description: 'Interest paid on student loans', icon: '🎓' },
      { id: '401k_contributions', label: '401(k) Contributions', description: 'Employer retirement plan contributions', icon: '💰' },
      { id: 'ira_contributions', label: 'IRA Contributions', description: 'Traditional or Roth IRA contributions', icon: '🏦' },
      { id: 'hsa_contributions', label: 'HSA Contributions', description: 'Health Savings Account contributions', icon: '🏥' },
      { id: 'home_office', label: 'Home Office', description: 'Dedicated home office space', icon: '💻' },
      { id: 'business_expenses', label: 'Business Expenses', description: 'Supplies, travel, and other business costs', icon: '💼' },
      { id: 'childcare_expenses', label: 'Childcare / Dependent Care', description: 'Daycare, after-school care', icon: '👶' },
      { id: 'medical_expenses', label: 'Medical Expenses', description: 'Unreimbursed medical costs', icon: '⚕️' },
      { id: 'educator_expenses', label: 'Educator Expenses', description: 'If you\'re a teacher (up to $300)', icon: '📚' },
    ],
    submitLabel: 'Continue →',
    action: toolCallAction('process_intake_response', { sessionId, step: 'deductions' }),
  };
}

function specialSituationsUI(sessionId: string) {
  return {
    type: 'multi_select',
    title: 'Special Tax Situations',
    subtitle: 'Do any of these apply to you? Select all that are relevant.',
    multiSelect: true,
    minSelect: 0,
    options: [
      { id: 'crypto', label: 'Bought / Sold Cryptocurrency', description: 'Any crypto transactions during the year', icon: '₿' },
      { id: 'foreign_accounts', label: 'Foreign Bank Accounts', description: 'Accounts held outside the U.S. (FBAR)', icon: '🌐' },
      { id: 'real_estate', label: 'Bought / Sold Real Estate', description: 'Property purchases or sales', icon: '🏢' },
      { id: 'marriage', label: 'Got Married', description: 'Married during the tax year', icon: '💍' },
      { id: 'divorce', label: 'Got Divorced', description: 'Divorce finalized during the tax year', icon: '📄' },
      { id: 'new_baby', label: 'Had a Baby', description: 'New child born or adopted', icon: '👶' },
      { id: 'moved_states', label: 'Moved to Another State', description: 'Changed state of residence', icon: '🚚' },
      { id: 'health_insurance_gap', label: 'Health Insurance Gap', description: 'Period without coverage', icon: '🏥' },
    ],
    submitLabel: 'Continue →',
    action: toolCallAction('process_intake_response', { sessionId, step: 'special_situations' }),
  };
}

function documentUploadUI(sessionId: string) {
  return {
    type: 'selection_card',
    title: 'Document Preparation',
    options: [
      { id: 'ready', label: 'I have my documents ready', description: 'W-2s, 1099s, and other forms on hand', icon: '✅' },
      { id: 'need_checklist', label: 'Show me what I need', description: 'Generate a personalized document checklist', icon: '📋' },
      { id: 'skip', label: 'I\'ll gather them later', description: 'Continue and collect documents before your appointment', icon: '⏭️' },
    ],
    action: toolCallAction('process_intake_response', { sessionId, step: 'document_upload' }),
  };
}

// ─── Main Structured Response Builder ────────────────────────────────────────

/**
 * Wraps any step components into a full StructuredUIResponse
 * with consistent step progress, branding, and metadata.
 */
function buildStructuredResponse(
  screen: string,
  toolName: string,
  currentStep: IntakeStep,
  completedSteps: string[],
  stepComponents: Record<string, unknown>[],
  data: Record<string, unknown>,
  opts?: { banner?: Record<string, unknown>; stateUpdates?: Record<string, unknown> },
) {
  const components: Record<string, unknown>[] = [];

  // Optional banner at the top (for step transitions)
  if (opts?.banner) {
    components.push(opts.banner);
  }

  // Step progress indicator
  components.push(buildStepProgress(currentStep, completedSteps));

  // Progress bar
  components.push(buildProgressBar(completedSteps));

  // Step title
  components.push({
    type: 'text_block',
    text: `Step ${completedSteps.length + 1}: ${STEP_LABELS[currentStep] || currentStep}`,
    style: 'heading',
  });

  // Step-specific components (form, selection card, multi-select, etc.)
  components.push(...stepComponents);

  return {
    id: stableId(screen, currentStep),
    screen,
    components,
    stateUpdates: {
      screen: 'intake',
      currentIntakeStep: currentStep,
      intakeProgress: Math.round((completedSteps.length / TOTAL_STEPS) * 100),
      completedSteps,
      ...opts?.stateUpdates,
    },
    data,
    _meta: {
      toolName,
      timestamp: new Date().toISOString(),
      nextSuggestedTools: ['process_intake_response', 'get_intake_progress'],
    },
  };
}

/** Get the step-specific UI components for a given intake step. */
function getStepComponents(step: IntakeStep, sessionId: string): Record<string, unknown>[] {
  switch (step) {
    case 'personal_info':
      return [personalInfoUI(sessionId)];
    case 'filing_status':
      return [filingStatusUI(sessionId)];
    case 'dependents':
      return dependentsUI(sessionId);
    case 'employment':
      return [employmentUI(sessionId)];
    case 'income_types':
      return [incomeTypesUI(sessionId)];
    case 'deductions':
      return [deductionsUI(sessionId)];
    case 'special_situations':
      return [specialSituationsUI(sessionId)];
    case 'document_upload':
      return [documentUploadUI(sessionId)];
    case 'review':
      return []; // handled separately
    default:
      return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

/** Format the start_intake tool response — shows the first step's form immediately. */
export function formatIntakeStart(result: {
  session: { id: string };
  client: { id: string };
  currentStep: IntakeStep;
  nextQuestion: string;
}, flowStage?: string): Record<string, unknown> {
  const sessionId = result.session.id;
  const currentStep = result.currentStep;
  const completedSteps: string[] = [];

  const stepComponents = getStepComponents(currentStep, sessionId);

  return buildStructuredResponse(
    'intake',
    'start_intake',
    currentStep,
    completedSteps,
    [
      // Welcome banner
      { type: 'banner', text: 'Welcome to TaxPilot! Let\'s collect your tax information step by step.', variant: 'info', icon: '🚀' },
      // Remove the step progress we'd normally add — it's handled by buildStructuredResponse
      // Directly show the form
      ...stepComponents,
    ],
    {
      sessionId,
      clientId: result.client.id,
      currentStep,
      nextQuestion: result.nextQuestion,
    },
    {
      stateUpdates: {
        sessionId,
        clientId: result.client.id,
      },
    },
  );
}

/** Format the process_intake_response tool response — shows next step's form. */
export function formatIntakeResponse(result: {
  success: boolean;
  nextQuestion?: string;
  currentStep?: IntakeStep;
  stepCompleted?: boolean;
  intakeCompleted?: boolean;
  client?: ClientProfile;
  message?: string;
}, sessionId: string, progressInfo?: {
  completedSteps: string[];
  totalSteps: number;
  percentComplete: number;
}): Record<string, unknown> {
  // ── Intake completed — celebration! ──────────────────────
  if (result.intakeCompleted) {
    return {
      id: stableId('summary', 'complete'),
      screen: 'summary',
      components: [
        { type: 'banner', text: 'Congratulations! Your intake is 100% complete.', variant: 'success', icon: '🎉', confetti: true },
        buildStepProgress('complete' as IntakeStep, ALL_STEP_IDS as string[]),
        { type: 'progress_bar', value: TOTAL_STEPS, max: TOTAL_STEPS, label: 'Complete!' },
        { type: 'text_block', text: 'Intake Complete!', style: 'heading' },
        {
          type: 'info_card',
          title: 'What\'s Next',
          badge: { text: 'Complete', variant: 'success' },
          fields: [
            { label: 'Client', value: `${result.client?.firstName || ''} ${result.client?.lastName || ''}`, icon: '👤' },
            { label: 'Status', value: 'Ready for review', icon: '✅' },
          ],
          highlight: 'We\'ll now show you a summary of everything we collected. Please review it carefully.',
        },
        {
          type: 'button', label: 'View Summary', variant: 'primary', icon: '📄',
          action: toolCallAction('get_client_summary', { clientId: result.client?.id }),
        },
        {
          type: 'button', label: 'Check Progress', variant: 'secondary', icon: '📊',
          action: toolCallAction('get_flow_progress', { clientId: result.client?.id }),
        },
      ],
      stateUpdates: {
        screen: 'summary',
        intakeProgress: 100,
      },
      data: { sessionId, clientId: result.client?.id, intakeCompleted: true },
      _meta: { toolName: 'process_intake_response', timestamp: new Date().toISOString(), nextSuggestedTools: ['get_client_summary'] },
    };
  }

  // ── Next step form ──────────────────────────────────────────
  const currentStep = result.currentStep || 'personal_info';
  const completedSteps = progressInfo?.completedSteps ?? [];
  const stepComponents = getStepComponents(currentStep as IntakeStep, sessionId);

  // Review step — build summary from client data
  if (currentStep === 'review' && result.client) {
    return buildReviewUI(sessionId, result.client, completedSteps);
  }

  const bannerOpt = result.stepCompleted
    ? { banner: { type: 'banner', text: `✅ Step completed! Now let's work on ${STEP_LABELS[currentStep] || currentStep}.`, variant: 'success' as const } }
    : undefined;

  return buildStructuredResponse(
    'intake',
    'process_intake_response',
    currentStep as IntakeStep,
    completedSteps,
    stepComponents,
    {
      sessionId,
      clientId: result.client?.id,
      currentStep,
      nextQuestion: result.nextQuestion,
      stepCompleted: result.stepCompleted,
    },
    bannerOpt,
  );
}

/** Build the review screen that shows all collected info with a confirm button. */
function buildReviewUI(sessionId: string, client: ClientProfile, completedSteps: string[]) {
  const fields: Array<{ label: string; value: string; icon?: string }> = [
    { label: 'Name', value: `${client.firstName} ${client.lastName}`, icon: '🏷️' },
    { label: 'Email', value: client.email || '—', icon: '📧' },
    { label: 'Phone', value: client.phone || '—', icon: '📱' },
    { label: 'Filing Status', value: client.filingStatus.replace(/_/g, ' '), icon: '📋' },
    { label: 'Dependents', value: String(client.dependents.length), icon: '👶' },
  ];

  if (client.incomeTypes.length > 0) {
    fields.push({ label: 'Income Sources', value: client.incomeTypes.map(t => t.replace(/_/g, ' ')).join(', '), icon: '💰' });
  }
  if (client.deductions.length > 0) {
    fields.push({ label: 'Deductions', value: client.deductions.map(d => d.replace(/_/g, ' ')).join(', '), icon: '✂️' });
  }

  const specials: string[] = [];
  if (client.hasCrypto) specials.push('Cryptocurrency');
  if (client.hasForeignAccounts) specials.push('Foreign Accounts');
  if (client.hasRentalProperty) specials.push('Rental Property');
  if (client.hasBusinessIncome) specials.push('Business Income');
  if (specials.length > 0) {
    fields.push({ label: 'Special Situations', value: specials.join(', '), icon: '⚠️' });
  }

  return {
    id: stableId('intake', 'review'),
    screen: 'intake',
    components: [
      { type: 'banner', text: 'Almost done! Please review your information below.', variant: 'info', icon: '📋' },
      buildStepProgress('review', completedSteps),
      buildProgressBar(completedSteps),
      { type: 'text_block', text: 'Step 9: Review Your Information', style: 'heading' },
      {
        type: 'info_card',
        title: 'Your Tax Profile',
        badge: { text: `Score: ${client.complexityScore}`, variant: client.complexityScore < 30 ? 'success' : client.complexityScore < 60 ? 'info' : 'warning' },
        fields,
        highlight: 'Please review all details. Click "Confirm" if everything is correct, or "Make Changes" to go back.',
      },
      {
        type: 'button', label: '✅ Confirm — Everything is Correct', variant: 'primary', icon: '✅',
        action: toolCallAction('process_intake_response', { sessionId, step: 'review', answer: 'confirmed' }),
      },
      {
        type: 'button', label: '✏️ I Need to Make Changes', variant: 'secondary', icon: '✏️',
        action: toolCallAction('process_intake_response', { sessionId, step: 'review', answer: 'changes_needed' }),
      },
    ],
    stateUpdates: {
      screen: 'intake',
      currentIntakeStep: 'review',
      intakeProgress: Math.round((completedSteps.length / TOTAL_STEPS) * 100),
    },
    data: { sessionId, clientId: client.id, currentStep: 'review' },
    _meta: { toolName: 'process_intake_response', timestamp: new Date().toISOString(), nextSuggestedTools: ['process_intake_response'] },
  };
}

/** Format the get_intake_progress tool response. */
export function formatIntakeProgress(progress: {
  currentStep: IntakeStep;
  completedSteps: IntakeStep[];
  totalSteps: number;
  percentComplete: number;
  remainingSteps: IntakeStep[];
} | null, sessionId: string): Record<string, unknown> {
  if (!progress) {
    return {
      id: stableId('intake', 'error'),
      screen: 'intake',
      components: [
        { type: 'banner', text: 'Session not found. Please start a new intake.', variant: 'error', icon: '❌' },
        { type: 'button', label: 'Start New Intake', variant: 'primary', icon: '🔄', action: toolCallAction('start_intake') },
      ],
      data: { error: 'session_not_found' },
      _meta: { toolName: 'get_intake_progress', timestamp: new Date().toISOString() },
    };
  }

  const components: Record<string, unknown>[] = [
    { type: 'text_block', text: `Intake Progress — ${progress.percentComplete}% Complete`, style: 'heading' },
    buildStepProgress(progress.currentStep, progress.completedSteps as string[]),
    { type: 'progress_bar', value: progress.completedSteps.length, max: progress.totalSteps, label: `Step ${progress.completedSteps.length + 1} of ${progress.totalSteps}` },
  ];

  // Show the current step's form so the user can continue directly
  const stepComponents = getStepComponents(progress.currentStep, sessionId);
  if (stepComponents.length > 0) {
    components.push({ type: 'divider', label: 'Continue' });
    components.push(...stepComponents);
  }

  components.push({
    type: 'button', label: 'Continue Intake', variant: 'primary', icon: '▶️',
    action: toolCallAction('process_intake_response', { sessionId }),
  });

  return {
    id: stableId('intake', progress.currentStep),
    screen: 'intake',
    components,
    data: {
      sessionId,
      currentStep: progress.currentStep,
      completedSteps: progress.completedSteps,
      percentComplete: progress.percentComplete,
    },
    _meta: { toolName: 'get_intake_progress', timestamp: new Date().toISOString() },
  };
}

/** Format the get_client_summary tool response. */
export function formatClientSummary(
  client: ClientProfile,
  summaryText: string,
): Record<string, unknown> {
  const complexityLabel = client.complexityScore < 30 ? 'Simple'
    : client.complexityScore < 60 ? 'Moderate'
    : client.complexityScore < 80 ? 'Complex'
    : 'Expert';

  const complexityVariant = client.complexityScore < 30 ? 'success'
    : client.complexityScore < 60 ? 'info'
    : client.complexityScore < 80 ? 'warning'
    : 'error';

  const fields: Array<{ label: string; value: string; icon?: string }> = [
    { label: 'Name', value: `${client.firstName} ${client.lastName}`, icon: '🏷️' },
    { label: 'Email', value: client.email || '—', icon: '📧' },
    { label: 'Phone', value: client.phone || '—', icon: '📱' },
    { label: 'Filing Status', value: client.filingStatus.replace(/_/g, ' '), icon: '📋' },
    { label: 'Dependents', value: String(client.dependents.length), icon: '👶' },
  ];

  const components: Record<string, unknown>[] = [
    { type: 'text_block', text: `${client.firstName} ${client.lastName}`, style: 'heading' },
    { type: 'text_block', text: `${client.filingStatus.replace(/_/g, ' ')} · Complexity: ${client.complexityScore}/100`, style: 'subheading' },
    {
      type: 'info_card',
      title: 'Profile',
      badge: { text: complexityLabel, variant: complexityVariant },
      fields,
    },
  ];

  // Income section
  if (client.incomeTypes.length > 0) {
    components.push({
      type: 'info_card',
      title: 'Income Sources',
      fields: client.incomeTypes.map(t => ({ label: t.replace(/_/g, ' '), value: '✓', icon: '💵' })),
    });
  }

  // Deductions section
  if (client.deductions.length > 0) {
    components.push({
      type: 'info_card',
      title: 'Deductions',
      fields: client.deductions.map(d => ({ label: d.replace(/_/g, ' '), value: '✓', icon: '✂️' })),
    });
  }

  // Special situations
  const specials: string[] = [];
  if (client.hasCrypto) specials.push('Cryptocurrency');
  if (client.hasForeignAccounts) specials.push('Foreign Accounts');
  if (client.hasRentalProperty) specials.push('Rental Property');
  if (client.hasBusinessIncome) specials.push('Business Income');
  if (specials.length > 0) {
    components.push({
      type: 'info_card',
      title: 'Special Situations',
      badge: { text: `${specials.length} items`, variant: 'warning' },
      fields: specials.map(s => ({ label: s, value: '⚠️ Applies', icon: '🔸' })),
    });
  }

  components.push(
    { type: 'text_block', text: 'Please review this information carefully. Is everything correct?', style: 'body' },
    {
      type: 'button', label: '✅ Confirm — Everything is Correct', variant: 'primary', icon: '✅',
      action: toolCallAction('confirm_intake_summary', { clientId: client.id }),
    },
    {
      type: 'button', label: '✏️ I Need to Make Changes', variant: 'secondary', icon: '✏️',
      action: toolCallAction('process_intake_response', { sessionId: '' }),
    },
  );

  return {
    id: stableId('summary', 'client'),
    screen: 'summary',
    components,
    stateUpdates: { screen: 'summary' },
    data: {
      clientId: client.id,
      summaryText,
      complexityScore: client.complexityScore,
      complexityLevel: complexityLabel,
      intakeCompleted: client.intakeCompleted,
    },
    _meta: { toolName: 'get_client_summary', timestamp: new Date().toISOString(), nextSuggestedTools: ['confirm_intake_summary'] },
  };
}
