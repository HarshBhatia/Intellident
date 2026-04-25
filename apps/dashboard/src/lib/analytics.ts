declare function gtag(...args: any[]): void;

export function trackEvent(name: string, params?: Record<string, string | number | boolean>) {
  if (typeof window === 'undefined' || typeof gtag === 'undefined') return;
  gtag('event', name, params ?? {});
}

// Named helpers — keeps call sites clean and params consistent
export const Analytics = {
  patientCreated: () =>
    trackEvent('patient_created'),

  visitRecorded: (params: { visitType?: string }) =>
    trackEvent('visit_recorded', { visit_type: params.visitType ?? 'unknown' }),

  appointmentCreated: (params: { walkIn: boolean; visitType?: string }) =>
    trackEvent('appointment_created', {
      walk_in: params.walkIn,
      visit_type: params.visitType ?? 'unknown',
    }),

  appointmentStatusChanged: (params: { status: string }) =>
    trackEvent('appointment_status_changed', { status: params.status }),

  expenseAdded: (params: { category?: string }) =>
    trackEvent('expense_added', { category: params.category ?? 'unknown' }),

  notesGenerated: () =>
    trackEvent('notes_generated'),

  pdfGenerated: (params: { type: 'prescription' | 'invoice' | 'report' }) =>
    trackEvent('pdf_generated', { type: params.type }),
};
