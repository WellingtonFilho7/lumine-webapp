# Daily Record Edit Design

**Goal:** Allow operators to edit a same‑day record (including quick records) by tapping it and opening the detailed form prefilled, without creating duplicates.

## UX Summary
- **Mobile:** Add a "Registros do dia" card in the Registro screen for the selected date. Tapping a row opens the detailed form in **edit mode**, shows a banner (“Editando registro de <nome>”), and changes the primary button to **"Atualizar registro"**. A “Cancelar edição” action resets state.
- **Desktop:** Add a "Registros do dia" list under "Pendentes". Clicking a row fills the right‑hand form and switches to edit mode with a pill banner. A cancel action returns to create mode.

## Data / State
- Local state in Registro view:
  - `editingRecordId` (string | null)
  - `editingChildId` (childInternalId)
  - `editingMode` derived from `editingRecordId`
- When a record row is selected:
  - Set `editingRecordId` and `selectedChildId`
  - Load `form` from the record (fallback to defaults for missing fields)
  - Set `step = 'details'` (mobile)

## Update Rules
- A record is uniquely identified by **childInternalId + date**.
- Saving in edit mode calls `addDailyRecord` with the same `childInternalId + date`, which already replaces existing entries. This avoids duplicates.
- If the user changes the selected date while editing, edit mode is cleared to avoid cross‑date updates.

## Edge Cases
- Quick record converted to detailed: missing fields stay with defaults, user completes and saves.
- Inactive children are not shown in pending list, but existing same‑day records remain editable.

## Feedback
- Toast: “Registro atualizado!” when saving in edit mode.
- Toast: “Registro salvo!” for new records.

## Test Plan (TDD)
- Selecting a record loads form values and enters edit mode.
- Saving in edit mode replaces the existing record (no duplicates).
- Date change clears edit mode.
