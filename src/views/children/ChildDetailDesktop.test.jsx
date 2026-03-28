import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import ChildDetailDesktop from './ChildDetailDesktop';

const buildStatusFormData = () => ({
  name: 'Ana Maria',
  sexo: 'F',
  birthDate: '2019-01-10',
  guardianName: 'Responsavel',
  parentesco: 'mae',
  guardianPhone: '83999990000',
  contatoEmergenciaNome: 'Contato',
  contatoEmergenciaTelefone: '83999990001',
  neighborhood: 'Centro',
  school: 'Escola A',
  schoolShift: 'manha',
  triageNotes: '',
  priority: 'media',
  priorityReason: '',
  referralSource: 'indicacao',
  schoolCommuteAlone: 'nao',
  renovacao: 'nao',
  termoLgpdAssinado: true,
  healthCareNeeded: 'nao',
  healthNotes: '',
  restricaoAlimentar: '',
  alergiaAlimentar: '',
  alergiaMedicamento: '',
  medicamentosEmUso: '',
  specialNeeds: '',
  startDate: '',
  participationDays: [],
  authorizedPickup: '',
  canLeaveAlone: 'nao',
  leaveAloneConsent: false,
  leaveAloneConfirmation: '',
  leaveAloneConfirmado: false,
  formaChegada: '',
  consentimentoSaude: false,
  termsAccepted: false,
  classGroup: '',
  imageConsent: '',
  documentsReceived: [],
  initialObservations: '',
});

const defaultProps = {
  child: {
    id: 'child-1',
    name: 'Ana Maria',
    birthDate: '2019-01-10',
    guardianName: 'Responsavel',
    guardianPhone: '83999990000',
    school: 'Escola A',
    entryDate: '2026-02-01',
    enrollmentStatus: 'em_triagem',
    enrollmentHistory: [],
  },
  dailyRecords: [],
  onUpdateChild: vi.fn().mockResolvedValue(true),
  isOnline: true,
  onlineOnly: true,
  onDeleteChild: vi.fn().mockResolvedValue(true),
  getStatusMeta: () => ({ status: 'em_triagem' }),
  parseEnrollmentHistory: () => [],
  buildStatusFormData,
  getMissingFieldsForStatus: () => [],
  isStatusTransitionAllowed: () => true,
  normalizeImageConsent: value => value,
  participationDays: [],
  enrollmentStatusMeta: {},
  formatDate: value => value,
  calculateAge: () => 6,
  calculateAttendanceRate: () => 0,
  moodLabels: {},
};

describe('ChildDetailDesktop', () => {
  it('saves basic child data without requiring status change', async () => {
    const onUpdateChild = vi.fn().mockResolvedValue(true);
    render(<ChildDetailDesktop {...defaultProps} onUpdateChild={onUpdateChild} />);

    fireEvent.change(screen.getByLabelText(/nome do respons[áa]vel/i), {
      target: { value: 'Novo Responsavel' },
    });

    fireEvent.click(screen.getByRole('button', { name: /salvar dados/i }));

    await waitFor(() => {
      expect(onUpdateChild).toHaveBeenCalledWith(
        'child-1',
        expect.objectContaining({
          guardianName: 'Novo Responsavel',
        })
      );
    });

    expect(onUpdateChild.mock.calls[0][1].enrollmentStatus).toBeUndefined();
  });
});
