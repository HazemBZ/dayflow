# Dayflow UI Design Contract

## 0. Research Log

- Existing product surface inspected through the Todos page and shared shadcn/Base UI primitives.
- No external visual reference supplied; preserve existing operational UI rather than redesigning it.

## 1. Surface

Dayflow uses a compact, calm operational workspace for planning and Todo coordination. New project controls must feel native to the existing Todos surface.

## 2. Tokens

- Colors: use semantic Tailwind theme tokens already defined by the app (`background`, `foreground`, `muted`, `muted-foreground`, `border`, `primary`, `destructive`, and card/popover tokens). Do not introduce hard-coded palette values.
- Typography: inherit app font stack and existing text scale. Use compact labels and readable body text.
- Spacing: use existing Tailwind spacing utilities and current card/dialog padding; prefer consistent `gap-2`, `gap-3`, and `space-y-4` patterns.
- Radius and elevation: use existing `rounded-*`, border, card, and popover primitives; no new shadow language.

## 3. Primitives

- `Button`, `Dialog`, `Input`, `Select`, `Card`, and `PageScroll` from existing shared components.
- Lucide icons only; icons need accessible labels when they carry interaction meaning.
- Project metadata uses compact secondary text and truncates long paths without changing stored values.

## 4. Interaction States

- Dialogs stay open after successful project creation so multiple projects can be entered.
- Save disables while pending or when trimmed fields are empty.
- Submission errors remain visible with `role="alert"`; failed values remain intact.
- Select offers explicit `No project`; clearing sends `null`.
- Loading and disabled states prevent duplicate submissions.

## 5. Responsive Behavior

- Todos header actions wrap on narrow screens.
- Dialogs remain within viewport width.
- Long paths truncate in metadata and remain available through title/wrapping dialog content.
- Select controls remain keyboard usable at narrow widths.

## 6. Accessibility

- Every input and select has a visible label or equivalent accessible name.
- Preserve Dialog focus management, Escape close, and keyboard Select behavior.
- Do not use color alone to communicate project state or errors.

## 7. Motion

No new decorative motion. Preserve existing component transitions; motion only communicates opening, closing, loading, or state change.

## 8. Accepted Debt

This feature preserves existing Todos visual language and does not introduce a separate project-management route. A future design pass may consolidate repeated metadata rows if product scope expands.
