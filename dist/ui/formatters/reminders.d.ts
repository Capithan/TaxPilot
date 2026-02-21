/**
 * Reminders Domain UI Formatter
 *
 * Transforms reminder data into structured UIResponse objects
 * with status indicators and send actions.
 */
import type { UIResponse } from '../types.js';
import type { Reminder } from '../../types/index.js';
/** Format create_document_reminders response. */
export declare function formatRemindersCreated(reminders: Reminder[], clientId: string): UIResponse;
/** Format get_client_reminders response. */
export declare function formatRemindersList(reminders: Reminder[], clientId: string): UIResponse;
/** Format send_reminder response. */
export declare function formatReminderSent(result: {
    success: boolean;
    message: string;
}, reminderId: string): UIResponse;
/** Format the send_client_notification response. */
export declare function formatNotificationSent(notification: {
    id: string;
    clientId: string;
    subject: string;
    message: string;
    type: string;
    sentAt: string;
}): UIResponse;
//# sourceMappingURL=reminders.d.ts.map