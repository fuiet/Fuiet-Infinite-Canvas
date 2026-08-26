# Fuiet Infinite Canvas · UI Design System 2.0

Status: **Final visual and interaction source of truth**  
Scope: **Desktop-only web application. Supported viewport width: 1024px and above. Mobile UI is out of scope.**

This document replaces all earlier visual directions, including the v1/v2/v3 canvas styles, LibTV-inspired styling, compact-type patches, and the previous `FINAL_UI_DESIGN_SYSTEM.md` direction. New UI work must follow this system instead of adding another override layer.

---

## 1. Product identity

Fuiet Infinite Canvas is a **professional AI media production workspace** for routing text, image, audio and video through generation workflows.

The product should not look like:

- a generic SaaS admin dashboard;
- a neon “AI tool” with glowing cyan everywhere;
- a card-heavy consumer application;
- a direct visual copy of LibTV, ComfyUI, Figma, Notion or Adobe;
- a collection of unrelated panels accumulated over time.

The product should feel like a calm **post-production control surface**: precise, dark, dense, legible, tactile and highly state-aware.

### Design sentence

**Quiet studio. Clear signal. Fast decisions.**

The canvas is the stage. Media is the content. UI chrome exists only to explain state or enable an action.

---

## 2. Visual direction: Studio Slate

The final visual direction is called **Studio Slate**.

It is inspired by professional editing rooms, patch bays, broadcast tally lights, film slates and timeline tools — without visually cloning any one product.

### Core character

- matte graphite surfaces rather than pure black;
- warm off-white text rather than stark white;
- restrained cool-blue selection rather than neon cyan;
- amber as the distinctive “live / generating / attention” signal;
- muted media-type colors used only as identity marks;
- shallow depth, crisp dividers and minimal glow;
- small radii and compact geometry appropriate for a professional desktop tool.

### Explicitly avoid

- decorative gradients;
- glassmorphism as a general surface treatment;
- oversized 16–24px corner radii;
- big colored cards;
- random accent colors on hover;
- glowing borders on every selected element;
- all-caps UI labels;
- giant empty-state illustrations;
- drop shadows on every component.

---

## 3. Signature interaction: Signal Spine

Fuiet needs one memorable interaction that belongs to the product.

That interaction is the **Signal Spine**.

When a node is selected, the system reveals its first-degree upstream and downstream route as a precise signal trace.

### Selected state

- selected node receives a 1px cool-blue border and a very subtle local halo;
- directly connected edges become brighter;
- directly connected nodes lift one surface level;
- unrelated nodes remain readable and unchanged enough to preserve spatial context.

### Running state

A running workflow uses an **amber tally signal**:

- node status dot/tally becomes amber;
- relevant edge receives a restrained travelling pulse;
- node footer shows generation state and progress;
- no flashing or continuous glowing.

### Completed state

- success resolves once with a short green state transition;
- the interface then returns to its neutral state;
- completed nodes do not stay bright green.

### Failed state

- node tally turns muted red;
- failed edge segment may show a short red section;
- failure copy explains the cause and the next action;
- never flash the entire node.

`prefers-reduced-motion: reduce` replaces travelling signal motion with static state styling.

---

## 4. Color system

Use one centralized token family. Do not invent arbitrary component grays.

### Core neutrals

| Token | Value | Use |
| --- | --- | --- |
| `--ui-bg-canvas` | `#121313` | infinite canvas / deepest workspace |
| `--ui-bg-base` | `#161817` | application shell |
| `--ui-surface-1` | `#1B1D1C` | nodes / primary panels |
| `--ui-surface-2` | `#222423` | raised controls / hover surfaces |
| `--ui-surface-3` | `#292C2A` | active raised surfaces |
| `--ui-line` | `#303330` | default divider/border |
| `--ui-line-strong` | `#414541` | hover / strong boundary |
| `--ui-text-1` | `#ECE9E2` | primary text |
| `--ui-text-2` | `#B7B6B0` | secondary text |
| `--ui-text-3` | `#858984` | metadata / inactive text |

### State colors

| Token | Value | Meaning |
| --- | --- | --- |
| `--ui-focus` | `#8198D9` | selection / keyboard focus / active route |
| `--ui-live` | `#D6A04D` | generating / running / attention |
| `--ui-success` | `#72B58B` | success / connected |
| `--ui-danger` | `#D36F6A` | error / destructive |
| `--ui-warning` | `#C88C55` | warning / incomplete configuration |

### Media identity colors

Media colors are identity marks only. Never fill an entire node with them.

| Type | Value |
| --- | --- |
| Text / Script | `#A9AFB8` |
| Image | `#AD99C4` |
| Video | `#C8876C` |
| Audio | `#82A78E` |

### Color rules

- cool blue means **selected / focused / linked**, not “brand decoration”;
- amber means **live / generating / needs attention**;
- green means **successful state**, not primary CTA;
- red means **failure/destructive**, never routine emphasis;
- media colors appear in 2–6px marks, icons, tiny badges or timeline strips;
- large surfaces stay graphite-neutral;
- avoid pure black `#000` and pure white `#fff` except optical corrections.

---

## 5. Typography

Typography must establish hierarchy without making the desktop UI feel oversized.

### Font roles

**Product / workspace identity**  
`Space Grotesk`, fallback `Inter`, system sans.

Use only for:

- Fuiet product wordmark;
- workspace name;
- major page/modal title;
- important empty-state headline.

**Primary UI**  
`Inter Variable`, `PingFang SC`, `Microsoft YaHei`, `Segoe UI`, system sans.

Use for:

- buttons;
- labels;
- menus;
- body copy;
- node titles;
- form controls.

**Technical data**  
`IBM Plex Mono`, `SFMono-Regular`, `Consolas`, monospace.

Use for:

- model IDs;
- task IDs;
- API routes;
- dimensions / FPS / timecode when alignment matters;
- raw provider status / diagnostics.

### Type scale

| Role | Size | Line height | Weight |
| --- | ---: | ---: | ---: |
| Page / modal title | 20px | 28px | 650 |
| Workspace title | 16px | 22px | 650 |
| Large section title | 15px | 21px | 600 |
| Section / node title | 13px | 18px | 600 |
| UI body | 13px | 19px | 450–500 |
| Button / control | 13px | 18px | 500–600 |
| Metadata | 12px | 17px | 450–500 |
| Micro data | 11px | 15px | 500 |
| Technical mono | 11–12px | 16px | 500 |

### Typography rules

- no production UI text below **11px**;
- do not globally set body to 15px;
- do not globally force every form control to 14px;
- do not make model name and model metadata the same size/weight;
- avoid font weights 750/800 in routine UI;
- preferred weights are 450, 500, 600 and 650;
- use line-height appropriate to the role rather than global `1.55` everywhere;
- do not use letter spacing on Chinese body text;
- technical identifiers use mono only when the identifier itself matters.

---

## 6. Spacing and density

Base unit: **4px**.

Approved spacing scale:

`4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48`

### Density target

Fuiet is a desktop production tool. Default density should be **compact-comfortable**, not spacious SaaS density.

Typical vertical rhythm:

- control-to-control: 8px;
- label-to-field: 6–8px;
- field group gap: 12px;
- section gap: 20px;
- panel padding: 12–16px;
- large modal padding: 20px.

Avoid one-off 7/9/13/17px spacing unless required for optical alignment.

---

## 7. Geometry

### Radius

| Component | Radius |
| --- | ---: |
| Small chip / compact icon button | 6px |
| Input / button | 7px |
| Node | 9px |
| Menu / popover | 10px |
| Dock | 11px |
| Inspector / modal | 12px |

Do not use 16–20px rounding as a default.

### Borders

- standard component border: 1px `--ui-line`;
- hover border: `--ui-line-strong`;
- selected border: 1px `--ui-focus` at 80–90% opacity;
- avoid nested visible borders on every internal block;
- use background level changes before adding another border.

### Shadows

Use only for floating layers.

- node resting shadow: very subtle or none;
- menu/popover: medium shadow;
- modal/Inspector: stronger shadow;
- do not add shadows to static cards in page layouts.

---

## 8. Desktop layout system

### Supported viewports

Primary design widths:

- 1024px compact desktop;
- 1280px;
- 1366px;
- 1440px;
- 1920px.

Below 1024px is not part of the visual acceptance scope.

### Global shell

```text
┌ Workspace / Canvas / View ───────────── Run · Tasks · Share · More ┐
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│                          Infinite Canvas                            │
│                                                                     │
│                                                ┌ Inspector ┐        │
│                                                │ contextual│        │
│                                                └───────────┘        │
│                                                                     │
├ Zoom / Minimap ─────────── Add · Select · Layout · Assets · History ┤
└─────────────────────────────────────────────────────────────────────┘
```

### Layer priority

1. Canvas/content.
2. Selected node / contextual editing.
3. Local toolbar / Inspector.
4. Global top bar / bottom dock.
5. Menus / popovers.
6. Modals / blocking confirmations.

Global chrome must never visually dominate the canvas.

---

## 9. Top bar

Height: **46px**.

The bar is not a row of equally important square buttons.

### Left group

- workspace name;
- canvas selector;
- Workflow / Storyboard segmented switch.

### Right group

Always visible:

- Undo / Redo as one grouped control;
- Production / Run;
- Tasks with running count;
- Share;
- More.

Secondary actions move under More or appear contextually:

- Agent;
- Context;
- Settings;
- Diagnostics;
- Help / Shortcuts.

### Sizing

- top icon control: 32×32px;
- text action height: 32px;
- segmented control: 32px;
- gap inside groups: 4px;
- gap between groups: 8–12px.

At 1024px, collapse secondary labels before hiding primary actions.

---

## 10. Bottom dock

The dock exists only for **canvas creation and manipulation**.

Order:

`Add | Select/Hand | Auto layout | Assets | History`

### Dimensions

- overall height: 46px;
- button: 34×34px;
- gap: 4px;
- padding: 6px;
- radius: 11px.

### Visual hierarchy

- Add is the only high-emphasis item;
- Add uses warm off-white surface with dark icon;
- other controls are graphite ghost/soft buttons;
- selected mode uses the cool-blue focus state;
- no Help, Tutorial, Agent, Task or Settings controls in the dock.

Zoom/minimap remain a small separate utility group in the lower-left corner.

---

## 11. Canvas

### Background

- `--ui-bg-canvas`;
- subtle dot grid at 20px or 24px spacing;
- dot contrast no more than ~5%;
- no radial glow;
- no permanent center watermark/hint after content exists.

### Empty canvas

One focused empty state only:

**开始一个工作流**  
添加提示词、拖入素材，或连接已有资产。

Primary quick starts:

`文本` · `图片` · `视频`

Other node types live in Add.

### Canvas feedback

- selection rectangle uses blue outline with 4–6% fill;
- snap guides use restrained blue/gray;
- drag target is indicated locally;
- do not tint the entire canvas during drag operations.

---

## 12. Node system

Nodes are the core visual object of the product.

### Standard anatomy

```text
┌ type mark  Node title                         ··· ┐
│                                                    │
│                   content / media                  │
│                                                    │
├ model · state                       duration/meta ─┤
└─ ○ in                                          out ○┘
```

### Sizes

- standard node width: 320px;
- media node width: 360px;
- node header: 34px;
- node footer: 30px;
- standard minimum content height: 120px;
- media content follows media ratio where useful.

### Node title

- lives inside the card header;
- never floats above the node;
- 13px / 600;
- truncates with ellipsis;
- type identity is a tiny mark/icon, not a large colored badge.

### Node states

**Default**  
Neutral border, no glow.

**Hover**  
Slightly stronger border only.

**Selected**  
Cool-blue border + subtle local halo.

**Running**  
Amber tally + status/progress in footer.

**Completed**  
Short success transition, then neutral.

**Failed**  
Muted red tally + `失败 · 重试`.

**Disabled / unavailable**  
Reduced contrast but text remains readable.

### Ports

- visual size: 12–14px;
- pointer hit area: at least 24px;
- default neutral gray;
- valid target becomes blue;
- actively transmitting route becomes amber only while running.

---

## 13. Node content by type

### Text / Script

- neutral editor surface;
- body text 13px;
- line-height 1.55–1.6 only for long-form editing;
- no tiny 9px table typography;
- script tables minimum 11px metadata / 12–13px content.

### Image

- image dominates the node;
- no permanent large empty gray block after image exists;
- caption/metadata belongs in footer or overlay only when needed.

### Video

- dominant preview;
- centered play affordance;
- duration/timecode in compact mono metadata;
- generation state in footer, not floating badge.

### Audio

- restrained waveform;
- waveform does not use bright green by default;
- current playing position can use amber;
- duration in mono.

---

## 14. Contextual Inspector

Replace the generic floating generation panel with one consistent **Inspector**.

### Behavior

- opens on the right when editing a selected node;
- overlays the canvas by default;
- can be pinned if the workflow needs persistent editing;
- width: 396px default;
- allowed range: 380–420px.

### Header

- media-type mark;
- node title;
- task state if active;
- pin;
- close.

### Information order

1. Prompt / primary content.
2. Model.
3. Essential parameters.
4. Reference media.
5. Advanced settings collapsed.
6. Generate action.
7. Cost estimate if available.
8. Latest result / task status.

### Essential parameters

No more than 3–5 controls visible by default.

Examples:

- aspect ratio;
- duration;
- resolution;
- seed;
- output count.

Everything else belongs under **高级设置**.

### Generate action

Use exact verbs:

- 生成;
- 重新生成;
- 重试;
- 取消生成.

Primary generate button uses warm off-white fill with dark text/icon. During execution it changes to the amber live state.

---

## 15. Forms and fields

### Heights

- compact field: 30px;
- default field: 32px;
- large/search field: 36px;
- textarea varies by content.

### Typography

- input value: 13px;
- label: 12px;
- help/meta: 11–12px;
- technical route or ID: mono 11–12px.

### Labels

Labels always remain visible. Placeholder text is an example, not a replacement for labels.

### Focus

Focus ring:

`0 0 0 1px var(--ui-bg-canvas), 0 0 0 3px rgba(129,152,217,.58)`

### Error

- field border becomes muted red;
- one concise error message appears below;
- error text states what failed and what to do next.

---

## 16. Buttons

### Button hierarchy

**Primary**  
Warm off-white surface, dark text. Use for the one most important action in a local context.

**Secondary**  
Graphite surface with border.

**Ghost**  
Transparent until hover.

**Danger**  
Neutral by default; red only on hover/confirmation unless destructive intent must be obvious.

### Sizes

| Size | Height | Horizontal padding |
| --- | ---: | ---: |
| Compact | 28px | 8px |
| Default | 32px | 10–12px |
| Emphasis | 36px | 14px |

Do not make every icon button 38–40px.

---

## 17. Menus, popovers and dialogs

### Menu

- radius: 10px;
- padding: 6px;
- item height: 32px;
- menu text: 13px;
- secondary shortcut/meta: 11px;
- selected row uses surface change, not bright fill.

### Popover

Use for short contextual controls only.

### Modal

Use only when the user must stop and complete a task before returning.

Examples:

- provider settings;
- delete confirmation;
- project-level configuration.

Do not turn routine node editing into a modal.

---

## 18. Provider management

Provider setup must visually communicate the product promise: **Base URL + API Key first, protocol complexity later.**

### Primary setup path

1. 接口供应商名称.
2. Base URL.
3. API Key.
4. 测试连接.
5. 拉取模型.

### Advanced section

Collapsed by default:

- auth-header customization;
- video protocol configuration;
- route overrides;
- polling behavior;
- adapter debugging;
- custom headers.

### Connection state block

Use one consistent state component:

**连接成功**  
已识别接口，发现 18 个模型。

**API Key 验证失败**  
检查密钥后重新测试连接。

**接口不兼容**  
无法识别模型列表接口。可在高级设置中配置适配方式。

**视频协议需要配置**  
文本/图片接口可用，但视频任务协议无法自动识别。

Do not communicate critical connection state only through disappearing toast messages.

---

## 19. Models page

The Models page must feel like the same product as Canvas.

### Page shell

- same graphite tokens;
- same typography;
- same button sizes;
- same focus/hover behavior;
- same icon family.

### Sidebar

Keep provider filtering sidebar on desktop.

Width: 200–220px.

### Model list hierarchy

Recommended row:

```text
[media mark]  Seedance 2.0
              Volcengine · seedance-2-0-250225

              视频    Adapter ready    已启用             ···
```

Typography:

- model name: 13–14px / 600;
- provider + model ID: 11–12px;
- model ID uses mono;
- state/type: 12px;
- actions: 12–13px.

Do not set model name and model metadata both to 15px.

### Expanded details

Advanced configuration appears only after expansion:

- request route;
- polling route;
- adapter mode;
- raw headers;
- JSON parameters.

---

## 20. Storyboard

Storyboard is a visual production view, not a spreadsheet.

### Row structure

`Shot | Visual | Prompt / Notes | Audio | Status / Actions`

### Priority

The media preview is visually dominant.

### Typography

- shot number: 13–14px / 600;
- shot label/meta: 11–12px;
- prompt: 12–13px;
- technical media details: mono 11px;
- action labels: 12px.

### Compact desktop behavior

At 1024–1279px:

- reduce nonessential columns;
- allow controlled workspace overflow where necessary;
- do not create mobile stacked cards;
- preserve desktop production interaction.

---

## 21. Agent panel

Agent must not visually behave like a separate chatbot product pasted onto the canvas.

### Panel

- same Inspector surface language;
- width: 380–400px;
- same header/control geometry;
- no oversized chat bubbles;
- compact conversation density.

### Messages

- assistant messages use surface-1;
- user messages use a subtle surface-2 difference;
- no bright green chat bubbles;
- message body 13px;
- metadata 11px.

Agent action results should link directly to affected nodes/tasks where possible.

---

## 22. Status system

Status language must be consistent everywhere.

Canonical status labels:

- 就绪
- 排队中
- 正在生成
- 等待供应商
- 正在处理结果
- 已完成
- 失败
- 正在取消
- 已取消

Do not use different names for the same state in Node, Task panel and Provider flow.

Color is never the only status signal; pair color with text/icon.

---

## 23. Iconography

Use one SVG icon family across the application.

Rules:

- 18px default icon;
- 16px compact icon;
- 1.7–1.8px stroke;
- rounded caps and joins;
- no emoji as production controls;
- replace text glyphs such as `▦`, `⌕`, `⚙`, `＋` where an SVG exists;
- every icon-only control gets `aria-label` and desktop tooltip.

---

## 24. Motion

Motion communicates relationship or state, not decoration.

### Timings

- hover/color: 100–120ms;
- menu/popover: 120–140ms;
- Inspector: 150–180ms;
- node selection: 120–150ms;
- Signal Spine pulse: task-dependent restrained loop.

Easing:

`cubic-bezier(.2,.8,.2,1)`

### Do not use

- card lift on every hover;
- scale effects on routine buttons;
- bouncing icons;
- full-screen animated backgrounds;
- continuous glowing UI.

---

## 25. Copy and terminology

Use plain user-facing language.

Preferred terms:

- 接口供应商
- Base URL
- API Key
- 测试连接
- 拉取模型
- 保存更改
- 生成
- 重新生成
- 重试
- 取消生成
- 高级设置
- 任务
- 工作流
- 故事版
- 资产

Error copy must contain **cause + next action**.

Bad:

`Request failed`

Good:

`API Key 验证失败。检查密钥后重新测试连接。`

---

## 26. Accessibility

Required desktop baseline:

- WCAG AA text contrast;
- keyboard navigation for menus, dialogs and core canvas controls;
- visible `:focus-visible` states;
- correct dialog semantics and focus trap;
- Escape closes menus/popovers/dialogs when safe;
- icon-only buttons have accessible names;
- dynamic task status uses appropriate `aria-live` behavior;
- state/type never relies on color alone;
- do not remove browser focus outlines without a designed replacement.

---

## 27. CSS architecture

Do not create another overlay stylesheet such as `canvas-ui-v4.css`.

Target structure:

```text
styles/
  tokens.css
  fonts.css
  base.css
  shell.css
  controls.css
  canvas.css
  nodes.css
  inspector.css
  overlays.css
  providers.css
  models.css
  storyboard.css
  agent.css
  desktop.css
```

### Mandatory rules

- one token namespace: `--ui-*`;
- one typography source of truth;
- no parallel `--cui-*`, `--v2-*`, `--lib-*` systems;
- no global `body{font-size:15px!important}` patch;
- no global form-control size patch;
- `!important` only for temporary legacy containment during migration;
- component selectors remain shallow;
- states use classes/data attributes;
- supported desktop responsive rules live in `desktop.css` or the component file;
- visual behavior is not implemented through specificity wars.

---

## 28. Implementation tokens

Minimum token set:

```css
:root {
  --ui-bg-canvas: #121313;
  --ui-bg-base: #161817;
  --ui-surface-1: #1B1D1C;
  --ui-surface-2: #222423;
  --ui-surface-3: #292C2A;
  --ui-line: #303330;
  --ui-line-strong: #414541;

  --ui-text-1: #ECE9E2;
  --ui-text-2: #B7B6B0;
  --ui-text-3: #858984;

  --ui-focus: #8198D9;
  --ui-live: #D6A04D;
  --ui-success: #72B58B;
  --ui-danger: #D36F6A;
  --ui-warning: #C88C55;

  --ui-media-text: #A9AFB8;
  --ui-media-image: #AD99C4;
  --ui-media-video: #C8876C;
  --ui-media-audio: #82A78E;

  --ui-font: "Inter Variable", "PingFang SC", "Microsoft YaHei", "Segoe UI", system-ui, sans-serif;
  --ui-font-display: "Space Grotesk", "Inter Variable", system-ui, sans-serif;
  --ui-font-mono: "IBM Plex Mono", "SFMono-Regular", Consolas, monospace;

  --ui-radius-control: 7px;
  --ui-radius-node: 9px;
  --ui-radius-popover: 10px;
  --ui-radius-panel: 12px;

  --ui-topbar-h: 46px;
  --ui-control-h: 32px;
  --ui-dock-h: 46px;
  --ui-inspector-w: 396px;
}
```

---

## 29. Migration order

1. Add final font loading and token files.
2. Remove the global typography patch behavior from `ui-type-v2.css`.
3. Build final base controls and focus states.
4. Rebuild Top Bar.
5. Rebuild Bottom Dock.
6. Normalize Node anatomy and states.
7. Implement Signal Spine / amber live state.
8. Replace Generator styling with Inspector.
9. Consolidate menus/popovers/modals.
10. Move Provider UI to the final system.
11. Move Models page to the final system.
12. Move Storyboard to the final system.
13. Move Agent panel to the final system.
14. Remove v1/v2/v3 visual styles from `index.html`.
15. Delete dead selectors and remaining visual `!important` patches.
16. Run screenshot regression at 1024, 1366, 1440 and 1920 widths.

---

## 30. Acceptance criteria

The redesign is complete only when all of the following are true:

- Canvas is visually dominant over global chrome.
- A user can identify selected, connected, running, successful and failed states without opening another panel.
- The primary workflow remains usable at 1024px width.
- No production UI text is below 11px.
- Body/UI controls are not globally oversized.
- Fonts are actually loaded or deliberately fall back; typography is not merely declared.
- Model name, model metadata and technical IDs have distinct hierarchy.
- Canvas, Provider, Models, Storyboard and Agent look like one product.
- There is one token family and one typography system.
- No new override stylesheet is stacked on v1/v2/v3.
- `--cui-*`, `--v2-*`, `--lib-*` visual token families are removed from final production styles.
- Routine UI does not depend on `!important`.
- Keyboard focus and reduced-motion behavior are implemented.
- Desktop regression screenshots exist for 1024, 1366, 1440 and 1920.

---

## Final rule

**Fuiet should look like a professional production instrument, not an AI demo.**

Use color only when it communicates identity, state, selection or action. Keep surfaces quiet. Keep typography compact and legible. Let the canvas, the media and the workflow relationships carry the visual weight.