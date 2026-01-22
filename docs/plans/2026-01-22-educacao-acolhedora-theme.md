# Educacao Acolhedora Theme Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Apply the "Educacao Acolhedora" palette across the webapp using Tailwind default tokens (cyan primary, orange accent, teal secondary, teal background) while keeping semantic success/error colors.

**Architecture:** Update Tailwind utility classes in `src/App.js` and base background color in `src/index.css`. Replace the current blue/amber theme with cyan/orange/teal equivalents, keep green/red for status, and avoid introducing CSS variables or custom Tailwind config.

**Tech Stack:** React (CRA), Tailwind CSS via CDN, lucide-react.

---

### Task 1: Shift brand color from blue to cyan

**Files:**
- Modify: `src/App.js`

**Step 1: Write the failing test**
- No new tests for visual-only class changes. Documented as a visual refactor only.

**Step 2: Run test to verify it fails**
- Not applicable (no new tests).

**Step 3: Write minimal implementation**
- Replace brand blue tokens with cyan equivalents:
  - `blue-50` → `cyan-50`
  - `blue-100` → `cyan-100`
  - `blue-200` → `cyan-200`
  - `blue-300` → `cyan-300`
  - `blue-500` → `cyan-600`
  - `blue-700` → `cyan-700`
  - `blue-800` → `cyan-800`
  - `blue-900` → `cyan-900`
- Apply to brand UI elements only (header, sidebar, nav active state, guide bullets, info badges, focus rings).
- Keep semantic colors unchanged (`green-*`, `red-*`).

**Step 4: Run tests to verify**
Run: `CI=true npm test -- --watchAll=false`
Expected: 7 suites pass, 0 failures.

**Step 5: Commit**
```bash
git add src/App.js
git commit -m "style: shift brand palette to cyan"
```

---

### Task 2: Replace accent amber with orange

**Files:**
- Modify: `src/App.js`

**Step 1: Write the failing test**
- No new tests for visual-only class changes. Documented as a visual refactor only.

**Step 2: Run test to verify it fails**
- Not applicable (no new tests).

**Step 3: Write minimal implementation**
- Replace CTA accent:
  - `bg-amber-500` → `bg-orange-500`
  - `hover:bg-amber-400` → `hover:bg-orange-400`
  - `text-gray-900` (keep unless contrast needs `text-white`)
- Replace warning/alert amber blocks with orange equivalents where appropriate to reduce palette variety.

**Step 4: Run tests to verify**
Run: `CI=true npm test -- --watchAll=false`
Expected: 7 suites pass, 0 failures.

**Step 5: Commit**
```bash
git add src/App.js
git commit -m "style: apply orange accent"
```

---

### Task 3: Apply teal background and secondary accents

**Files:**
- Modify: `src/App.js`
- Modify: `src/index.css`

**Step 1: Write the failing test**
- No new tests for visual-only class changes. Documented as a visual refactor only.

**Step 2: Run test to verify it fails**
- Not applicable (no new tests).

**Step 3: Write minimal implementation**
- Set base page background to `teal-50`:
  - Replace root container `bg-gray-100` with `bg-teal-50` in `src/App.js`.
  - Update `body` background in `src/index.css` to `#f0fdfa`.
- Use teal as secondary for soft accents (limited usage):
  - Replace a small subset of neutral highlight surfaces (e.g., a single info card per view) with `bg-teal-50` if needed.

**Step 4: Run tests to verify**
Run: `CI=true npm test -- --watchAll=false`
Expected: 7 suites pass, 0 failures.

**Step 5: Commit**
```bash
git add src/App.js src/index.css
git commit -m "style: set teal background"
```

---

### Task 4: Regression build check

**Files:**
- Modify: none (verification only)

**Step 1: Run build**
Run: `npm run build`
Expected: build succeeds (no errors).

**Step 2: Commit**
- No commit for verification-only step.

