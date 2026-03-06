import {
  buildFinanceCreatePayload,
  formatMoneyBRL,
  getFileExtension,
  parseMoneyToNumber,
  validateFinanceFile,
} from './finance';

describe('finance utils', () => {
  test('parseMoneyToNumber handles pt-BR decimal input', () => {
    expect(parseMoneyToNumber('1.234,56')).toBe(1234.56);
    expect(parseMoneyToNumber('129,9')).toBe(129.9);
    expect(Number.isNaN(parseMoneyToNumber(''))).toBe(true);
  });

  test('validateFinanceFile accepts valid types and rejects invalid type', () => {
    const validPdf = { name: 'comprovante.pdf', size: 1024, type: 'application/pdf' };
    expect(validateFinanceFile(validPdf).ok).toBe(true);

    const invalid = { name: 'script.exe', size: 2048, type: 'application/x-msdownload' };
    const result = validateFinanceFile(invalid);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Formato inválido/i);
  });

  test('buildFinanceCreatePayload includes comprovante path aliases', () => {
    const payload = buildFinanceCreatePayload(
      {
        tipo: 'gasto',
        categoria: 'limpeza',
        descricao: 'Detergente',
        valor: '12,50',
        dataTransacao: '2026-03-05',
        formaPagamento: 'pix',
        observacoes: 'Compra semanal',
      },
      '2026/03/teste.pdf'
    );

    expect(payload.tipo).toBe('gasto');
    expect(payload.valor).toBe(12.5);
    expect(payload.comprovantePath).toBe('2026/03/teste.pdf');
    expect(payload.comprovante_path).toBe('2026/03/teste.pdf');
  });

  test('helpers format extension and currency', () => {
    expect(getFileExtension('arquivo.JPG')).toBe('jpg');
    expect(formatMoneyBRL(15.2)).toContain('15,20');
  });
});
