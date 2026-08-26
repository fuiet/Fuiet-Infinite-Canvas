# Fuiet Infinite Canvas · Final UI Design System

Status: **Final design direction / implementation source of truth**

This document replaces the visual direction of the older `canvas-ui-v1.css`, `canvas-ui-v2.css`, `workspace-canvas-v3.css`, and ad-hoc page-specific styling. New UI work must follow this system instead of adding another override layer.

## 1. Product design thesis

Fuiet Infinite Canvas is not a generic AI dashboard. It is a **creative routing desk** for moving text, image, audio and video through generation workflows.

The interface should feel closer to a calm professional post-production / signal-routing workspace than to a SaaS admin panel.

Design priorities, in order:

1. The canvas and the user's media are the visual protagonists.
2. Workflow relationships must be understandable at a glance.
3. Generation state must be visible without opening a task panel.
4. Controls appear near the object they affect; global chrome stays quiet.
5. Advanced capability is progressively disclosed rather than permanently visible.
6. Desktop is the primary creation environment; mobile is a focused review/control surface, not a shrunken desktop canvas.

## 2. Chosen visual direction

### Direction exploration

**A. Floating cockpit**

```text
┌ workspace ───────────────────────────── tools ┐
│                                              │
│       [ node ] ─── [ node ]                  │
│                 floating panels              │
│                                              │
│             floating bottom dock             │
└──────────────────────────────────────────────┘
```

Pros: visually light.  
Cons: too many floating islands; weak spatial hierarchy; starts to resemble generic AI tools.

**B. Routing studio — SELECTED**

```text
┌ Workspace / Canvas ───────────── Run / Share ┐
├──────────────────────────────────────────────┤
│                                              │
│   [Text] ───── [Image] ═════ [Video]         │
│      │                    selected signal     │
│      └──── [Audio]                            │
│                                              │
│                              ┌ Inspector ┐    │
│                              │ contextual│    │
│                              └───────────┘    │
├──── status / zoom ─────────────── quick add ─┤
└──────────────────────────────────────────────┘
```

Pros: canvas-first, workflow-native, quiet chrome, clear contextual editing.  
Cons: requires disciplined component hierarchy and better state design.

**C. Permanent three-column studio**

```text
┌ Library ┬──────── Canvas ────────┬ Inspector ┐
│         │                        │           │
│         │                        │           │
└─────────┴────────────────────────┴───────────┘
```

Pros: predictable.  
Cons: permanently sacrifices canvas space and feels like a standard editor clone.

### Final choice

Use **Routing Studio**.

The interface stays mostly neutral. Color is not decoration; it is a live signal language for media types, selection, status, warnings and active workflow paths.

## 3. Signature element: Signal Path

The memorable Fuiet interaction is the **Signal Path**.

When a node is selected, the system subtly reveals its upstream and downstream workflow as a luminous routing trace:

- selected node: stronger border + local halo;
- directly connected edges: brighter signal trace;
- first-degree connected nodes: slightly lifted surface;
- unrelated nodes: remain neutral, never dim so much that the canvas becomes unreadable;
- running generation: a restrained moving pulse travels on the relevant edge;
- success: pulse resolves into the output node once, then returns to static;
- error: no flashing; use a short red/orange segment at the failed node/edge.

This is the one place where motion may be visually distinctive. Other motion should remain restrained.

`prefers-reduced-motion` must replace travelling pulses with static state styling.

## 4. Color system

Use six core tokens. Avoid additional arbitrary grays in components.

| Token | Hex | Purpose |
| --- | --- | --- |
| `ink-950` | `#111210` | canvas / deepest background |
| `ink-900` | `#181917` | primary surface |
| `ink-800` | `#232421` | raised / interactive surface |
| `paper-100` | `#F1EFE9` | primary text / high-emphasis controls |
| `ash-400` | `#8D8D86` | secondary text / inactive chrome |
| `signal-cyan` | `#58CFE0` | selection, links, active signal |

Semantic extensions may exist only for states/media roles and must be centralized:

- success: `#72C69A`
- warning: `#D6A85F`
- danger: `#D87878`
- image: `#B8A1E3`
- video: `#E89A72`
- audio: `#8FC7A7`
- text/script: `#AEB5BE`

Rules:

- `signal-cyan` is not used for decorative headings or random hover effects.
- media colors appear in tiny identity cues: node type mark, badge, waveform/playhead, not as full-card backgrounds.
- large panels stay neutral.
- white should be warm (`paper-100`), not pure `#fff`, except for tiny high-contrast optical corrections.

## 5. Typography

Typography must communicate three roles.

### Display / workspace identity

`Sora`, fallback `Inter`, system sans.

Use only for:

- workspace name;
- major modal titles;
- major empty-state headline;
- rare product-level headings.

Weights: 600–650 only.

### UI / body

`Inter`, `PingFang SC`, `Microsoft YaHei`, system sans.

Use for all controls, labels, body text and menus.

### Data / model / task identifiers

`IBM Plex Mono`, `SFMono-Regular`, `Consolas`, monospace.

Use for:

- model IDs;
- task IDs;
- API route snippets;
- technical status values;
- timestamps only where alignment matters.

### Type scale

| Role | Size | Line height | Weight |
| --- | ---: | ---: | ---: |
| Workspace title | 16px | 22px | 650 |
| Modal / page title | 20px | 28px | 650 |
| Section title | 14px | 20px | 600 |
| UI body | 13px | 19px | 450–500 |
| Control | 13px | 18px | 500–600 |
| Metadata | 12px | 17px | 450 |
| Micro data | 11px | 15px | 500 |

No production UI text below **11px**.

## 6. Spacing and geometry

Base spacing unit: **4px**.

Allowed spacing steps:

`4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48`

Do not introduce one-off 7px, 9px, 13px spacing unless required for optical alignment.

### Radius

- compact control: 7px
- button / field: 8px
- node: 10px
- menu / popover: 12px
- modal / large inspector: 14px

Avoid blanket 16–20px rounding. This is a professional tool, not a card-based consumer app.

### Borders

Use hierarchy rather than many visible outlines:

- default divider: `rgba(241,239,233,.08)`
- interactive border: `rgba(241,239,233,.12)`
- hover border: `rgba(241,239,233,.20)`
- selected border: signal color at 70–85% opacity

Only one visible border per component layer.

## 7. Global layout

### Desktop ≥ 1180px

Top bar: 48px.

Left side contains only context identity:

- workspace name;
- canvas switcher;
- workflow/storyboard view switch.

Right side contains only global actions:

- undo/redo grouped;
- run/production;
- task status;
- share;
- overflow menu.

`Agent`, settings, context management and secondary tools move into the overflow / contextual inspector unless actively needed.

Bottom center dock contains only creation/navigation primitives:

- Add;
- Select / Hand mode;
- Auto layout;
- Assets;
- History.

Shortcut help and tutorial do not deserve permanent dock slots; place them under Help/overflow.

### Medium 820–1179px

- compress workspace label;
- hide secondary text labels;
- inspector becomes overlay instead of pushing canvas;
- global actions collapse into overflow as space runs out.

### Mobile < 820px

Mobile is a **review + prompt + task control mode**.

Do not preserve full desktop chrome.

Default mobile shell:

```text
┌ Canvas name                ··· ┐
├────────────────────────────────┤
│                                │
│     focused node / preview     │
│                                │
├────────────────────────────────┤
│ Prompt / params / Run          │
├────────────────────────────────┤
│ Nodes    Storyboard    Tasks    │
└────────────────────────────────┘
```

Mobile can pan/zoom the canvas when explicitly entering “Canvas mode”, but it should not force 900px-wide desktop tables into horizontal scrolling as the default experience.

## 8. Canvas

Canvas background:

- base `ink-950`;
- very subtle dot field, 20–24px spacing;
- no decorative radial gradients;
- grid contrast under 6% opacity;
- no permanent center hint once the canvas contains content.

Empty state:

- one headline;
- one action sentence;
- three primary quick-start actions maximum: Text / Image / Video;
- secondary types inside Add menu.

Preferred copy:

**Start a workflow**  
Add a prompt, drop in media, or connect an existing asset.

## 9. Nodes

Node visual structure:

```text
 type · title                         ···
┌───────────────────────────────────────┐
│                                       │
│              content                  │
│                                       │
├───────────────────────────────────────┤
│ model / status              duration  │
└───────────────────────────────────────┘
     in ○                         ○ out
```

Rules:

- default width: 320px;
- media nodes may be 360px;
- no giant empty node unless media ratio requires it;
- title sits in the card header, not floating 29px above the node;
- node header height: 36px;
- footer/status row: 32px;
- selected state uses `signal-cyan` only;
- node ports are 14px visual / at least 24px interactive hit area;
- connection labels are shown only on hover/selection or when semantically necessary.

### Node status

Use one compact status location in the footer:

- Ready
- Queued
- Running · 42%
- Waiting for provider
- Completed
- Failed · Retry
- Cancelled

Do not use separate floating job badges unless the node itself cannot display status.

## 10. Generator / Inspector

Do not use a floating generic modal for every edit.

Use a **contextual inspector** anchored to the selected node:

Desktop:

- width 380–420px;
- right overlay panel;
- may pin open;
- does not permanently shrink canvas unless pinned.

Information order:

1. Node title + media type + close/pin.
2. Prompt / main content.
3. Model selection.
4. Essential parameters (max 3–5 visible).
5. Advanced parameters collapsed.
6. Reference media.
7. Run button + estimated cost if known.
8. Latest result / task status.

Do not hide section titles after adding them. Information hierarchy is part of the product, not decoration.

Primary action text should say **Generate**, **Regenerate**, **Retry**, or **Cancel** — never generic `Submit`.

## 11. Top bar hierarchy

Permanent top-bar actions should fit within approximately 60% of a 1366px viewport without collisions.

Priority:

**Tier 1 — always visible**

- Workspace / canvas identity
- Undo / redo
- Run / production
- Tasks (with running count)
- Share

**Tier 2 — contextual**

- Storyboard switch
- Agent
- Context
- Settings

**Tier 3 — overflow/help**

- shortcuts
- tutorial
- diagnostics
- developer tools

Do not give every feature the same 38px square button and visual weight.

## 12. Bottom dock

Dock purpose: creation and canvas manipulation only.

Order:

`Add | Select/Hand | Layout | Assets | History`

Dimensions:

- height: 48px
- control: 36px
- primary Add control: 36px, paper surface / dark icon
- gap: 4px
- radius: 12px

No Help, Tutorial, Agent, Tasks or Settings in the dock.

## 13. Provider and model management

Provider setup and model management must share the same system as the canvas.

### Provider setup

The main user path must visually emphasize only:

1. Provider name
2. Base URL
3. API key
4. Test connection
5. Discover models

Advanced adapter/protocol fields stay inside **Advanced**.

Connection results use a structured state block rather than arbitrary toast text:

- Connected
- Authentication failed
- Endpoint not compatible
- Models found: N
- Video protocol needs configuration

### Models page

Keep the provider filter sidebar on desktop, but unify colors, typography, button geometry and empty states with the canvas.

Avoid dense six-column rows when the information is not required to scan.

Recommended default row:

```text
[icon] Model name
       provider · model id

Type      Adapter status      Enabled       ···
```

Advanced route/config fields belong in the expanded detail view.

## 14. Storyboard view

Storyboard is not a spreadsheet.

Use shot cards/rows with dominant media preview and concise metadata.

Desktop row order:

`Shot | Visual | Prompt/Notes | Audio | Status/Actions`

At widths below 820px, switch to stacked shot cards. Do not keep a 900px minimum-width board as the primary mobile solution.

## 15. Interaction states

Every interactive control must implement:

- default
- hover (pointer devices)
- active
- focus-visible
- disabled
- loading if relevant

Focus ring:

`0 0 0 2px ink-950, 0 0 0 4px rgba(88,207,224,.65)`

Never remove focus outlines without replacing them.

Touch target:

- desktop minimum interactive hit area: 32×32px
- mobile minimum: 44×44px

## 16. Motion

Use motion only for:

- opening/closing contextual panels: 140–180ms;
- menu/popover: 100–140ms;
- node selection response: 120–150ms;
- Signal Path generation pulse.

Avoid decorative hover translation on every card/button.

Standard easing:

`cubic-bezier(.2,.8,.2,1)`

Respect `prefers-reduced-motion: reduce`.

## 17. Iconography

Use one SVG icon family/style across the product.

- 1.7–1.8px stroke at 18–20px size;
- rounded line caps;
- no emoji as production controls;
- no mixed text glyphs such as `▦`, `⌕`, `⚙`, `＋` when an SVG icon exists;
- icon-only controls require `aria-label` and tooltip on desktop.

## 18. Writing / UI copy

Use user-language, not implementation-language.

Prefer:

- `Provider` → Chinese UI: `接口供应商`
- `Discover models` → `拉取模型`
- `Save changes` → `保存更改`
- `Retry` → `重试`
- `Cancel generation` → `取消生成`

Errors must tell the user what happened and what action can fix it.

Bad:

`Request failed`

Good:

`API Key 验证失败。检查密钥后重新测试连接。`

## 19. Accessibility

Required baseline:

- WCAG AA text contrast for normal content;
- keyboard access to all menus, dialogs and canvas controls;
- visible `:focus-visible` states;
- correct dialog semantics and focus trap;
- Escape closes popovers/dialogs when safe;
- icon-only buttons have accessible names;
- status changes use an appropriate `aria-live` region without excessive announcements;
- color is never the only way to distinguish success/error/type.

## 20. CSS architecture — mandatory implementation rule

Do **not** create `canvas-ui-v4.css` as another override file.

Target structure:

```text
styles/
  tokens.css
  base.css
  shell.css
  canvas.css
  nodes.css
  inspector.css
  overlays.css
  providers.css
  models.css
  storyboard.css
  responsive.css
```

Rules:

- one canonical token namespace: `--ui-*`;
- no parallel `--cui-*`, `--v2-*`, `--lib-*` systems;
- use `!important` only for third-party/legacy containment during migration, then remove it;
- component selectors should remain shallow;
- visual state is class/data-attribute driven, not selector-specificity warfare;
- media queries live in component files or the single responsive layer, not repeated contradictory overrides.

## 21. Migration order

1. Create final tokens/base/shell.
2. Rebuild top bar and dock hierarchy.
3. Normalize node structure/states/ports.
4. Replace floating Generator styling with contextual Inspector styling.
5. Consolidate menus/drawers/modals.
6. Bring Provider and Models pages onto the same tokens/components.
7. Rebuild Storyboard responsive behavior.
8. Implement mobile review/control shell.
9. Remove old v1/v2/v3 visual override files from `index.html`.
10. Delete dead selectors and remaining `!important` overrides after screenshot regression testing.

## 22. Acceptance criteria

The redesign is complete only when:

- a user can tell what is selected, running, failed and connected without opening another panel;
- global chrome no longer visually competes with the canvas;
- top bar does not overflow at 1024px width;
- no production text is below 11px;
- mobile has a deliberate layout rather than horizontal desktop overflow;
- Canvas, Provider, Models and Storyboard look like one product;
- no new UI override stylesheet is layered on top of v1/v2/v3;
- the old `--cui-*`, `--v2-*`, `--lib-*` token families are eliminated from final production styles;
- focus-visible and reduced-motion behavior are present;
- visual regression screenshots exist for desktop, tablet and mobile.

---

**Final design principle:** quiet workspace, strong signal. The canvas carries the content; color and motion appear only when they explain workflow, state or action.