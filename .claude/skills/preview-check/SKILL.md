---
name: preview-check
description: Screenshot the app at mobile and desktop viewports before committing UI changes. Use whenever a change touches JSX, CSS, Tailwind classes, theme variables, or layout — BEFORE the commit, never after a deploy. Triggers - "preview", "screenshot", "check the layout", any palette/theme change, any overflow or responsive fix.
---

# Preview Check

Render the real app headlessly and send the user screenshots before committing UI work. This replaces the old loop of deploying and asking the user to look at their phone.

## Steps

1. Ensure deps are installed (`npm ci` if `node_modules` is missing), then build and serve:
   ```bash
   npm run build
   npx vite preview --port 4173 &
   ```
   For iteration speed you may use `npm run start -- --port 4173 &` instead; use `vite preview` for the final pre-commit check since it serves the production bundle.
2. Screenshot with Playwright (Chromium is preinstalled; do NOT run `playwright install`):
   ```js
   // scratchpad/shot.mjs
   import { chromium } from 'playwright';
   const browser = await chromium.launch();
   for (const [name, viewport] of [
     ['mobile-390x844', { width: 390, height: 844 }],   // iPhone / iOS Safari
     ['desktop-1440x900', { width: 1440, height: 900 }],
   ]) {
     const page = await browser.newPage({ viewport });
     await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
     await page.screenshot({ path: `${name}.png`, fullPage: true });
   }
   await browser.close();
   ```
   If `@playwright/test` isn't in node_modules, launch with `executablePath: '/opt/pw-browsers/chromium'`.
3. Without Supabase credentials the app shows the login screen — that still validates theme, layout shell, and input sizing. To preview authenticated views, ask the user for a preview env or screenshot the specific component via a test harness.
4. Send the PNGs to the user with `SendUserFile` and state what to look for (overflow, spacing, palette).
5. Only commit after the screenshots look right. If the change is iOS-specific (input zoom, overflow), check that inputs are >= 16px font-size and nothing exceeds `max-width: 100%` at 390px.
