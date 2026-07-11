---
name: shadcn-ui-ux
description: Use this skill whenever the user asks Claude to build, style, refactor, or review any UI component, page, or layout in a React/Next.js project that uses (or could use) shadcn/ui and Tailwind CSS. Trigger on requests like "buat komponen", "build a form/dashboard/modal/table", "styling ini kurang bagus", "improve the UX of this page", "tambah komponen shadcn", or any mention of shadcn, Radix, Tailwind, design system, or component library. This skill applies a mobile-first approach BY DEFAULT for every component and especially every dashboard/admin panel — layouts are designed and verified at mobile width first, then progressively enhanced for tablet/desktop, never the reverse. Trigger proactively any time new UI is being written in a project that already has components.json / shadcn installed, even if the user didn't say "shadcn" explicitly, and especially for dashboards, data tables, charts, or any data-dense screen where mobile usability is easy to neglect.
---

# shadcn/ui UI/UX Builder

Act as a senior product designer + frontend engineer pair. The goal is never just "make it work" — it's a component that is accessible, consistent with the project's design system, visually intentional, and genuinely usable on a phone, not just shrunk to fit one.

## 0. Detect the project setup first

Before writing any code, check:

1. Does `components.json` exist at the project root? → shadcn/ui is already initialized. Read it to get the configured `style`, `baseColor`, `cssVariables`, and aliases (`@/components`, `@/lib/utils`, etc). Follow these exactly — never introduce a second convention.
2. Is Tailwind config present (`tailwind.config.ts/js` or Tailwind v4 `@theme` in CSS)? Check whether it's Tailwind v3 (config-based) or v4 (CSS-first) — shadcn commands and file locations differ between them.
3. Which components already exist under `components/ui/`? Reuse them. Never hand-roll a `<button>` when `Button` already exists in the project. Check specifically whether `Sheet`, `Drawer`, and `Accordion` are already installed — these are the primitives mobile dashboards lean on most.

If shadcn/ui is NOT yet installed and the task needs it:

```bash
npx shadcn@latest init
```

Then add only the primitives actually needed for the task, e.g.:

```bash
npx shadcn@latest add button input form dialog
```

Don't bulk-install the entire component library "just in case" — it bloats the repo and hides which components are actually in use.

## 1. Composition rules

- **Never edit files inside `components/ui/`** to add one-off behavior. Those are the generated primitives — compose around them instead (wrap, extend via props, or build a new component in `components/` that uses the primitive).
- Prefer composing shadcn primitives (`Dialog` + `Form` + `Input` + `Button`) over building custom markup that duplicates what a primitive already does (focus trap, ARIA roles, keyboard nav are already solved — don't reinvent them).
- Use `cn()` from `@/lib/utils` for conditional classNames, not manual string concatenation or ternaries inline.
- Use `class-variance-authority` (cva) for components with visual variants (size, intent, state), matching the pattern shadcn itself uses — don't invent a different variant system per component.
- Forms: use `react-hook-form` + `zod` + the shadcn `Form` wrapper, not uncontrolled inputs with manual validation, unless the project's existing forms do otherwise.

## 2. Mobile-first is the default approach, not an afterthought

Design and build for the smallest viewport first (~360–390px), then add complexity for larger screens using Tailwind's `sm:`/`md:`/`lg:`/`xl:` prefixes. Never design for desktop and then squeeze it down for mobile — that produces cramped, unusable layouts (tiny touch targets, dense tables, horizontal overflow, buried navigation).

**Unprefixed Tailwind classes = the mobile layout.** Add breakpoint prefixes only to _change_ something for larger screens:

```tsx
// Correct: mobile-first — base classes ARE the phone layout
<div className="flex flex-col gap-4 p-4 md:flex-row md:gap-6 md:p-6">

// Wrong: desktop-first, retrofitted with max-* overrides
<div className="flex flex-row gap-6 p-6 max-md:flex-col max-md:gap-4 max-md:p-4">
```

**Layout rules for mobile-first dashboards:**

- **Single column by default.** Stack cards/widgets/KPI tiles vertically on mobile; only move to multi-column grids from `md:`/`lg:` up (`grid-cols-1 md:grid-cols-2 lg:grid-cols-4`). Order stacked sections by priority — most important metric/action first, not left-to-right desktop reading order collapsed downward.
- **Navigation:** collapse the sidebar into a `Sheet` (slide-over) triggered by a menu button on mobile; only render a persistent `Sidebar` from `md:`/`lg:` up. Never ship a fixed sidebar that eats most of a phone's screen width.
- **Bottom nav for primary actions** when the dashboard has roughly 3–5 top-level sections — easier thumb reach than a top bar on mobile. Reserve the top bar for page title, search, and secondary actions.
- **Data tables:** don't render a wide `Table` unmodified on mobile. Either (a) wrap it in a horizontally scrollable container with a visible scroll affordance (e.g. a subtle gradient/shadow edge), or (b) transform each row into a stacked card of `label: value` pairs below `md:`. Choose based on how many columns are genuinely essential at a glance on mobile — usually 2–3, with the rest available on tap-through.
- **Charts:** always wrap in a responsive container (e.g. recharts `ResponsiveContainer`) so it fills available width instead of overflowing. Reduce axis labels, legend items, and tick density on narrow screens rather than shrinking text below readable size — simplify the chart, don't miniaturize it.
- **Filters/toolbars:** collapse multi-filter toolbars into a `Sheet`/`Drawer` triggered by a "Filters" button on mobile, instead of a row of selects that wraps awkwardly or overflows horizontally.
- **Modals vs sheets:** prefer `Sheet` (bottom or side slide-over) over `Dialog` on mobile widths — easier to reach and dismiss one-handed. `Dialog` is fine from `md:` up if that's the project's established desktop pattern.

**Touch and readability minimums:**

- Interactive elements (buttons, icon buttons, row actions) need a minimum ~40–44px tap target, even if the visible icon/label is smaller — pad the hit area, don't just rely on the icon's bounding box.
- Body text minimum `text-sm` (~14px); avoid `text-xs` for anything the user needs to read rather than just glance at.
- Space adjacent interactive elements at least ~8px apart so taps don't misfire.
- Avoid content that forces unintentional horizontal scrolling — as opposed to a deliberate horizontal-scroll pattern (table, carousel, tab strip) that has a clear affordance.

**Fixed/sticky elements:** be careful with `fixed`/`sticky` headers, footers, or bottom nav — on mobile they can be covered or pushed by the on-screen keyboard when a form input is focused. Test with a focused input before shipping a fixed bottom bar.

**Exception:** if the user explicitly states the tool is desktop-only (e.g. an internal ops console never opened on a phone), mobile-first still applies as the _build_ methodology (base classes = smallest supported viewport), but you can skip true phone-width support — confirm this scope explicitly rather than assuming it.

## 3. Don't accept the defaults uncritically

shadcn's default theme (`zinc` base color, default radius, default shadcn spacing) is a _starting point_, not a finished design. Before shipping a component:

- Check `components.json` / the CSS variables in `globals.css` for the project's actual theme tokens (colors, radius, fonts) and use those — don't hardcode raw Tailwind colors (`bg-blue-500`) when a semantic token exists (`bg-primary`).
- If no real design direction has been set yet and the task is more than a single small component (e.g. a whole page or dashboard), briefly consult a design-thinking pass: what is this screen's one job, what's the information hierarchy **at mobile width specifically** (what's visible above the fold on a phone, what can wait behind a tap), and what state does the user land in by default (loading / empty / error / populated)? Don't jump straight to code for anything non-trivial.
- Flag to the user, in one line, any accessibility or UX gap you patched (e.g. "added a visible focus ring / aria-label because the icon button had no accessible name") — don't silently skip these, and don't silently fix-and-not-mention either.

## 4. Required quality bar for every component

- **Accessibility**: every interactive element has a visible focus state, correct semantic element or ARIA role, and a label (visible or `aria-label`) if it's icon-only. Color contrast should pass for text on the project's actual theme colors, not just the default palette.
- **Responsiveness — mobile first, non-negotiable**: build and verify at mobile width (~375px) _first_. Only after the mobile layout genuinely works — readable text, reachable tap targets, no overflow — move on to checking `md:`/`lg:` breakpoints. Never ship something only checked at desktop width; that's backwards for this skill's default methodology.
- **States**: components that fetch or mutate data need loading, empty, and error states — don't only build the "happy path" unless explicitly asked for a static mockup.
- **Dark mode**: if the project has `dark:` variants or a theme provider configured, new components must work in both themes — check `globals.css` for `.dark` variables before assuming light-only.

## 5. Workflow

1. Read `components.json`, `globals.css`/theme file, and any existing similar component in the project (e.g. if asked for a new modal, look at an existing `Dialog` usage) before writing new code — match established patterns.
2. Install any missing shadcn primitives via the CLI (never hand-copy component source from memory — versions and internals change).
3. Build the component **starting from the mobile layout** (section 2), composing primitives per section 1, then layer on `md:`/`lg:` variants for larger screens.
4. Self-review against section 4's checklist before presenting the result, with mobile width checked first.
5. In your response to the user, note in one short line what shadcn primitives you used and any design/UX decision worth flagging (e.g. "used `Sheet` instead of `Dialog` on mobile widths for better reachability," or "stacked the data table into cards below `md:` since only 2 of 6 columns are essential at a glance").

## 6. When NOT to reach for shadcn

If the user is working in a plain HTML/CSS artifact (not a React/Next.js project with shadcn installed), or explicitly asks for framework-agnostic styling, don't suggest installing shadcn — follow the project's actual stack instead. The mobile-first methodology in section 2 still applies regardless of component library.
