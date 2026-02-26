import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AddChildView from './AddChildView';

const triageResultOptions = [
  { value: 'em_triagem', label: 'Em triagem' },
  { value: 'aprovado', label: 'Aprovada para matrícula' },
];

const participationDays = [
  { value: 'seg', label: 'Seg' },
  { value: 'ter', label: 'Ter' },
];

const statusFieldLabels = {
  name: 'Nome',
  birthDate: 'Data de nascimento',
  guardianName: 'Responsável',
  guardianPhone: 'Telefone',
  neighborhood: 'Bairro',
  school: 'Escola',
  schoolShift: 'Turno escolar',
  referralSource: 'Origem',
  schoolCommuteAlone: 'Vai e volta desacompanhada',
  startDate: 'Data de início',
  participationDays: 'Dias de participação',
  authorizedPickup: 'Quem busca',
  canLeaveAlone: 'Pode sair desacompanhada',
  termsAccepted: 'Termo aceito',
  leaveAloneConsent: 'Autorização de saída',
  leaveAloneConfirmation: 'Confirmação de saída',
};

describe('AddChildView', () => {
  test('shows sync error when save fails', async () => {
    const addChild = jest.fn().mockResolvedValue(false);
    const setView = jest.fn();

    render(
      <AddChildView
        addChild={addChild}
        setView={setView}
        triageResultOptions={triageResultOptions}
        participationDays={participationDays}
        statusFieldLabels={statusFieldLabels}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /salvar rascunho/i }));

    await waitFor(() => {
      expect(addChild).toHaveBeenCalledTimes(1);
      expect(
        screen.getByText('Não foi possível sincronizar agora. Verifique internet e tente novamente.')
      ).toBeInTheDocument();
    });
    expect(setView).not.toHaveBeenCalled();
  });

  test('disables save button and shows loading text while saving', async () => {
    const addChild = jest.fn(() => new Promise(() => {}));

    render(
      <AddChildView
        addChild={addChild}
        setView={jest.fn()}
        triageResultOptions={triageResultOptions}
        participationDays={participationDays}
        statusFieldLabels={statusFieldLabels}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /salvar rascunho/i }));

    const loadingButton = screen.getByRole('button', { name: /salvando/i });
    expect(loadingButton).toBeDisabled();
  });
});
