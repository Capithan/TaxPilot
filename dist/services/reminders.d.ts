import { Reminder, Appointment, DocumentItem } from '../types/index.js';
export declare function createDocumentReminder(clientId: string, appointmentId: string, documents: DocumentItem[]): Reminder[];
export declare function createAppointmentReminder(clientId: string, appointmentId: string, reminderType: 'appointment_reminder_24h' | 'appointment_reminder_1h', scheduledFor: Date): Reminder;
export declare function createBatchDocumentReminder(clientId: string, appointmentId: string): Reminder | null;
export declare function getClientReminders(clientId: string): Reminder[];
export declare function getPendingReminders(): Reminder[];
export declare function sendReminder(reminderId: string): {
    success: boolean;
    message: string;
};
export declare function scheduleAppointmentReminders(appointment: Appointment): Reminder[];
export declare function formatRemindersForDisplay(reminders: Reminder[]): string;
//# sourceMappingURL=reminders.d.ts.map