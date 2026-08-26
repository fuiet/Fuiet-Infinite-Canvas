# Fuiet Infinite Canvas · Final UI Design System

Status: **Final design direction / implementation source of truth**
Scope: **Desktop-only web application. Target viewport width: 1024px and above. Mobile UI is explicitly out of scope.**

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
6. Desktop efficiency and information density take priority over touch/mobile adaptation.

## 2. Chosen visual direction

### Direction exploration

**A. Floating cockpit**

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

Pros: predictable.  
Cons: permanently sacrifices canvas space and feels like a standard editor clone.

### Final choice

Use **Routing Studio**.

The interface stays mostly neutral. Color is not decoration; it is a live signal language for media types, selection, status, warnings and active workflow paths.

## 3. Signature element: Signal Path

The memorable Fuiet interaction is the **Signal Path**.

When a node is selected, reveal its upstream and downstream workflow as a restrained routing trace:

- selected node: stronger border + local halo;
- directly connected edges: brighter signal trace;
- first-degree connected nodes: slightly lifted surface;
- unrelated nodes: remain neutral and readable;
- running generation: a restrained moving pulse travels on the relevant edge;
- success: pulse resolves into the output node once, then returns to static;
- error: no flashing; use a short danger-colored segment at the failed node/edge.

This is the one place where motion may be visually distinctive. Other motion stays restrained.

`prefers-reduced-motion` replaces travelling pulses with static state styling.

## 4. Color system

Use six core tokens. Avoid arbitrary component-specific grays.

| Token | Hex | Purpose |
| --- | --- | --- |
| `ink-950` | `#111210` | canvas / deepest background |
| `ink-900` | `#181917` | primary surface |
| `ink-800` | `#232421` | raised / interactive surface |
| `paper-100` | `#F1EFE9` | primary text / high-emphasis controls |
| `ash-400` | `#8D8D86` | secondary text / inactive chrome |
| `signal-cyan` | `#58CFE0` | selection, links, active signal |

Semantic extensions are centralized:

- success: `#72C69A`
- warning: `#D6A85F`
- danger: `#D87878`
- image: `#B8A1E3`
- video: `#E89A72`
- audio: `#8FC7A7`
- text/script: `#AEB5BE`

Rules:

- `signal-cyan` is not used for decorative headings or random hover effects.
- media colors appear only in small identity cues, not full-card backgrounds.
- large panels stay neutral.
- use warm `paper-100` rather than pure white for primary text.

## 5. Typography

### Workspace identity / major titles

`Sora`, fallback `Inter`, system sans.

Use only for workspace identity, major page/modal titles and important empty-state headings.

### UI / body

`Inter`, `PingFang SC`, `Microsoft YaHei`, system sans.

Use for controls, labels, menus and body text.

### Technical identifiers

`IBM Plex Mono`, `SFMono-Regular`, `Consolas`, monospace.

Use for model IDs, task IDs, routes, technical status values and aligned timestamps.

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

Avoid one-off spacing values except for optical correction.

### Radius

- compact control: 7px
- button / field: 8px
- node: 10px
- menu / popover: 12px
- modal / inspector: 14px

Avoid blanket 16–20px rounding. This is a professional tool, not a consumer card UI.

### Borders

- default divider: `rgba(241,239,233,.08)`
- interactive border: `rgba(241,239,233,.12)`
- hover border: `rgba(241,239,233,.20)`
- selected border: signal color at 70–85% opacity

Only one visible border per component layer.

## 7. Desktop layout

### Primary target: 1280–1920px

Top bar: **48px**.

Left side contains context identity only:

- workspace name;
- canvas switcher;
- workflow/storyboard view switch.

Right side contains global actions only:

- undo/redo grouped;
- run/production;
- task status;
- share;
- overflow menu.

`Agent`, settings, context management and secondary tools move into overflow/contextual surfaces unless actively needed.

Bottom center dock contains only creation/navigation primitives:

- Add;
- Select / Hand mode;
- Auto layout;
- Assets;
- History.

Shortcut help and tutorial belong under Help/overflow.

### Compact desktop: 1024–1279px

- compress workspace/canvas labels;
- hide secondary text labels before hiding icons;
- Inspector stays an overlay instead of permanently shrinking the canvas;
- lower-priority global actions collapse into overflow;
- preserve the full canvas workflow model rather than changing interaction patterns.

### Unsupported design range: below 1024px

No dedicated phone/tablet experience will be designed. The project may remain technically loadable, but visual correctness and workflow usability below 1024px are not acceptance requirements.

Do not spend implementation time creating mobile navigation, touch-first controls, stacked mobile cards or mobile-specific canvas behavior.

## 8. Canvas

Canvas background:

- base `ink-950`;
- subtle dot field, 20–24px spacing;
- no decorative radial gradients;
- grid contrast under 6% opacity;
- no permanent center hint once content exists.

Empty state:

- one headline;
- one action sentence;
- three primary quick-start actions maximum: Text / Image / Video;
- secondary node types inside Add menu.

Preferred copy:

**开始一个工作流**  
添加提示词、拖入素材，或连接已有资产。

## 9. Nodes

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
- title stays inside the node header, never floating above the card;
- node header: 36px;
- footer/status row: 32px;
- selected state uses `signal-cyan`;
- ports: 14px visual, at least 24px pointer hit area;
- connection labels appear only when useful.

### Node status

One compact status location in the footer:

- 就绪
- 排队中
- 生成中 · 42%
- 等待供应商
- 已完成
- 失败 · 重试
- 已取消

Avoid separate floating job badges when the node can carry its own state.

## 10. Generator / Inspector

Replace the generic floating generation modal with a **contextual Inspector** anchored to selection.

Desktop rules:

- width: 380–420px;
- right overlay panel;
- may pin open;
- does not permanently shrink canvas unless pinned.

Information order:

1. Node title + media type + close/pin.
2. Prompt / main content.
3. Model selection.
4. Essential parameters (3–5 visible maximum).
5. Advanced parameters collapsed.
6. Reference media.
7. Generate action + estimated cost when available.
8. Latest result / task state.

Information hierarchy must remain visible; do not hide section labels after adding them.

Primary actions use specific verbs: `生成`, `重新生成`, `重试`, `取消生成`.

## 11. Top bar hierarchy

Permanent top-bar actions must fit without collision at **1024px**.

**Tier 1 — always visible**

- Workspace / canvas identity
- Undo / redo
- Run / production
- Tasks with running count
- Share

**Tier 2 — contextual / overflow when needed**

- Storyboard switch
- Agent
- Context
- Settings

**Tier 3 — overflow/help**

- shortcuts
- tutorial
- diagnostics
- developer tools

Do not give every feature identical square-button visual weight.

## 12. Bottom dock

Purpose: creation and canvas manipulation only.

Order:

`Add | Select/Hand | Layout | Assets | History`

Dimensions:

- height: 48px
- control: 36px
- Add: 36px, paper surface / dark icon
- gap: 4px
- radius: 12px

No Help, Tutorial, Agent, Tasks or Settings in the dock.

## 13. Provider and model management

Provider setup and model management share the same tokens, typography and control geometry as the canvas.

### Provider setup

Primary path emphasizes only:

1. 接口供应商名称
2. Base URL
3. API Key
4. 测试连接
5. 拉取模型

Advanced adapter/protocol fields stay inside **高级设置**.

Connection states are structured blocks:

- 连接成功
- API Key 验证失败
- 接口不兼容
- 已发现 N 个模型
- 视频协议需要配置

### Models page

Keep the provider filter sidebar on desktop.

Avoid dense six-column rows unless scanning genuinely requires them.

Recommended default row:

```text
[icon] Model name
       provider · model id

Type      Adapter status      Enabled       ···
```

Advanced routes/config live in expanded details.

## 14. Storyboard view

Storyboard is not a spreadsheet.

Use rows/cards with dominant media preview and concise metadata.

Desktop order:

`Shot | Visual | Prompt/Notes | Audio | Status/Actions`

At compact desktop widths, allow controlled horizontal workspace overflow or reduce secondary columns, but do not create a separate mobile stacked-card system.

## 15. Interaction states

Every interactive control implements:

- default
- hover
- active
- focus-visible
- disabled
- loading when relevant

Focus ring:

`0 0 0 2px ink-950, 0 0 0 4px rgba(88,207,224,.65)`

Never remove focus outlines without replacement.

Desktop minimum pointer target: **32×32px**.

## 16. Motion

Use motion only for:

- contextual panel open/close: 140–180ms;
- menu/popover: 100–140ms;
- node selection: 120–150ms;
- Signal Path generation pulse.

Avoid decorative translation on every hover.

Standard easing:

`cubic-bezier(.2,.8,.2,1)`

Respect `prefers-reduced-motion: reduce`.

## 17. Iconography

Use one SVG icon family/style across the product.

- 1.7–1.8px stroke at 18–20px;
- rounded line caps;
- no emoji as production controls;
- no mixed glyph controls such as `▦`, `⌕`, `⚙`, `＋` when an SVG exists;
- icon-only controls require `aria-label` and desktop tooltip.

## 18. Writing / UI copy

Use user-language, not implementation-language.

Prefer:

- `接口供应商`
- `拉取模型`
- `保存更改`
- `重试`
- `取消生成`

Errors explain both cause and next action.

Bad:

`Request failed`

Good:

`API Key 验证失败。检查密钥后重新测试连接。`

## 19. Accessibility

Required baseline:

- WCAG AA text contrast;
- keyboard access to menus, dialogs and canvas controls;
- visible `:focus-visible` states;
- correct dialog semantics and focus trap;
- Escape closes popovers/dialogs when safe;
- icon-only buttons have accessible names;
- status changes use appropriate `aria-live` behavior;
- color is never the only state/type distinction.

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
  desktop-responsive.css
```

Rules:

- one canonical token namespace: `--ui-*`;
- no parallel `--cui-*`, `--v2-*`, `--lib-*` systems;
- `!important` only for temporary legacy containment, then remove it;
- shallow component selectors;
- visual state driven by classes/data attributes, not specificity warfare;
- responsive rules cover supported desktop widths only.

## 21. Migration order

1. Create final tokens/base/shell.
2. Rebuild top bar and dock hierarchy.
3. Normalize node structure/states/ports.
4. Replace floating Generator styling with contextual Inspector styling.
5. Consolidate menus/drawers/modals.
6. Bring Provider and Models pages onto the same tokens/components.
7. Rebuild Storyboard desktop behavior.
8. Remove old v1/v2/v3 visual override files from `index.html`.
9. Delete dead selectors and remaining `!important` overrides after screenshot regression testing.

## 22. Acceptance criteria

The redesign is complete only when:

- a user can tell what is selected, running, failed and connected without opening another panel;
- global chrome no longer visually competes with the canvas;
- the complete primary workflow remains usable at 1024px viewport width;
- no production text is below 11px;
- Canvas, Provider, Models and Storyboard look like one product;
- no new UI override stylesheet is layered on top of v1/v2/v3;
- old `--cui-*`, `--v2-*`, `--lib-*` token families are eliminated from final production styles;
- focus-visible and reduced-motion behavior are present;
- visual regression screenshots exist at 1024px, 1366px, 1440px and 1920px desktop widths;
- **there is no mobile-specific UI implementation requirement.**

---

**Final design principle:** quiet workspace, strong signal. The canvas carries the content; color and motion appear only when they explain workflow, state or action.
