import { VIEW_TITLES } from './ui';

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
});
