import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    const details = {
      message: error?.message || 'unknown_error',
      stack: errorInfo?.componentStack || '',
      timestamp: new Date().toISOString(),
    };
    // Intencionalmente sem dados de criancas/responsaveis (PII) no log.
    console.error('UI_ERROR_BOUNDARY', details);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-xl rounded-lg border border-rose-200 bg-white p-6 shadow-md">
          <h1 className="text-xl font-semibold text-slate-900">Algo deu errado</h1>
          <p className="mt-2 text-sm text-slate-600">
            O aplicativo encontrou um erro inesperado. Recarregue para continuar.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="mt-5 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800"
          >
            Recarregar
          </button>
        </div>
      </div>
    );
  }
}
