import React from 'react';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

function Boom() {
  throw new Error('boom');
}

describe('ErrorBoundary', () => {
  test('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Conteudo normal</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Conteudo normal')).toBeTruthy();
  });

  test('shows fallback UI and action button when child throws', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    expect(screen.getByText('Algo deu errado')).toBeTruthy();
    expect(
      screen.getByText('O aplicativo encontrou um erro inesperado. Recarregue para continuar.')
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Recarregar' })).toBeTruthy();

    errorSpy.mockRestore();
  });
});
