import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChildDetailView from './ChildDetailView';
import ChildDetailDesktop from './ChildDetailDesktop';

const baseProps = {
  child: {
    id: 'c1',
    name: 'Ana',
    guardianName: 'Maria',
    guardianPhone: '83999999999',
    entryDate: '2026-02-01',
    enrollmentHistory: [],
  },
  dailyRecords: [],
  onUpdateChild: jest.fn(),
  getStatusMeta: () => ({ status: 'em_triagem' }),
  parseEnrollmentHistory: input => (Array.isArray(input) ? input : []),
  buildStatusFormData: child => ({
    name: child.name || '',
    birthDate: child.birthDate || '',
    guardianName: child.guardianName || '',
    guardianPhone: child.guardianPhone || '',
    neighborhood: child.neighborhood || '',
    school: child.school || '',
    schoolShift: child.schoolShift || '',
    referralSource: child.referralSource || '',
    schoolCommuteAlone: child.schoolCommuteAlone || '',
    startDate: child.startDate || '',
    participationDays: child.participationDays || [],
    authorizedPickup: child.authorizedPickup || '',
    canLeaveAlone: child.canLeaveAlone || '',
    leaveAloneConsent: Boolean(child.leaveAloneConsent),
    leaveAloneConfirmation: child.leaveAloneConfirmation || '',
    termsAccepted: Boolean(child.consentTerm),
    classGroup: child.classGroup || '',
    imageConsent: child.imageConsent || '',
    documentsReceived: child.documentsReceived || [],
    initialObservations: child.initialObservations || '',
  }),
  getMissingFieldsForStatus: () => [],
  normalizeImageConsent: value => value || '',
  participationDays: [],
  enrollmentStatusMeta: {},
  formatDate: value => value || '',
  calculateAge: () => 10,
  calculateAttendanceRate: () => 0,
  moodLabels: {},
};

describe('Child detail delete action', () => {
  test('calls delete callback after confirmation on mobile detail', async () => {
    const onDeleteChild = jest.fn().mockResolvedValue(true);
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);

    render(<ChildDetailView {...baseProps} onDeleteChild={onDeleteChild} />);

    fireEvent.click(screen.getByRole('button', { name: /excluir cadastro/i }));

    await waitFor(() => {
      expect(onDeleteChild).toHaveBeenCalledWith('c1');
    });

    confirmSpy.mockRestore();
  });

  test('calls delete callback after confirmation on desktop detail', async () => {
    const onDeleteChild = jest.fn().mockResolvedValue(true);
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);

    render(<ChildDetailDesktop {...baseProps} onDeleteChild={onDeleteChild} />);

    fireEvent.click(screen.getByRole('button', { name: /excluir cadastro/i }));

    await waitFor(() => {
      expect(onDeleteChild).toHaveBeenCalledWith('c1');
    });

    confirmSpy.mockRestore();
  });
});
