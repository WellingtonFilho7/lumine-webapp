# Lumine Webapp Vite Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrar o `lumine-webapp` de CRA (`react-scripts`) para Vite sem quebrar autenticacao, contrato com `lumine-api`, testes existentes nem build de producao.

**Architecture:** A migracao vai trocar apenas o toolchain do frontend. O codigo React, o contrato HTTP e o modelo de autenticacao continuam iguais. Para reduzir risco, a compatibilidade com `REACT_APP_*` sera mantida via configuracao do Vite, evitando reescrever todos os modulos de env de uma vez.

**Tech Stack:** React 18, Vite, Vitest, Tailwind CSS 3, Supabase Auth, Vercel

### Task 1: Base do Vite
- substituir `react-scripts` por `vite`, `@vitejs/plugin-react`, `vitest`, `jsdom`
- manter `REACT_APP_*` via `loadEnv()` + `define`
- configurar `build.outDir = 'build'` para minimizar impacto operacional

### Task 2: Entrypoint HTML e assets
- mover `index.html` para a raiz do projeto
- remover `public/index.html`
- manter assets estaticos em `public/`

### Task 3: Runner de testes
- trocar `react-scripts test` por `vitest run`
- migrar `jest.*` para `vi.*`
- adicionar setup de teste com `@testing-library/jest-dom/vitest`

### Task 4: Validacao e docs
- atualizar `ARQUITETURA.md` e `README.md` para Vite
- rodar `npm test` e `npm run build`
