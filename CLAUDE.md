# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Single-page personal todo app — three files, no dependencies, no build tool.

| File | Role |
|---|---|
| `index.html` | Markup, ARIA attributes, semantic structure |
| `style.css` | All styles using CSS custom properties for theming |
| `script.js` | All logic — ~450 lines, heavily commented |

## Running

Open `index.html` directly in a browser. No server required.

## Architecture

`script.js` is flat (no classes). Logical sections, in order:

1. **Constants** — storage keys, category list, filter shortcut map
2. **Quotes** — `QUOTES[]`, `getDailyQuote()` (localStorage-cached per day), `getEncouragement(pct)`
3. **Storage** — `load()`, `save()` (debounced 150ms), per-key helpers
4. **Utilities** — `debounce()`, `timeAgo()`, `sortedVisible()`, `highlightText()`, `announce()`
5. **State** — `todos`, `filter`, `sortMode`, `searchQuery`, `editingId`, `isDark`, `undoBuffer`, animation tracking
6. **DOM refs** — all `getElementById` calls grouped here
7. **Theme** — `applyTheme()`, `toggleTheme()`
8. **Toast** — `showToast(msg, { undoable, duration })`
9. **Modal** — `showModal(message, buttons[])` — fully generic, handles focus trap + ESC + overlay click
10. **Dashboard** — `renderDashboard()` — stats, progress bars, encouragement, `beforeunload` flush
11. **Item builders** — `attachDragHandlers(li, todo)`, `makeViewItem(todo)`, `makeEditItem(todo)`
12. **Render** — `render()` — uses `DocumentFragment` for batched DOM writes
13. **Actions** — `addTodo`, `toggle`, `removeWithAnim`, `undoDelete`, `clearCompleted`, `startEdit`, `setFilter`, `setSort`, `reorderTodos`
14. **Export / Import** — `exportData()`, `importData(file)` with 3-option modal
15. **Event listeners** — all wired here
16. **Init** — `applyTheme()`, `renderQuote()`, `render()`

## Data shape (`localStorage["todos"]`)

```json
[
  {
    "id": "<crypto.randomUUID()>",
    "text": "string (max 200 chars)",
    "category": "업무" | "개인" | "공부",
    "completed": false,
    "createdAt": "<ISO 8601>"
  }
]
```

Other keys: `todos_filter`, `todos_sort`, `theme`, `daily_quote`

## Export file format (`my-tasks-YYYY-MM-DD.json`)

```json
{ "version": 1, "exportedAt": "...", "appName": "My Tasks", "todos": [...] }
```

Import also accepts a raw array `[...]` for backward compatibility.

## Sort modes

| Value | Behaviour |
|---|---|
| `status` (default) | Incomplete first, then newest |
| `newest` | By `createdAt` desc |
| `oldest` | By `createdAt` asc |
| `category` | Alphabetical by category, then newest |
| `manual` | Preserves `todos` array order; drag handles visible |

## Drag & drop (manual sort only)

HTML5 Drag and Drop API. `attachDragHandlers(li, todo)` adds `dragstart/dragend/dragover/dragleave/drop`. Hidden on touch devices via `@media (hover: none)` + mobile CSS. `reorderTodos(srcId, targetId, insertBefore)` mutates `todos` in-place.

## Category colours

| Category | Tag bg | Tag text | Cat bar |
|---|---|---|---|
| 업무 | `#dbeafe` / dark `#1e3a5f` | `#4A90E2` / `#60a5fa` | `#4A90E2` |
| 개인 | `#dcfce7` / dark `#14532d` | `#27AE60` / `#4ade80` | `#27AE60` |
| 공부 | `#ede9fe` / dark `#3b1d5e` | `#8E44AD` / `#c084fc` | `#8E44AD` |

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Alt+N` | Focus add input |
| `Alt+1~4` | Filter: 전체/업무/개인/공부 |
| `Alt+D` | Toggle dark mode |
| `Enter` (input) | Add todo |
| `Enter` (edit) | Commit inline edit |
| `ESC` (edit) | Cancel inline edit |
| `ESC` (modal) | Close modal |

Shortcuts disabled while `editingId` is set.

## Undo system

`undoBuffer = { items: [{ todo, index }], label }`. Set by `removeWithAnim` and `clearCompleted`. Cleared by `undoDelete()` or when a non-undoable toast replaces the current one. Single-item undo restores at original index; bulk undo appends to end.

## Accessibility

- All interactive elements have `aria-label`
- Filter buttons use `aria-pressed`
- Progress bars use `role="progressbar"` with `aria-valuenow`
- `#sr-live` (`role="alert"`, `aria-live="assertive"`) for immediate screen reader announcements
- Modal uses focus trap (Tab cycling) and restores focus to trigger element on close
- `announce(msg)` helper clears then re-sets text to force re-read

## Performance notes

- `debounce(fn, 200)` on search input — avoids render on every keystroke
- `save()` is debounced 150ms — batches rapid state changes; `beforeunload` flushes any pending write
- `render()` uses `DocumentFragment` — single DOM insertion regardless of list size
- `renderDashboard()` uses double `requestAnimationFrame` for CSS transition on bar width
- Animation classes (`entering`, `toggling`) applied to newly-created `li` elements before `appendChild`

## Constraints

- No external dependencies, no build step.
- `render()` does full `innerHTML` replacement — no virtual DOM / diffing.
- `highlightText()` uses `createTextNode` + `<mark>` — never `innerHTML` with user data (XSS-safe).
- `localStorage.getItem` / `setItem` wrapped in try/catch; `QuotaExceededError` surfaces as toast.
