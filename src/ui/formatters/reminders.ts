/**
 * Reminders Domain UI Formatter
 *
 * Transforms reminder data into structured UIResponse objects
 * with status indicators and send actions.
 */

import { ui } from '../builders.js';
import type { UIResponse } from '../types.js';
import type { Reminder } from '../../types/index.js';

const TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  appointment_confirmation: { label: 'Appointment Confirmation', icon: '📅' },
  document_reminder: { label: 'Document Reminder', icon: '📄' },
  appointment_reminder_24h: { label: '24h Reminder', icon: '⏰' },
  appointment_reminder_1h: { label: '1h Reminder', icon: '🔔' },
  follow_up: { label: 'Follow Up', icon: '📬' },
};

/** Format create_document_reminders response. */
export function formatRemindersCreated(
  reminders: Reminder[],
  clientId: string,
): UIResponse {
  const builder = ui.response('reminders_created', 'create_document_reminders')
    .title('🔔 Reminders Created')
    .subtitle(`${reminders.length} reminder${reminders.length > 1 ? 's' : ''} set up`)
    .banner(`${reminders.length} personalized reminders created!`, 'success', { icon: '🔔' });

  reminders.forEach(r => {
    const typeInfo = TYPE_LABELS[r.type] || { label: r.type, icon: '🔔' };
    builder.card(typeInfo.label, c => c
      .icon(typeInfo.icon)
      .badge(r.sent ? 'Sent' : 'Scheduled', r.sent ? 'success' : 'info')
      .field('Reminder ID', r.id, '🔑')
      .field('Channel', r.channel === 'both' ? '📧 Email + 📱 SMS' : r.channel === 'email' ? '📧 Email' : '📱 SMS', '📡')
      .field('Scheduled For', r.scheduledFor.toISOString(), '📅')
      .field('Documents', `${r.documentIds?.length || 0} documents`, '📄')
      .highlight(r.message)
      .action('Send Now', 'send_reminder', { reminderId: r.id }, 'primary', '📤')
    );
  });

  builder.data({
    clientId,
    reminderCount: reminders.length,
    reminderIds: reminders.map(r => r.id),
  });

  builder.nextTools('send_reminder', 'get_client_reminders');

  return builder.build();
}

/** Format get_client_reminders response. */
export function formatRemindersList(
  reminders: Reminder[],
  clientId: string,
): UIResponse {
  const pending = reminders.filter(r => !r.sent);
  const sent = reminders.filter(r => r.sent);

  const builder = ui.response('reminders_list', 'get_client_reminders')
    .title('🔔 Client Reminders')
    .subtitle(`${pending.length} pending · ${sent.length} sent`);

  if (pending.length > 0) {
    builder.section('Pending Reminders', sb => {
      sb.icon('⏳');
      sb.counter(0, pending.length);
      pending.forEach(r => {
        const typeInfo = TYPE_LABELS[r.type] || { label: r.type, icon: '🔔' };
        sb.item(`${typeInfo.icon} ${typeInfo.label}`, {
          description: r.message,
          status: 'pending',
          actions: [
            ui.action('Send Now', 'send_reminder', { reminderId: r.id }, 'primary', '📤'),
          ],
        });
      });
    });
  }

  if (sent.length > 0) {
    builder.section('Sent Reminders', sb => {
      sb.icon('✅');
      sb.counter(sent.length, sent.length);
      sent.forEach(r => {
        const typeInfo = TYPE_LABELS[r.type] || { label: r.type, icon: '🔔' };
        sb.item(`${typeInfo.icon} ${typeInfo.label}`, {
          description: `Sent: ${r.sentAt?.toISOString() || '—'}`,
          status: 'done',
        });
      });
    });
  }

  if (reminders.length === 0) {
    builder.message('No reminders found for this client.');
    builder.action('Create Reminders', 'create_document_reminders', { clientId }, 'primary', '🔔');
  }

  builder.data({ clientId, total: reminders.length, pending: pending.length, sent: sent.length });

  return builder.build();
}

/** Format send_reminder response. */
export function formatReminderSent(result: {
  success: boolean;
  message: string;
}, reminderId: string): UIResponse {
  return ui.response('reminder_sent', 'send_reminder')
    .title(result.success ? '✅ Reminder Sent' : '❌ Send Failed')
    .banner(result.message, result.success ? 'success' : 'error', {
      icon: result.success ? '📤' : '❌',
    })
    .card('Reminder Status', c => c
      .icon(result.success ? '📤' : '❌')
      .badge(result.success ? 'Sent' : 'Failed', result.success ? 'success' : 'error')
      .field('Reminder ID', reminderId, '🔑')
      .field('Status', result.success ? 'Delivered' : 'Failed', result.success ? '✅' : '❌')
    )
    .data({ reminderId, success: result.success })
    .build();
}

/** Format the send_client_notification response. */
export function formatNotificationSent(notification: {
  id: string;
  clientId: string;
  subject: string;
  message: string;
  type: string;
  sentAt: string;
}): UIResponse {
  return ui.response('notification_sent', 'send_client_notification')
    .title('✅ Notification Sent')
    .banner('Message delivered successfully!', 'success', { icon: '📤' })
    .card('Notification Details', c => c
      .icon('📧')
      .badge('Delivered', 'success', '✅')
      .field('Notification ID', notification.id, '🔑')
      .field('To', `Client ${notification.clientId}`, '👤')
      .field('Subject', notification.subject, '📌')
      .field('Type', notification.type === 'email' ? '📧 Email' : '📱 SMS', '📡')
      .field('Sent At', notification.sentAt, '🕐')
      .highlight(notification.message)
    )
    .data(notification)
    .build();
}
