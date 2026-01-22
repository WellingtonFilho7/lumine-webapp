# Onboarding Guide (Modal + Config Card) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a first‑use onboarding modal with a 3‑step checklist and a Config card to reopen it later, all offline via localStorage.

**Architecture:** Track a localStorage flag `lumine_onboarding_done` and local UI state for the modal. Show the modal on first load, persist on “Entendi”, allow “Ver depois” to skip persistence, and provide a Config card to reopen/reset.

**Tech Stack:** React 18 (CRA), Radix Dialog, Tailwind CSS, Jest (CRA test runner).

### Task 1: Add onboarding utility and tests

**Files:**
- Create: `src/utils/onboarding.js`
- Create: `src/utils/onboarding.test.js`

**Step 1: Write the failing tests**

```javascript
import { getOnboardingFlag, setOnboardingFlag, clearOnboardingFlag } from './onboarding';

describe('onboarding localStorage helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('getOnboardingFlag defaults to false', () => {
    expect(getOnboardingFlag()).toBe(false);
  });

  test('setOnboardingFlag persists true', () => {
    setOnboardingFlag(true);
    expect(getOnboardingFlag()).toBe(true);
  });

  test('clearOnboardingFlag resets to false', () => {
    setOnboardingFlag(true);
    clearOnboardingFlag();
    expect(getOnboardingFlag()).toBe(false);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- --watchAll=false --passWithNoTests`
Expected: FAIL with missing module `./onboarding`.

**Step 3: Commit**

```bash
git add src/utils/onboarding.test.js
git commit -m "test: add onboarding localStorage tests"
```

### Task 2: Implement onboarding utilities

**Files:**
- Create: `src/utils/onboarding.js`

**Step 1: Write minimal implementation**

```javascript
const KEY = 'lumine_onboarding_done';

export const getOnboardingFlag = () => {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  return localStorage.getItem(KEY) === 'true';
};

export const setOnboardingFlag = value => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  localStorage.setItem(KEY, value ? 'true' : 'false');
};

export const clearOnboardingFlag = () => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  localStorage.removeItem(KEY);
};
```

**Step 2: Run tests**

Run: `npm test -- --watchAll=false --passWithNoTests`
Expected: PASS.

**Step 3: Commit**

```bash
git add src/utils/onboarding.js
git commit -m "feat: add onboarding localStorage helpers"
```

### Task 3: Onboarding modal (first use)

**Files:**
- Modify: `src/App.js`
- Test: `src/OnboardingModal.test.js`

**Step 1: Write failing UI test**

```javascript
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

jest.mock('./utils/onboarding', () => ({
  getOnboardingFlag: () => false,
  setOnboardingFlag: jest.fn(),
  clearOnboardingFlag: jest.fn(),
}));

test('shows onboarding modal on first use and closes on Entendi', () => {
  render(<App />);
  expect(screen.getByText('Guia rápida (3 passos)')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Entendi'));
  expect(screen.queryByText('Guia rápida (3 passos)')).not.toBeInTheDocument();
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- --watchAll=false --passWithNoTests`
Expected: FAIL because modal not implemented.

**Step 3: Implement modal**
- Add local state in `App` (or top‑level component): `showOnboarding`.
- On mount: `if (!getOnboardingFlag()) setShowOnboarding(true)`.
- Modal content with 3‑step checklist and buttons.
- “Entendi”: `setOnboardingFlag(true)` and close.
- “Ver depois”: close only.

**Step 4: Run tests**
Expected: PASS.

**Step 5: Commit**

```bash
git add src/App.js src/OnboardingModal.test.js
git commit -m "feat: add first-use onboarding modal"
```

### Task 4: Config card to reopen guide

**Files:**
- Modify: `src/App.js`
- Test: `src/OnboardingConfig.test.js`

**Step 1: Write failing UI test**

```javascript
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ConfigView } from './App';

const noop = () => {};

jest.mock('./utils/onboarding', () => ({
  getOnboardingFlag: () => true,
  setOnboardingFlag: jest.fn(),
  clearOnboardingFlag: jest.fn(),
}));

test('shows config card and triggers re-open', () => {
  render(
    <ConfigView
      children={[]}
      setChildren={noop}
      dailyRecords={[]}
      setDailyRecords={noop}
      syncWithServer={noop}
      downloadFromServer={noop}
      lastSync={null}
      isOnline={true}
      overwriteBlocked={false}
      clearLocalData={noop}
      reviewMode={false}
      setReviewMode={noop}
    />
  );
  expect(screen.getByText('Guia rápida (3 passos)')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Reabrir guia rápida'));
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- --watchAll=false --passWithNoTests`
Expected: FAIL (card missing).

**Step 3: Implement Config card**
- Add a card with checklist and button in `ConfigView`.
- On click: `clearOnboardingFlag()` and trigger modal open (via state lifted in App).

**Step 4: Run tests**
Expected: PASS.

**Step 5: Commit**

```bash
git add src/App.js src/OnboardingConfig.test.js
git commit -m "feat: add config onboarding card"
```

### Task 5: Final verification

**Step 1: Run full test suite**
Run: `npm test -- --watchAll=false --passWithNoTests`
Expected: PASS.

**Step 2: Request code review**
Use superpowers:requesting-code-review.
