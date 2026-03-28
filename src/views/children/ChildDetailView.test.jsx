import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

  it('saves basic child data without requiring status change', async () => {
    const onUpdateChild = vi.fn().mockResolvedValue(true);
    render(<ChildDetailView {...defaultProps} onUpdateChild={onUpdateChild} />);

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

  it('saves matriculation data when current child is already matriculated', async () => {
    const onUpdateChild = vi.fn().mockResolvedValue(true);
    render(
      <ChildDetailView
        {...defaultProps}
        child={{
          ...defaultProps.child,
          enrollmentStatus: 'matriculado',
          referralSource: 'igreja',
          healthCareNeeded: 'nao',
          startDate: '2026-02-01',
        }}
        getStatusMeta={() => ({ status: 'matriculado' })}
        buildStatusFormData={() => ({
          ...buildStatusFormData(),
          referralSource: 'igreja',
          healthCareNeeded: 'nao',
          startDate: '2026-02-01',
        })}
        onUpdateChild={onUpdateChild}
      />
    );

    fireEvent.change(screen.getByLabelText(/como conheceu o lumine/i), {
      target: { value: 'escola' },
    });

    fireEvent.click(screen.getByRole('button', { name: /salvar dados/i }));

    await waitFor(() => {
      expect(onUpdateChild).toHaveBeenCalledWith(
        'child-1',
        expect.objectContaining({
          referralSource: 'escola',
        })
      );
    });
  });

  it('shows only operational target statuses for active children', () => {
    render(<ChildDetailView {...defaultProps} />);

    const notesField = screen.getByPlaceholderText(/notas da mudan[çc]a de status/i);
    const statusSelect = notesField.parentElement?.querySelector('select');
    const options = Array.from(statusSelect?.querySelectorAll('option') || []).map(option =>
      option.textContent?.trim()
    );

    expect(options).toEqual(['Em triagem', 'Matriculado', 'Desistente', 'Inativo']);
  });

  it('keeps current legacy status visible in the selector for legacy children', () => {
    render(
      <ChildDetailView
        {...defaultProps}
        child={{ ...defaultProps.child, enrollmentStatus: 'aprovado' }}
        getStatusMeta={() => ({ status: 'aprovado' })}
      />
    );

    const notesField = screen.getByPlaceholderText(/notas da mudan[çc]a de status/i);
    const statusSelect = notesField.parentElement?.querySelector('select');
    const options = Array.from(statusSelect?.querySelectorAll('option') || []).map(option =>
      option.textContent?.trim()
    );

    expect(options).toContain('Aprovado');
    expect(options).toContain('Em triagem');
    expect(options).toContain('Matriculado');
  });
});
