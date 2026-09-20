# 08 — Design Guide

The visual and interaction system for Exceller Trainer. Every component is custom-built.
No component library, no template, no emoji.

---

## The concept: **Arcade Brutalist**

An arcade cabinet crossed with a code editor.

Hard edges. Thick borders. Hard offset shadows with zero blur. Saturated colour used
*functionally* — every stage owns a hue, so you know where you are before you read a word.
Chunky, physical interactions: things depress when you press them.

### The governing principle: **loud chrome, quiet content**

The shell is vivid and fun. The content area — where you read a question stem for the four
hundredth time at 1am — is calm, high-contrast and generously spaced.

This is the tension the whole system resolves. A fully brutalist app is exhausting to study in.
A fully calm app is boring to open. So: **colour and personality live in the navigation, cards,
buttons, badges, timers and game surfaces. The reading surface stays quiet.**

### What this explicitly is not

| Not this | Because |
| --- | --- |
| Emoji as iconography | Renders differently per platform, ages badly, reads as unconsidered. **The app contains zero emoji.** All icons are custom SVG. |
| Rounded-corner card grid with soft grey shadows | The default. Recognisable as a template at a glance. |
| A component library's default theme | Custom components throughout — see the inventory below. |
| Gradient-on-glass / glassmorphism | Poor contrast, heavy, dated. |
| Muted "professional SaaS" palette | The brief asked for colour, and functional colour genuinely helps here. |
| Decorative illustration | Costs bytes and attention, teaches nothing. |

---

## 1. Colour

### 1.1 Stage identity — functional colour

Six stages, six hues. This is **wayfinding, not decoration**: the drill you're in is
identifiable at a glance from peripheral vision.

| Stage | Token | Hex | Hue |
| --- | --- | --- | --- |
| Communication | `--stage-english` | `#FF5C39` | Coral |
| AI Literacy | `--stage-ai` | `#9B5DE5` | Violet |
| Technical | `--stage-technical` | `#00C2FF` | Azure |
| Debugging | `--stage-debug` | `#FFB020` | Amber |
| AI-Assisted Coding | `--stage-aic` | `#B8FF3D` | Acid lime |
| Cognitive | `--stage-cognitive` | `#FF3D8B` | Magenta |

Each hue ships four variants:

```
--stage-{name}          /* the pure hue — borders, accents, fills */
--stage-{name}-ink      /* text colour to place ON the pure hue */
--stage-{name}-soft     /* 12% tint — panel backgrounds */
--stage-{name}-edge     /* 40% tint — subtle borders */
```

`-ink` is always either near-black `#0B0D10` or near-white `#F2F5F7`, whichever clears 7:1 —
never a mid-tone. On our six hues: azure, amber, lime and coral take dark ink; violet and
magenta take light ink.

### 1.2 Semantic colour

| Meaning | Token | Hex |
| --- | --- | --- |
| Correct | `--ok` | `#35E08A` |
| Wrong | `--bad` | `#FF4757` |
| Warning / time pressure | `--warn` | `#FFB020` |
| Information | `--info` | `#00C2FF` |
| Untested / unknown | `--unknown` | `#5C6773` |

**Correct (`#35E08A`) is deliberately distinct from the AIC stage hue (`#B8FF3D`).** Green
means "you got it right" everywhere in the app and must never be ambiguous with a stage colour.

### 1.3 Neutrals

Dark is the default theme (this is a late-night app). Light is fully supported.

```css
:root {                          /* light */
  --paper:        #FBFAF7;       /* warm off-white, not pure white */
  --paper-raised: #FFFFFF;
  --paper-sunken: #F0EEE8;
  --ink:          #12151A;
  --ink-muted:    #4E5866;
  --ink-faint:    #8A94A3;
  --edge:         #12151A;       /* borders are INK in light mode — this is the brutalist tell */
  --edge-soft:    #D8D5CC;
}

:root[data-theme="dark"] {
  --paper:        #0B0D10;
  --paper-raised: #14181D;
  --paper-sunken: #07090B;
  --ink:          #F2F5F7;
  --ink-muted:    #9AA6B2;
  --ink-faint:    #5C6773;
  --edge:         #2A3139;
  --edge-soft:    #1C2229;
}
```

### 1.4 Contrast rules (non-negotiable)

- Body text on `--paper`: **≥ 7:1** (AAA). You read this for hours.
- Any text on a stage hue: **≥ 7:1** using that hue's `-ink`.
- Interactive borders: **≥ 3:1** against their background.
- **Colour never carries meaning alone.** Correct/wrong is colour *plus* a glyph *plus* a
  label. Roughly 1 in 12 people can't rely on the red/green distinction, and the app must not
  quietly become unusable for them.

---

## 2. Typography

Two families. Both from Google Fonts, both loaded with `display: swap`.

| Role | Family | Why |
| --- | --- | --- |
| Display + UI | **Space Grotesk** (500, 700) | Geometric grotesk with odd, characterful letterforms. Distinctive without being illegible. Not Inter. |
| Code, numerals, timers | **JetBrains Mono** (400, 700) | Designed for code; excellent zero/O and 1/l distinction, which matters when tracing pseudocode. |

### Scale

A 1.25 ratio, rounded to whole pixels:

```css
--t-xs:   12px;  /* labels, metadata */
--t-sm:   14px;  /* secondary text, table cells */
--t-base: 16px;  /* body, question stems */
--t-lg:   20px;  /* card titles */
--t-xl:   25px;  /* section headings */
--t-2xl:  31px;  /* page titles */
--t-3xl:  39px;  /* dashboard readiness numbers */
--t-4xl:  49px;  /* timer, game score */
```

### Rules

- **Question stems: `--t-base`, line-height 1.7, max-width 68ch.** This is the single most
  important typographic decision in the app — it is the text you read most.
- **All numerals that change are JetBrains Mono with `font-variant-numeric: tabular-nums`.**
  Timers, scores, counters. Proportional digits jitter as they tick and it's maddening.
- Headings: Space Grotesk 700, `letter-spacing: -0.02em`.
- Micro-labels (badges, nav, table headers): Space Grotesk 500, `11px`,
  `letter-spacing: 0.08em`, uppercase. This is a signature of the system — use it consistently.
- Never centre a paragraph. Centre only single-line labels.

---

## 3. Shape, depth and space

### Shape
```css
--r-none: 0;      /* panels, cards, modals, game boards */
--r-sm:   4px;    /* buttons, inputs, badges */
--r-full: 999px;  /* only: avatar dot, progress track caps */
```
Rectangles dominate. The occasional 4px softening on interactive elements keeps it from
feeling hostile.

### Depth — hard shadows, no blur

The signature of the system. **Zero blur radius.** Shadows are solid offset rectangles in ink.

```css
--shadow-flat:  0 0 0 0 var(--edge);
--shadow-1:     3px 3px 0 0 var(--edge);
--shadow-2:     5px 5px 0 0 var(--edge);
--shadow-stage: 5px 5px 0 0 var(--stage-current);  /* stage-tinted, for the active surface */
```

Borders are **2px solid `--edge`** on every raised surface. Not 1px — the weight is the point.

### Space — 4px base grid

```css
--s-1: 4px;  --s-2: 8px;  --s-3: 12px; --s-4: 16px;
--s-5: 24px; --s-6: 32px; --s-7: 48px; --s-8: 64px;
```

Panel padding `--s-5`. Gap between cards `--s-4`. Page gutter `--s-6` desktop, `--s-4` mobile.

---

## 4. Motion

Snappy and physical. Nothing floats or fades slowly.

```css
--dur-instant: 80ms;
--dur-fast:    140ms;
--dur-base:    200ms;
--ease-out:    cubic-bezier(0.2, 0, 0, 1);
--ease-snap:   cubic-bezier(0.34, 1.4, 0.64, 1);  /* slight overshoot */
```

### The press interaction — the app's tactile signature

A pressable element sits on a hard shadow. On `:active` it **translates into its own shadow**:

```css
.press { box-shadow: var(--shadow-1); transition: transform var(--dur-instant) var(--ease-out),
                                                  box-shadow var(--dur-instant) var(--ease-out); }
.press:active { transform: translate(3px, 3px); box-shadow: var(--shadow-flat); }
```

It costs two lines and makes every click feel like a physical switch. Applied to buttons,
option rows, game cells, and nav items.

### Motion rules
- Answer feedback appears in `--dur-instant`. Any delay between clicking and knowing feels broken.
- No entrance animations on content. The question is either there or it isn't.
- **Celebration is earned, not constant.** A correct answer gets a border flash. Finishing a
  mock or beating a personal best gets the one real animation in the app. If everything
  celebrates, nothing does.
- **`@media (prefers-reduced-motion: reduce)`**: all transforms become instant state changes,
  the press translate is removed, celebrations become a static state. This is implemented once
  globally, not per component.

---

## 5. Iconography — custom, no emoji

A single hand-built set. **Zero emoji anywhere in the product.**

**Grid:** 24×24. **Stroke:** 2px, `stroke-linecap: square`, `stroke-linejoin: miter`.
**Style:** geometric, drawn on a 4px sub-grid, no curves where a corner will do — it matches
the brutalist shape language. `currentColor` only, never hardcoded fills.

### Inventory

| Name | Drawn as |
| --- | --- |
| `dashboard` | Four unequal rectangles in a 2×2 |
| `drill` | A downward chevron stack (three nested V shapes) |
| `trace` | Three horizontal lines with a bracket, one line offset right |
| `debug` | A rectangle with one corner broken away |
| `aic` | Two overlapping squares, one dashed outline |
| `games` | A square grid with one cell filled |
| `comm` | A rectangular speech block with a hard notch |
| `mock` | A clipboard rectangle with a check bar |
| `review` | A circular arrow drawn with straight segments |
| `log` | Stacked rectangles with a left rule |
| `settings` | A slider track with two square handles |
| `timer` | A square clock with hard hands |
| `check` | A chunky two-segment tick |
| `cross` | Two crossing strokes, square caps |
| `flag` | A pennant on a vertical rule |
| `chevron` | Directional, four rotations |
| `spark` | A four-point star (personal best) |
| `lock` / `unlock` | For gated sections |

### Status glyphs — the emoji replacement

Readiness banding uses **geometric glyphs plus colour plus a text label**, never colour alone:

| Band | Glyph | Colour | Label |
| --- | --- | --- | --- |
| ≥85 | Filled square with a corner notch | `--ok` | `SAFE` |
| 70–84 | Filled square | `--ok` | `ON TRACK` |
| 50–69 | Half-filled square (diagonal split) | `--warn` | `SHAKY` |
| <50 | Hollow square with a 2px stroke | `--bad` | `AT RISK` |
| null | Dashed hollow square | `--unknown` | `UNTESTED` |

Implemented as `<StatusGlyph band="at-risk" />` — one component, five drawings.

---

## 6. Custom component inventory

Everything below is hand-built in `src/components/`. No external UI dependency.

### 6.1 Primitives (`components/ui/`)

| Component | Anatomy | States |
| --- | --- | --- |
| `Button` | 2px border, hard shadow, uppercase micro-label. Variants: `solid` (stage-hued fill), `outline`, `ghost`, `danger`. Sizes `sm`/`md`/`lg`. | default · hover (shadow grows to `--shadow-2`) · active (press-in) · focus (3px offset ring in stage hue) · disabled (no shadow, 40% ink) · loading (inline bar, not a spinner) |
| `Panel` | The base surface: 2px border, hard shadow, optional stage-tinted header strip | flat · raised · stage-tinted |
| `Badge` | Micro-label in a 1px-bordered rect, optional leading glyph | neutral · stage · ok · bad · warn |
| `StatusGlyph` | The five readiness drawings above | — |
| `Icon` | Renders one of the inventory by name | — |
| `ProgressTrack` | Squared-off track, hard-edged fill, tabular numeral label | determinate · segmented (one block per question) |
| `Toggle` | A hard rectangular switch that slides with a thunk | on · off · disabled |
| `Field` | Label + input + hint + error, 2px border, inset shadow on focus | default · focus · error · disabled |
| `Tabs` | Buttons on a shared baseline rule; the active tab breaks the rule | — |
| `Modal` | Hard-bordered panel, no blur on the backdrop — a flat 80% ink scrim | — |
| `Toast` | Bottom-left stack, bordered, auto-dismiss with a draining rule | ok · bad · info |
| `EmptyState` | A large custom glyph, one line of copy, one action | — |
| `KeyCap` | Renders a keyboard shortcut as a pressed-in key | — |

### 6.2 Domain components

| Component | Notes |
| --- | --- |
| `StageCard` | Dashboard tile. Stage hue as a left bar, `StatusGlyph`, readiness in `--t-3xl` mono, 7-day sparkline. |
| `ReadinessSparkline` | Custom SVG. Hard polyline, no curve smoothing, no fill gradient. |
| `ExamTimer` | `--t-4xl` tabular mono. Border and digits shift to `--warn` at 25%, `--bad` at 10%. Last 10s: the border pulses on the second, not the digits. |
| `BudgetBar` | Per-question budget. Drains left-to-right; overruns invert to `--bad` and keep going. |
| `QuestionStem` | The quiet zone: `--paper`, 68ch, 1.7 line-height, no border. |
| `OptionRow` | Full-width pressable. Leading `KeyCap` (1–4). Selected: 3px stage border + soft fill. Correct: `--ok` border + check glyph + "CORRECT". Wrong: `--bad` + cross + "YOUR ANSWER", with the correct row also marked. |
| `ConfidenceToggle` | Two hard buttons, `SURE` / `GUESS`. |
| `ExplanationPanel` | Stage-tinted header strip, body in the quiet style, collapsible distractor list. |
| `VariableTable` | Trace stepper. Monospace grid, current row inverted, changed cells flash the stage hue for 140ms. |
| `CodeSurface` | Wraps Monaco with a matching 2px border and a custom theme built from these tokens. |
| `TestResultList` | One hard-bordered row per test; pass/fail glyph + name + diff toggle. |
| `HintLadder` | Four locked rows, each showing its score cost; unlocking is a deliberate two-step. |
| `StepWizard` | The AIC five-step rail. Completed steps show their score; the current step is stage-hued; future steps are dashed outlines. |
| `RubricChecklist` | Requirement rows with check/cross glyphs and the text you did or didn't cover. |
| `GameShell` | Rules screen, level indicator, timer, score. Full-bleed, stage-hued chrome. |
| `GameCell` | The atomic grid cell for Grid/Digit/Motion. Pressable, hard-bordered. |
| `TopicHeatmap` | Hard-edged rectangles, no gaps, sized by attempt count, coloured by accuracy. |
| `NavRail` | Left rail, icon + micro-label. The active item's background becomes that stage's hue. |

### 6.3 Component rules

1. **Every component is a file in `src/components/`, typed, with no external UI dependency.**
2. **No component hardcodes a colour.** Tokens only — that's what makes theming and stage-hueing work.
3. **Every interactive element has a visible focus ring** (3px, offset 2px, stage hue). Never
   `outline: none` without a replacement.
4. **Stage hue arrives via a `data-stage` attribute on a container**, which sets
   `--stage-current`. Components read `--stage-current` and never know which stage they're in.
   One attribute re-skins an entire screen.

---

## 7. Layout

```
┌────┬──────────────────────────────────────────────┐
│    │  TOPBAR  exam countdown · streak · theme     │
│ N  ├──────────────────────────────────────────────┤
│ A  │                                               │
│ V  │   CONTENT                                     │
│    │   max-width 1200px, gutter 32px               │
│ R  │   reading surfaces capped at 68ch             │
│ A  │                                               │
│ I  │                                               │
│ L  │                                               │
└────┴──────────────────────────────────────────────┘
```

- **Nav rail:** 72px collapsed (icon + micro-label), 208px expanded. State persisted.
- **Topbar:** 56px. Exam countdown is permanent and slightly uncomfortable by design.
- **Drill/mock runner is full-bleed** — nav rail collapses automatically. Nothing competes
  with the question.
- **Breakpoints:** `<720px` single column, rail becomes a bottom bar; `720–1080px` rail
  collapsed; `>1080px` rail expanded.

---

## 8. Dark and light

Dark is the default. Both are first-class, not an inversion.

```css
:root { /* light tokens */ }
:root[data-theme="dark"] { /* dark tokens */ }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { /* dark tokens */ } }
```

Stage hues **shift slightly between themes** — the same hex on a white page is harsher than on
near-black. Light mode drops each hue's lightness by ~8% and raises chroma slightly.

In light mode, `--edge` is `--ink` (near-black borders). That hard black-on-warm-white outline
*is* the brutalist signal, and it's what stops light mode looking like a generic dashboard.

---

## 9. Accessibility

Non-negotiable, and cheap if built in from the start:

- Body text ≥ 7:1, all UI text ≥ 4.5:1
- **Never colour alone** — always colour + glyph + text
- Visible focus ring everywhere; logical tab order; no keyboard traps
- Full keyboard operation: `1`–`4` select, `Enter` submit, `F` flag, `Space` next, `?` shortcuts
- `prefers-reduced-motion` honoured globally
- Semantic HTML: real `<button>`, real `<label>`, `<main>`/`<nav>`, one `<h1>` per page
- Live regions (`aria-live="polite"`) for timer warnings and answer feedback
- Target size ≥ 44×44px for game cells and option rows
- Works at 200% browser zoom without horizontal scroll

---

## 10. Implementation notes

- Tokens live in `src/app/tokens.css` as CSS custom properties, imported once in the root layout.
- Tailwind v4 reads the tokens via `@theme` so utilities and custom CSS share one source of truth.
- Component-specific CSS uses CSS Modules (`Button.module.css`) — keeps brutalist details like
  the press-translate out of crowded className strings.
- **The press interaction, focus ring and reduced-motion handling are each written once**, in
  `tokens.css`, and composed — not reimplemented per component.
- Fonts self-hosted via `next/font/google` (Space Grotesk, JetBrains Mono) — no layout shift,
  no third-party request at runtime.

## 11. The test

Before shipping any screen, three questions:

1. **Could you tell which stage this is from six feet away?** If not, the stage hue isn't doing its job.
2. **Could you read a question stem on it for two hours?** If not, the chrome has leaked into the content.
3. **Does it look like a template?** If yes, it's the radius, the soft shadow, or the grey. Fix it.
