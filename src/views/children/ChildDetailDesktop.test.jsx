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

  it('saves matriculation data when current child is already matriculated', async () => {
    const onUpdateChild = vi.fn().mockResolvedValue(true);
    render(
      <ChildDetailDesktop
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
    render(<ChildDetailDesktop {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /alterar status/i }));

    const notesField = screen.getByPlaceholderText(/notas da mudan[çc]a de status/i);
    const statusSelect = notesField.parentElement?.querySelector('select');
    const options = Array.from(statusSelect?.querySelectorAll('option') || []).map(option =>
      option.textContent?.trim()
    );

    expect(options).toEqual(['Em triagem', 'Matriculado', 'Desistente', 'Inativo']);
  });

  it('keeps current legacy status visible in the selector for legacy children', () => {
    render(
      <ChildDetailDesktop
        {...defaultProps}
        child={{ ...defaultProps.child, enrollmentStatus: 'aprovado' }}
        getStatusMeta={() => ({ status: 'aprovado' })}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /alterar status/i }));

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
