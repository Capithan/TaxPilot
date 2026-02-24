/**
 * Welcome / Home screen formatter for the ChatGPT app UI.
 *
 * Provides an immediately usable UI surface when the MCP app is added,
 * mirroring the Quizzes-style experience with buttons and cards the
 * model can show without waiting for user input.
 */

import {
  structuredResponse,
  banner,
  textBlock,
  selectionCard,
  stepProgress,
  infoCard,
  checklist,
  primaryButton,
  secondaryButton,
  toolAction,
  messageAction,
} from '../components.builders.js';

import type { StructuredUIResponse } from '../components.types.js';

/** Build the home screen shown on first load. */
export function formatWelcomeScreen(): StructuredUIResponse {
  return structuredResponse('home', 'render_welcome_ui')
    .banner('Welcome to H&R Block TaxPilot', 'info', { icon: '👋', confetti: true })
    .text('Fast, guided intake built for ChatGPT.', 'heading')
    .text('Start with the guided intake, or jump to documents and booking.', 'body')
    .add(stepProgress([
      { id: 'intake', label: 'Intake', status: 'active' },
      { id: 'documents', label: 'Docs', status: 'upcoming' },
      { id: 'match', label: 'Match', status: 'upcoming' },
      { id: 'book', label: 'Book', status: 'upcoming' },
      { id: 'reminders', label: 'Reminders', status: 'upcoming' },
    ], 0))
    .add(selectionCard('What do you want to do?', [
      { id: 'start_intake', label: 'Start guided intake', description: 'Collect everything in one flow', icon: '🧭', badge: 'Recommended' },
      { id: 'documents', label: 'See my document list', description: 'Personalized checklist and reminders', icon: '📋' },
      { id: 'routing', label: 'Match me to a tax pro', description: 'Get the right expert for your situation', icon: '👩‍💼' },
      { id: 'questions', label: 'Ask a quick question', description: 'Chat without starting intake', icon: '💬' },
    ], messageAction('Start my guided tax intake'))) // message gives the model a clear intent
    .add(infoCard('Built-in guardrails', [
      { label: 'Flow aware', value: '10-stage flow with progress', icon: '🧭' },
      { label: 'UI-first', value: 'Structured cards and forms', icon: '🧩' },
      { label: 'Reminders', value: 'Auto-create checklist nudges', icon: '🔔' },
      { label: 'Scheduling', value: 'Book with the best tax pro', icon: '📅' },
    ], {
      subtitle: 'Everything renders directly in ChatGPT — no portals or downloads.',
      highlight: 'Tip: use the buttons below to launch the right flow instantly.',
    }))
    .add(checklist('You can complete', [
      { id: 'intake', text: 'Guided intake and summary review', status: 'pending' },
      { id: 'documents', text: 'Document checklist + reminders', status: 'pending' },
      { id: 'routing', text: 'Tax pro matching and booking', status: 'pending' },
    ], { icon: '🚀', counter: { done: 0, total: 3 } }))
    .primaryButton('🚀 Start guided intake', toolAction('start_intake'))
    .secondaryButton('📊 Resume where I left off', toolAction('get_conversation_flow'))
    .secondaryButton('📋 Just show my checklist', toolAction('generate_document_checklist'))
    .stateUpdates({ screen: 'home', intakeProgress: 0 })
    .nextTools('start_intake', 'get_conversation_flow')
    .build();
}
