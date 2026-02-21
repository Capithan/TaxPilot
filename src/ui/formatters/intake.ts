/**
 * Intake Domain UI Formatter
 *
 * Transforms raw intake service results into structured UIResponse objects
 * with cards, progress bars, and interactive action buttons.
 */

import { ui } from '../builders.js';
import type { UIResponse } from '../types.js';
import type { ClientProfile, IntakeStep } from '../../types/index.js';

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

/** Format the start_intake tool response. */
export function formatIntakeStart(result: {
  session: { id: string };
  client: { id: string };
  currentStep: IntakeStep;
  nextQuestion: string;
}, flowStage?: string): UIResponse {
  return ui.response('intake_start', 'start_intake')
    .title('📋 Welcome to TaxPilot')
    .subtitle('Your AI tax intake assistant')
    .banner('Let\'s get your tax information organized!', 'info', { icon: '🚀' })
    .progress(0, TOTAL_STEPS, 'Getting started')
    .card('Welcome', c => c
      .icon('👋')
      .field('Session ID', result.session.id, '🔑')
      .field('Client ID', result.client.id, '👤')
      .field('Current Step', STEP_LABELS[result.currentStep] || result.currentStep, '📍')
      .highlight(result.nextQuestion)
    )
    .action('Answer First Question', 'process_intake_response', {
      sessionId: result.session.id,
    }, 'primary', '▶️')
    .data({
      sessionId: result.session.id,
      clientId: result.client.id,
      currentStep: result.currentStep,
      nextQuestion: result.nextQuestion,
    })
    .nextTools('process_intake_response', 'get_intake_progress')
    .flowStage(flowStage || 'intake_questions')
    .build();
}

/** Format the process_intake_response tool response. */
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
}): UIResponse {
  // Intake completed — celebration!
  if (result.intakeCompleted) {
    return ui.response('intake_complete', 'process_intake_response')
      .title('🎉 Intake Complete!')
      .subtitle('All your information has been collected')
      .banner('Congratulations! Your intake is 100% complete.', 'success', {
        icon: '🎉',
        confetti: true,
      })
      .progress(TOTAL_STEPS, TOTAL_STEPS, 'Complete!')
      .card('What\'s Next', c => c
        .icon('➡️')
        .field('Client ID', result.client?.id || '', '👤')
        .field('Status', 'Ready for review', '✅')
        .highlight('I\'ll now show you a summary of everything we collected. Please review it carefully.')
      )
      .action('View Summary', 'get_client_summary', {
        clientId: result.client?.id,
      }, 'primary', '📄')
      .action('Check Progress', 'get_flow_progress', {
        clientId: result.client?.id,
      }, 'secondary', '📊')
      .data({
        sessionId,
        clientId: result.client?.id,
        intakeCompleted: true,
      })
      .nextTools('get_client_summary', 'get_conversation_flow')
      .flowStage('summary_review')
      .build();
  }

  // Normal question flow
  const stepsDone = progressInfo?.completedSteps.length ?? 0;
  const stepLabel = result.currentStep
    ? STEP_LABELS[result.currentStep] || result.currentStep
    : 'Processing';

  const builder = ui.response('intake_question', 'process_intake_response')
    .title(`📝 ${stepLabel}`)
    .progress(stepsDone, TOTAL_STEPS, `Step ${stepsDone + 1} of ${TOTAL_STEPS}`);

  if (result.stepCompleted) {
    builder.banner(`✅ Previous step completed! Moving to ${stepLabel}.`, 'success');
  }

  if (result.nextQuestion) {
    builder.subtitle(result.nextQuestion);
    builder.card('Current Question', c => {
      c.icon('❓')
        .field('Step', stepLabel, '📍')
        .highlight(result.nextQuestion!);
      if (result.stepCompleted) {
        c.badge('New Step', 'info', '🆕');
      }
    });
  }

  builder.action('Submit Answer', 'process_intake_response', {
    sessionId,
  }, 'primary', '✏️');

  builder.data({
    sessionId,
    clientId: result.client?.id,
    currentStep: result.currentStep,
    nextQuestion: result.nextQuestion,
    stepCompleted: result.stepCompleted,
  });

  builder.nextTools('process_intake_response', 'get_intake_progress');

  return builder.build();
}

/** Format the get_intake_progress tool response. */
export function formatIntakeProgress(progress: {
  currentStep: IntakeStep;
  completedSteps: IntakeStep[];
  totalSteps: number;
  percentComplete: number;
  remainingSteps: IntakeStep[];
} | null, sessionId: string): UIResponse {
  if (!progress) {
    return ui.response('error', 'get_intake_progress')
      .title('❌ Session Not Found')
      .message('The intake session was not found. Please start a new session.')
      .action('Start New Intake', 'start_intake', {}, 'primary', '🔄')
      .data({ error: 'session_not_found' })
      .build();
  }

  const builder = ui.response('intake_progress', 'get_intake_progress')
    .title('📊 Intake Progress')
    .subtitle(`${progress.percentComplete}% complete`)
    .progress(progress.completedSteps.length, progress.totalSteps,
      `Step ${progress.completedSteps.length + 1} of ${progress.totalSteps}`);

  // Completed steps section
  if (progress.completedSteps.length > 0) {
    builder.section('Completed', sb => {
      sb.icon('✅');
      sb.counter(progress.completedSteps.length, progress.totalSteps);
      progress.completedSteps.forEach(step => {
        sb.item(STEP_LABELS[step] || step, { status: 'done', icon: '✅' });
      });
    });
  }

  // Current step
  builder.section('Current', sb => {
    sb.icon('📍');
    sb.item(STEP_LABELS[progress.currentStep] || progress.currentStep, {
      status: 'pending',
      icon: '🔵',
    });
  });

  // Remaining steps
  if (progress.remainingSteps.length > 0) {
    builder.section('Remaining', sb => {
      sb.icon('⏳');
      progress.remainingSteps.forEach(step => {
        sb.item(STEP_LABELS[step] || step, { status: 'optional', icon: '⚪' });
      });
    });
  }

  builder.action('Continue Intake', 'process_intake_response', {
    sessionId,
  }, 'primary', '▶️');

  builder.data({
    sessionId,
    currentStep: progress.currentStep,
    completedSteps: progress.completedSteps,
    percentComplete: progress.percentComplete,
  });

  return builder.build();
}

/** Format the get_client_summary tool response. */
export function formatClientSummary(
  client: ClientProfile,
  summaryText: string,
): UIResponse {
  const complexityLabel = client.complexityScore < 30 ? 'Simple'
    : client.complexityScore < 60 ? 'Moderate'
    : client.complexityScore < 80 ? 'Complex'
    : 'Expert';

  const complexityVariant = client.complexityScore < 30 ? 'success' as const
    : client.complexityScore < 60 ? 'info' as const
    : client.complexityScore < 80 ? 'warning' as const
    : 'error' as const;

  const builder = ui.response('client_summary', 'get_client_summary')
    .title(`👤 ${client.firstName} ${client.lastName}`)
    .subtitle(`${client.filingStatus.replace(/_/g, ' ')} · Complexity: ${client.complexityScore}/100`);

  // Profile card
  builder.card('Profile', c => {
    c.icon('👤')
      .badge(complexityLabel, complexityVariant, complexityLabel === 'Simple' ? '🟢'
        : complexityLabel === 'Moderate' ? '🟡'
        : complexityLabel === 'Complex' ? '🟠' : '🔴')
      .field('Name', `${client.firstName} ${client.lastName}`, '🏷️')
      .field('Email', client.email || '—', '📧')
      .field('Phone', client.phone || '—', '📱')
      .field('Filing Status', client.filingStatus.replace(/_/g, ' '), '📋')
      .field('Dependents', String(client.dependents.length), '👶');

    if (client.dependents.length > 0) {
      c.section('Dependents', sb => {
        sb.icon('👶');
        client.dependents.forEach(d => {
          sb.item(`${d.firstName} ${d.lastName}`, {
            description: `${d.relationship} · DOB: ${d.dateOfBirth}`,
          });
        });
      });
    }
  });

  // Income section
  if (client.incomeTypes.length > 0) {
    builder.section('Income Sources', sb => {
      sb.icon('💰');
      client.incomeTypes.forEach(t => {
        sb.item(t.replace(/_/g, ' '), { icon: '💵' });
      });
    });
  }

  // Deductions section
  if (client.deductions.length > 0) {
    builder.section('Deductions', sb => {
      sb.icon('📝');
      client.deductions.forEach(d => {
        sb.item(d.replace(/_/g, ' '), { icon: '✂️' });
      });
    });
  }

  // Special situations
  const specials: string[] = [];
  if (client.hasCrypto) specials.push('Cryptocurrency');
  if (client.hasForeignAccounts) specials.push('Foreign Accounts');
  if (client.hasRentalProperty) specials.push('Rental Property');
  if (client.hasBusinessIncome) specials.push('Business Income');
  if (specials.length > 0) {
    builder.section('Special Situations', sb => {
      sb.icon('⚠️');
      specials.forEach(s => sb.item(s, { icon: '🔸', status: 'required' }));
    });
  }

  builder.message('Please review this information carefully. Is everything correct? Would you like to make any changes?');

  builder.action('✅ Confirm — Everything is Correct', 'confirm_intake_summary', {
    clientId: client.id,
  }, 'success', '✅');
  builder.action('✏️ I Need to Make Changes', 'process_intake_response', {
    sessionId: '',
  }, 'secondary', '✏️');

  builder.data({
    clientId: client.id,
    summaryText,
    complexityScore: client.complexityScore,
    complexityLevel: complexityLabel,
    intakeCompleted: client.intakeCompleted,
  });

  builder.nextTools('confirm_intake_summary');
  builder.flowStage('summary_confirmation');

  return builder.build();
}
