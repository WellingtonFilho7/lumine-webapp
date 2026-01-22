# Institutional Palette Update Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Apply an institutional color palette across the webapp by moving brand UI from indigo to blue and reserving amber for primary CTAs, while preserving semantic success/error colors.

**Architecture:** Use Tailwind default tokens only. Systematically replace indigo brand classes with blue equivalents for layout, navigation, and informational UI. Apply amber only to primary action buttons and the neutral “Sync” state, keeping green/red/amber semantics for status and alerts.

**Tech Stack:** React (CRA), Tailwind CSS via CDN, lucide-react.

---

### Task 1: Replace brand indigo tokens with blue across UI

**Files:**
- Modify: `src/App.js`

**Step 1: Write the failing test**
- No new tests for purely visual class changes. Documented as a visual refactor only.

**Step 2: Run test to verify it fails**
- Not applicable (no new tests).

**Step 3: Write minimal implementation**
- Replace brand indigo tokens with blue equivalents:
  - `indigo-50` → `blue-50`
  - `indigo-100` → `blue-100`
  - `indigo-200` → `blue-200`
  - `indigo-300` → `blue-300`
  - `indigo-500` → `blue-600`
  - `indigo-600` → `blue-700`
  - `indigo-700` → `blue-800`
- Apply to:
  - headers, sidebar, nav active state
  - chips/badges that represent brand (not status)
  - focus rings (`focus:ring-*`)
  - onboarding and guide UI
  - info blocks and section headings
- Keep semantic colors unchanged: `green-*`, `red-*`, `amber-*` used for status/alerts.

**Step 4: Run tests to verify**
Run: `CI=true npm test -- --watchAll=false`
Expected: 7 suites pass, 0 failures.

**Step 5: Commit**
```bash
git add src/App.js
git commit -m "style: shift brand palette to blue"
```

---

### Task 2: Apply amber only to primary CTAs

**Files:**
- Modify: `src/App.js`

**Step 1: Write the failing test**
- No new tests for purely visual class changes. Documented as a visual refactor only.

**Step 2: Run test to verify it fails**
- Not applicable (no new tests).

**Step 3: Write minimal implementation**
- Change primary action buttons to amber:
  - Primary CTA base: `bg-amber-500 text-gray-900 hover:bg-amber-400`
  - Disabled states remain gray.
- Apply to:
  - form submission CTAs (Continuar, Cadastrar, Salvar)
  - FAB primary button
  - sync button neutral state
  - “Nova criança” actions where used as primary
- Keep secondary actions in gray or blue-100 (outlined/secondary style).

**Step 4: Run tests to verify**
Run: `CI=true npm test -- --watchAll=false`
Expected: 7 suites pass, 0 failures.

**Step 5: Commit**
```bash
git add src/App.js
git commit -m "style: apply amber to primary CTAs"
```

---

### Task 3: Regression build check

**Files:**
- Modify: none (verification only)

**Step 1: Run build**
Run: `npm run build`
Expected: build succeeds (no errors).

**Step 2: Commit**
- No commit for verification-only step.

