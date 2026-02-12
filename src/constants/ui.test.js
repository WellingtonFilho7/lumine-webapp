import { VIEW_TITLES, UI_TEXT } from './ui';

describe('ui constants', () => {
  test('contains expected top-level view titles', () => {
    expect(VIEW_TITLES).toMatchObject({
      dashboard: 'Dashboard',
      children: 'Crianças',
      'add-child': 'Nova Criança',
      daily: 'Registro',
      'child-detail': 'Detalhes',
      config: 'Configurações',
    });
  });

  test('contains shared ui labels', () => {
    expect(UI_TEXT).toMatchObject({
      instituteLabel: 'Instituto Lumine',
      lastSyncLabel: 'Última sync',
      noSyncLabel: 'Nenhuma',
      backAriaLabel: 'Voltar',
    });
  });
});
