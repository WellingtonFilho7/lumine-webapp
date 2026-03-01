import React from 'react';
import { render, screen } from '@testing-library/react';
import ChildDetailView from './ChildDetailView';

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
  referralSource: 'indicacao',
  schoolCommuteAlone: 'nao',
  renovacao: 'nao',
  termoLgpdAssinado: true,
  startDate: '',
  participationDays: [],
  authorizedPickup: '',
  canLeaveAlone: 'nao',
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
  onUpdateChild: jest.fn().mockResolvedValue(true),
  isOnline: true,
  onlineOnly: true,
  onDeleteChild: jest.fn().mockResolvedValue(true),
  getStatusMeta: () => ({ status: 'em_triagem' }),
  parseEnrollmentHistory: () => [],
  buildStatusFormData,
  getMissingFieldsForStatus: () => [],
  isStatusTransitionAllowed: () => true,
  normalizeImageConsent: value => value,
  participationDays: [
    { value: 'seg', label: 'Seg' },
    { value: 'qua', label: 'Qua' },
  ],
  enrollmentStatusMeta: {},
  formatDate: value => value,
  calculateAge: () => 6,
  calculateAttendanceRate: () => 0,
  moodLabels: {},
};

describe('ChildDetailView', () => {
  it('renders status form directly inside status section without nested toggle button', () => {
    render(<ChildDetailView {...defaultProps} />);

    expect(screen.queryByRole('button', { name: 'Alterar status' })).toBeNull();
    expect(screen.getByText('Dados obrigatórios')).not.toBeNull();
  });
});
