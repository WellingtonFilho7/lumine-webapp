# Onboarding Guide (Modal + Config Card) Design

**Goal:** Provide a lightweight, offline‑first micro‑training that appears on first use and can be reopened later from Config.

## UX Summary
- **First use modal (Radix Dialog):**
  - Title: “Guia rápida (3 passos)”
  - Copy: “Use no começo e no fim do turno. Funciona mesmo offline.”
  - Checklist:
    1) Cadastre a criança (Triagem + Matrícula)
    2) Registre presença no dia
    3) Sincronize no fim do turno
  - Actions: **Entendi** (primary) and **Ver depois** (secondary).

- **Config card (persistent):**
  - Same checklist (3 short lines)
  - Button: “Reabrir guia rápida”

## State + Persistence
- **Key:** `lumine_onboarding_done` in `localStorage`.
- If missing → modal opens automatically.
- **Entendi** sets the key and closes.
- **Ver depois** closes without setting the key (modal will appear next app open).
- **Reabrir guia rápida** clears the key and opens modal immediately.

## Accessibility + UI Constraints
- Use existing Radix `Dialog` patterns.
- No animations or gradients.
- Respect safe‑area insets for overlay/content.
- Keep copy short and scannable.

## Success Criteria
- New device: modal appears on first open.
- “Entendi” stops the modal from reappearing.
- “Ver depois” shows modal again on next load.
- Config card always visible and can re‑open the modal.
