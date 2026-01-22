# CSS Variables Foundation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add CSS custom properties for brand colors in `:root` without changing existing Tailwind classes or visual output.

**Architecture:** Introduce a small variables block in `src/index.css` under `:root` and keep existing Tailwind classes unchanged. This creates a foundation for future gradual migration.

**Tech Stack:** React (CRA), Tailwind CSS via CDN.

---

### Task 1: Add CSS variables to :root

**Files:**
- Modify: `src/index.css`

**Step 1: Write the failing test**
- No tests required for a visual-neutral CSS variable addition.

**Step 2: Run test to verify it fails**
- Not applicable.

**Step 3: Write minimal implementation**
- Add the following block near the top of `src/index.css`:
```
:root {
  --color-primary: #0891b2;
  --color-accent: #f97316;
  --color-secondary: #14b8a6;
  --color-background: #f0fdfa;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
}
```
- Do not reference these variables yet in class names.

**Step 4: Run tests to verify**
Run: `CI=true npm test -- --watchAll=false`
Expected: 7 suites pass, 0 failures.

**Step 5: Commit**
```bash
git add src/index.css
git commit -m "style: add css color variables"
```

