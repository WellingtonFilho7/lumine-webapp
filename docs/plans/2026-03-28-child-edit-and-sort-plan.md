# Child Edit And Sort Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Permitir editar dados da criança sem alterar status e adicionar ordenação explícita por nome/status na aba Crianças.

**Architecture:** Separar a ação de edição cadastral da transição de status para reduzir acoplamento entre validação de workflow e correção de dados. Reaproveitar o mesmo `statusFormData` como estado-base, mas com um fluxo próprio de `save`, e introduzir ordenação determinística nas views mobile e desktop sem mudar o contrato com a API.

**Tech Stack:** React, Vitest, Testing Library, Tailwind CSS.

### Task 1: Cobrir ordenação da lista

**Files:**
- Modify: `src/views/children/ChildrenView.test.jsx`
- Modify: `src/views/children/ChildrenTable.test.jsx`

**Step 1: Write the failing test**
- Adicionar cenário com crianças fora de ordem alfabética.
- Verificar ordem padrão `Nome (A-Z)`.
- Verificar ordem por `Status`.

**Step 2: Run test to verify it fails**

Run:
```bash
npm test -- src/views/children/ChildrenView.test.jsx src/views/children/ChildrenTable.test.jsx
```

**Step 3: Write minimal implementation**
- Criar ordenação compartilhada por nome/status.
- Expor seletor de ordenação nas duas views.

**Step 4: Run test to verify it passes**

Run:
```bash
npm test -- src/views/children/ChildrenView.test.jsx src/views/children/ChildrenTable.test.jsx
```

### Task 2: Cobrir edição sem troca de status

**Files:**
- Modify: `src/views/children/ChildDetailView.test.jsx`
- Modify: `src/views/children/ChildDetailDesktop.test.jsx`

**Step 1: Write the failing test**
- Renderizar detalhe com `onUpdateChild`.
- Alterar um campo cadastral.
- Salvar e garantir que `onUpdateChild` recebe patch sem `enrollmentStatus`.

**Step 2: Run test to verify it fails**

Run:
```bash
npm test -- src/views/children/ChildDetailView.test.jsx src/views/children/ChildDetailDesktop.test.jsx
```

**Step 3: Write minimal implementation**
- Criar bloco separado `Editar cadastro`.
- Salvar dados básicos sem exigir mudança de status.

**Step 4: Run test to verify it passes**

Run:
```bash
npm test -- src/views/children/ChildDetailView.test.jsx src/views/children/ChildDetailDesktop.test.jsx
```

### Task 3: Verificação final

**Files:**
- Modify: `src/views/children/ChildrenView.jsx`
- Modify: `src/views/children/ChildrenTable.jsx`
- Modify: `src/views/children/ChildDetailView.jsx`
- Modify: `src/views/children/ChildDetailDesktop.jsx`

**Step 1: Run targeted suite**

```bash
npm test -- src/views/children/ChildrenView.test.jsx src/views/children/ChildDetailView.test.jsx src/views/children/ChildDetailDesktop.test.jsx
```

**Step 2: Run full suite and build**

```bash
npm test
npm run build
```
