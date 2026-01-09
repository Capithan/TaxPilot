import { ClientProfile, DocumentChecklist, DocumentItem, Appointment, TaxProfessional, Reminder, IntakeSession } from '../types/index.js';
declare class Database {
    private clients;
    private checklists;
    private appointments;
    private taxPros;
    private reminders;
    private sessions;
    constructor();
    private initializeTaxPros;
    createClient(client: ClientProfile): ClientProfile;
    getClient(id: string): ClientProfile | undefined;
    updateClient(id: string, updates: Partial<ClientProfile>): ClientProfile | undefined;
    getAllClients(): ClientProfile[];
    saveChecklist(checklist: DocumentChecklist): DocumentChecklist;
    getChecklist(clientId: string): DocumentChecklist | undefined;
    updateChecklistItem(clientId: string, documentId: string, updates: Partial<DocumentItem>): DocumentChecklist | undefined;
    createAppointment(appointment: Appointment): Appointment;
    getAppointment(id: string): Appointment | undefined;
    getAppointmentsByClient(clientId: string): Appointment[];
    getAppointmentsByTaxPro(taxProId: string): Appointment[];
    getTaxPro(id: string): TaxProfessional | undefined;
    getAllTaxPros(): TaxProfessional[];
    getAvailableTaxPros(): TaxProfessional[];
    updateTaxProLoad(id: string, change: number): TaxProfessional | undefined;
    createReminder(reminder: Reminder): Reminder;
    getReminder(id: string): Reminder | undefined;
    getRemindersByClient(clientId: string): Reminder[];
    getPendingReminders(): Reminder[];
    markReminderSent(id: string): Reminder | undefined;
    createSession(session: IntakeSession): IntakeSession;
    getSession(id: string): IntakeSession | undefined;
    getSessionByClient(clientId: string): IntakeSession | undefined;
    updateSession(id: string, updates: Partial<IntakeSession>): IntakeSession | undefined;
}
export declare const db: Database;
export {};
//# sourceMappingURL=index.d.ts.map