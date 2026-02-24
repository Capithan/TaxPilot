/**
 * Structured UI Response Examples
 *
 * Demonstrates how backend formatters produce StructuredUIResponse objects
 * for each screen state. These are the JSON payloads the ChatGPT assistant
 * includes in its responses for the frontend to render.
 */

import {
  structuredResponse,
  primaryButton,
  secondaryButton,
  dangerButton,
  toolAction,
  messageAction,
  navigateAction,
  formField,
  formGroup,
  submitFormAction,
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
  textBlock,
  carousel,
  divider,
} from '../components.builders.js';

import type { StructuredUIResponse } from '../components.types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// HOME SCREEN — Welcome
// ═══════════════════════════════════════════════════════════════════════════════

export function buildHomeScreen(): StructuredUIResponse {
  return structuredResponse('home', 'welcome')
    .banner('Welcome to H&R Block TaxPilot!', 'info', { icon: '👋' })
    .text('Your AI-powered tax assistant. Let\'s get you matched with the perfect tax professional.', 'body')
    .add(selectionCard('How can I help you today?', [
      { id: 'full_intake', label: 'Prepare for my appointment', description: 'Full guided intake process', icon: '📝', badge: 'Recommended' },
      { id: 'documents', label: 'Get my documents together', description: 'Personalized document checklist', icon: '📋' },
      { id: 'find_pro', label: 'Find a tax professional', description: 'Get matched based on your needs', icon: '👨‍💼' },
      { id: 'learn', label: 'What can TaxPilot do?', description: 'Explore all features', icon: '💡' },
    ], messageAction('I need to prepare for my tax appointment')))
    .stateUpdates({ screen: 'home' })
    .nextTools('start_intake')
    .build();
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE SELECTION — Choose filing type
// ═══════════════════════════════════════════════════════════════════════════════

export function buildServiceSelection(): StructuredUIResponse {
  return structuredResponse('service_selection', 'start_intake')
    .add(stepProgress([
      { id: 'service', label: 'Service', status: 'active' },
      { id: 'info', label: 'Your Info', status: 'upcoming' },
      { id: 'documents', label: 'Documents', status: 'upcoming' },
      { id: 'match', label: 'Tax Pro', status: 'upcoming' },
      { id: 'book', label: 'Book', status: 'upcoming' },
    ], 0))
    .text('What type of tax help do you need?', 'heading')
    .add(multiSelect('Select all that apply:', [
      { id: 'individual', label: 'Individual Tax Return', description: 'W-2, 1099, standard deductions', icon: '👤' },
      { id: 'self_employed', label: 'Self-Employment', description: 'Freelance, 1099-NEC, business expenses', icon: '💼' },
      { id: 'investments', label: 'Investment Income', description: 'Stocks, bonds, crypto, capital gains', icon: '📈' },
      { id: 'rental', label: 'Rental Property', description: 'Rental income and deductions', icon: '🏠' },
      { id: 'business', label: 'Small Business', description: 'LLC, S-Corp, partnership', icon: '🏢' },
      { id: 'foreign', label: 'Foreign Income', description: 'FBAR, FATCA, foreign tax credits', icon: '🌍' },
    ], toolAction('process_intake_response', {}), {
      subtitle: 'This helps us match you with the right specialist',
      multiSelect: true,
      minSelect: 1,
      submitLabel: 'Continue',
    }))
    .stateUpdates({ screen: 'service_selection' })
    .nextTools('process_intake_response')
    .build();
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTAKE — Step-by-step question form
// ═══════════════════════════════════════════════════════════════════════════════

export function buildIntakePersonalInfo(sessionId: string, clientId: string): StructuredUIResponse {
  return structuredResponse('intake', 'process_intake_response')
    .add(stepProgress([
      { id: 'service', label: 'Service', status: 'done', icon: '✓' },
      { id: 'info', label: 'Your Info', status: 'active' },
      { id: 'documents', label: 'Documents', status: 'upcoming' },
      { id: 'match', label: 'Tax Pro', status: 'upcoming' },
      { id: 'book', label: 'Book', status: 'upcoming' },
    ], 1))
    .progress(1, 7, 'Personal Information — Step 1 of 7')
    .text('Let\'s start with your basic information', 'heading')
    .add(formGroup([
      formField('firstName', 'First Name', 'text', { placeholder: 'Enter your first name', required: true }),
      formField('lastName', 'Last Name', 'text', { placeholder: 'Enter your last name', required: true }),
      formField('email', 'Email Address', 'email', { placeholder: 'your.email@example.com', required: true }),
      formField('phone', 'Phone Number', 'phone', { placeholder: '(555) 123-4567' }),
      formField('dob', 'Date of Birth', 'date', { required: true }),
    ], toolAction('process_intake_response', { sessionId }), {
      title: 'Personal Information',
      submitLabel: 'Save & Continue',
    }))
    .stateUpdates({
      screen: 'intake',
      sessionId,
      clientId,
      intakeProgress: 14,
      currentIntakeStep: 'personal_info',
    })
    .data({ sessionId, clientId })
    .nextTools('process_intake_response', 'get_intake_progress')
    .build();
}

export function buildIntakeFilingStatus(sessionId: string): StructuredUIResponse {
  return structuredResponse('intake', 'process_intake_response')
    .progress(2, 7, 'Filing Status — Step 2 of 7')
    .text('What\'s your filing status?', 'heading')
    .add(selectionCard('Select your filing status:', [
      { id: 'single', label: 'Single', icon: '👤' },
      { id: 'married_filing_jointly', label: 'Married Filing Jointly', icon: '👫' },
      { id: 'married_filing_separately', label: 'Married Filing Separately', icon: '↔️' },
      { id: 'head_of_household', label: 'Head of Household', icon: '🏠' },
      { id: 'qualifying_widow', label: 'Qualifying Widow(er)', icon: '📋' },
    ], toolAction('process_intake_response', { sessionId })))
    .stateUpdates({ intakeProgress: 28, currentIntakeStep: 'filing_status' })
    .data({ sessionId })
    .build();
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY — Review collected info
// ═══════════════════════════════════════════════════════════════════════════════

export function buildSummaryReview(clientId: string): StructuredUIResponse {
  return structuredResponse('summary', 'get_client_summary')
    .banner('Intake Complete! Please review your information.', 'success', { icon: '🎉', confetti: true })
    .add(stepProgress([
      { id: 'service', label: 'Service', status: 'done', icon: '✓' },
      { id: 'info', label: 'Your Info', status: 'done', icon: '✓' },
      { id: 'documents', label: 'Documents', status: 'active' },
      { id: 'match', label: 'Tax Pro', status: 'upcoming' },
      { id: 'book', label: 'Book', status: 'upcoming' },
    ], 2))
    .card('Client Profile', [
      { label: 'Name', value: 'John Smith', icon: '👤' },
      { label: 'Email', value: 'john@example.com', icon: '📧' },
      { label: 'Filing Status', value: 'Married Filing Jointly', icon: '👫' },
      { label: 'Dependents', value: '2', icon: '👶' },
      { label: 'Income Types', value: 'W-2, Self-Employment, Investments', icon: '💰' },
      { label: 'Complexity', value: 'Moderate', icon: '📊' },
    ], {
      badge: { text: 'Complete', variant: 'success' },
      highlight: 'Please verify all information is correct before proceeding.',
    })
    .primaryButton('✅ Confirm — Everything is Correct', toolAction('confirm_intake_summary', { clientId }), '✅')
    .secondaryButton('✏️ I Need to Make Changes', messageAction('I need to edit my information'), '✏️')
    .stateUpdates({ screen: 'summary', intakeProgress: 100 })
    .data({ clientId })
    .nextTools('confirm_intake_summary', 'generate_document_checklist')
    .build();
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENT CHECKLIST
// ═══════════════════════════════════════════════════════════════════════════════

export function buildDocumentChecklist(clientId: string): StructuredUIResponse {
  return structuredResponse('document_checklist', 'generate_document_checklist')
    .add(stepProgress([
      { id: 'service', label: 'Service', status: 'done', icon: '✓' },
      { id: 'info', label: 'Your Info', status: 'done', icon: '✓' },
      { id: 'documents', label: 'Documents', status: 'active' },
      { id: 'match', label: 'Tax Pro', status: 'upcoming' },
      { id: 'book', label: 'Book', status: 'upcoming' },
    ], 2))
    .progress(3, 10, '3 of 10 documents collected')
    .banner('Gather these documents before your appointment', 'info', { icon: '📋' })
    .add(checklist('Income Documents', [
      { id: 'w2', text: 'W-2 from Employer', description: 'Wage and tax statement', status: 'collected' },
      { id: '1099nec', text: '1099-NEC', description: 'Self-employment income', status: 'pending', actions: [
        primaryButton('Mark Collected', toolAction('mark_document_collected', { clientId, documentId: '1099nec' })),
      ] },
      { id: '1099int', text: '1099-INT', description: 'Interest income', status: 'required', actions: [
        primaryButton('Mark Collected', toolAction('mark_document_collected', { clientId, documentId: '1099int' })),
      ] },
    ], { icon: '💰', counter: { done: 1, total: 3 } }))
    .add(checklist('Deduction Documents', [
      { id: '1098', text: '1098 Mortgage Interest', description: 'From your lender', status: 'collected' },
      { id: 'charity', text: 'Charitable Donation Receipts', description: 'All 2025 donations', status: 'pending' },
    ], { icon: '🧾', counter: { done: 1, total: 2 } }))
    .divider()
    .primaryButton('📅 Continue to Scheduling', toolAction('get_appointment_estimate', { clientId }))
    .secondaryButton('🔔 Set Up Reminders', toolAction('create_document_reminders', { clientId }))
    .stateUpdates({ screen: 'document_checklist' })
    .data({ clientId })
    .build();
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAX PRO MATCHING
// ═══════════════════════════════════════════════════════════════════════════════

export function buildTaxProRecommendations(clientId: string): StructuredUIResponse {
  return structuredResponse('taxpro_matching', 'get_tax_pro_recommendations')
    .add(stepProgress([
      { id: 'service', label: 'Service', status: 'done', icon: '✓' },
      { id: 'info', label: 'Your Info', status: 'done', icon: '✓' },
      { id: 'documents', label: 'Documents', status: 'done', icon: '✓' },
      { id: 'match', label: 'Tax Pro', status: 'active' },
      { id: 'book', label: 'Book', status: 'upcoming' },
    ], 3))
    .text('We found 3 great matches for your tax situation!', 'heading')
    .add(carousel([
      taxProCard({
        id: 'tp-001',
        name: 'Sarah Johnson, CPA',
        title: 'Senior Tax Advisor',
        rating: 4.9,
        specializations: ['Self-Employment', 'Investments'],
        availability: '3 slots this week',
      }, {
        recommended: true,
        matchReason: 'Best match for your self-employment and investment income',
        actions: [
          primaryButton('Select & Book', toolAction('select_tax_professional', { clientId, taxProId: 'tp-001' })),
          secondaryButton('View Profile', messageAction('Tell me more about Sarah Johnson')),
        ],
      }),
      taxProCard({
        id: 'tp-002',
        name: 'Michael Chen, EA',
        title: 'Tax Specialist',
        rating: 4.7,
        specializations: ['Individual', 'Investments'],
        availability: '5 slots this week',
      }, {
        actions: [
          primaryButton('Select & Book', toolAction('select_tax_professional', { clientId, taxProId: 'tp-002' })),
        ],
      }),
    ]))
    .stateUpdates({ screen: 'taxpro_matching' })
    .data({ clientId })
    .build();
}

// ═══════════════════════════════════════════════════════════════════════════════
// APPOINTMENT BOOKING
// ═══════════════════════════════════════════════════════════════════════════════

export function buildAppointmentBooking(clientId: string, taxProId: string): StructuredUIResponse {
  return structuredResponse('appointment_booking', 'create_appointment')
    .add(stepProgress([
      { id: 'service', label: 'Service', status: 'done', icon: '✓' },
      { id: 'info', label: 'Your Info', status: 'done', icon: '✓' },
      { id: 'documents', label: 'Documents', status: 'done', icon: '✓' },
      { id: 'match', label: 'Tax Pro', status: 'done', icon: '✓' },
      { id: 'book', label: 'Book', status: 'active' },
    ], 4))
    .text('Schedule your appointment', 'heading')
    .add(formGroup([
      formField('date', 'Preferred Date', 'date', { required: true }),
      formField('time', 'Preferred Time', 'select', {
        required: true,
        options: [
          { label: '9:00 AM', value: '09:00' },
          { label: '10:00 AM', value: '10:00' },
          { label: '11:00 AM', value: '11:00' },
          { label: '1:00 PM', value: '13:00' },
          { label: '2:00 PM', value: '14:00' },
          { label: '3:00 PM', value: '15:00' },
          { label: '4:00 PM', value: '16:00' },
        ],
      }),
      formField('type', 'Appointment Type', 'select', {
        required: true,
        options: [
          { label: '💻 Virtual (Zoom)', value: 'virtual' },
          { label: '🏢 In Person', value: 'in_person' },
        ],
      }),
    ], toolAction('create_appointment', { clientId, taxProId }), {
      title: 'Book Your Appointment',
      submitLabel: 'Confirm Booking',
    }))
    .stateUpdates({ screen: 'appointment_booking', taxProId })
    .data({ clientId, taxProId })
    .build();
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIRMATION — Appointment confirmed
// ═══════════════════════════════════════════════════════════════════════════════

export function buildAppointmentConfirmation(
  clientId: string,
  appointmentId: string,
): StructuredUIResponse {
  return structuredResponse('confirmation', 'create_appointment')
    .banner('Your appointment has been confirmed!', 'success', { icon: '✅', confetti: true })
    .add(appointmentSummary(
      {
        id: appointmentId,
        date: 'Wednesday, March 15, 2026',
        time: '2:00 PM — 3:00 PM',
        duration: '60 minutes',
        type: 'Virtual',
        location: 'Zoom link will be emailed 24 hrs before',
      },
      {
        name: 'Sarah Johnson, CPA',
        title: 'Senior Tax Advisor',
        rating: 4.9,
        specializations: ['Self-Employment', 'Investments'],
      },
      {
        name: 'John Smith',
        complexityLevel: 'Moderate',
        documentStatus: '8 of 10 documents collected',
      },
      {
        confirmationId: `HRB-${appointmentId.slice(-6).toUpperCase()}`,
        actions: [
          primaryButton('📋 View Document Checklist', toolAction('get_document_checklist', { clientId })),
          secondaryButton('🔔 Set Up Reminders', toolAction('create_document_reminders', { clientId })),
          dangerButton('❌ Cancel Appointment', toolAction('cancel_appointment', { appointmentId })),
        ],
      },
    ))
    .divider()
    .text('We\'ll send you a reminder 24 hours before your appointment. Make sure to have all your documents ready!', 'body')
    .stateUpdates({ screen: 'confirmation', appointmentId })
    .data({ clientId, appointmentId })
    .nextTools('get_document_checklist', 'create_document_reminders')
    .build();
}
