# Fuiet Infinite Canvas · UI Design System 2.3

Status: **Final visual and interaction source of truth**  
Design direction: **Media-first Canvas / Studio Slate**  
Scope: **Desktop-only web application. Supported viewport width: 1024px and above. Mobile UI is out of scope.**

This document replaces UI Design System 2.0/2.1/2.2 and the older `canvas-ui-v1.css`, `canvas-ui-v2.css`, `workspace-canvas-v3.css`, `ui-type-v2.css`, LibTV-copy styling and ad-hoc visual patches.

> **Result-first. Progress-visible. Infrastructure-hidden. Canvas owns the edges.**

## 1. Product identity

Fuiet Infinite Canvas is an AI multimedia creation canvas for text, image, video, audio, script, character and scene workflows.

The interface must feel like a calm professional post-production workspace rather than a SaaS dashboard or a technical node engine.

The user journey is:

`create → generate → progress → result → process / branch`

Technical infrastructure such as Task IDs, provider polling, HTTP states, API routes, retry counters and worker internals stays out of the normal creator UI.

## 2. Global surface model

The normal workspace contains only five UI layers:

1. **Workspace Capsule** — top-left context identity.
2. **Infinite Canvas** — owns the entire workspace surface.
3. **Node Composer / Context Toolbar** — appears only around the selected node.
4. **Asset + Canvas Status Area** — bottom-left.
5. **Primary Dock** — bottom-center.

Do not create a permanent left toolbar, permanent right Inspector or heavy full-width top navigation.

## 3. Canvas owns the edges

Default workspace must keep both left and right canvas edges free.

Forbidden as permanent chrome:

- left creation toolbar;
- right Inspector;
- permanent Asset sidebar;
- permanent Task details;
- full-height navigation rails.

Panels are on-demand overlays and must not resize or shift node coordinates when opened.

## 4. Workspace Capsule

Top-left floating capsule contains only:

- Fuiet identity;
- workspace name;
- canvas switcher;
- Workflow / Storyboard switch.

Target height: **34–36px**.

Global Undo / Redo / Run / Share may live in a small separate top-right action capsule. Secondary features must not compete with Canvas.

## 5. Universal Four-State Node Model

Every node type uses the same state model.

### Content state

- `empty`
- `result`

### Interaction state

- `idle`
- `selected`

This creates four base states:

| State | Node | Composer | Context Toolbar |
| --- | --- | --- | --- |
| Empty + Idle | creation guidance | hidden | hidden |
| Empty + Selected | creation guidance | visible | hidden |
| Result + Idle | result itself | hidden | hidden |
| Result + Selected | result itself | hidden by default | visible |

This applies to text, image, video, audio, script, character, scene, output and future nodes.

Task state is an overlay dimension only:

- queued
- running
- completed
- failed
- cancelled

Task state must not create a fifth/sixth node layout.

## 6. Empty nodes

Empty + Idle explains what the node can create. Keep it simple: icon, node identity and a small list of suggested actions.

Do not show Provider, Task ID, API information or advanced parameters in the idle state.

Empty + Selected opens the **Node Composer** beneath or near the node.

## 7. Node Composer

Composer is the main generation surface.

Unified order:

1. contextual inputs / references;
2. Prompt or main content;
3. model;
4. 3–5 essential parameters;
5. Generate.

Examples:

- Image: reference / prompt / model / ratio / resolution / count.
- Video: frame/reference / prompt / model / ratio / duration / resolution.
- Text: prompt / model / length / language.
- Audio: prompt/lyrics / model / voice / style / duration.

Composer is not an API settings panel.

## 8. Result is the node

Once a node has a usable result, the result becomes the visual node.

Media nodes should stop looking like framed admin cards.

Image: the image itself.  
Video: the player itself.  
Audio: the waveform itself.  
Text/script: the readable content itself.

Avoid permanent result footers containing model ID, Task ID, provider, completed state and implementation metadata.

A visible result is already the primary success feedback.

## 9. Result + Selected = Context Toolbar

Selecting a result does not reopen Composer automatically.

Instead show a contextual object toolbar near the node.

Examples:

**Image** — enhance, outpaint, multi-angle, lighting, edit, image-to-video, more.  
**Video** — enhance, remake segment, frame analysis, subtitle removal, audio separation, first/last frame, more.  
**Text** — rewrite, expand, shorten, translate, text-to-image, text-to-video, more.  
**Audio** — denoise, separate, extend, speed, transcribe, voice, more.

First-level actions: **6–8 maximum**. Remaining actions go into `…`.

Composer and Context Toolbar must not be simultaneously visible by default.

## 10. Smart + Port

Node ports support both connecting and fast branching.

Idle: small neutral circle.  
Hover/selected: becomes a visible `+` affordance.

- click → quick-create next node;
- drag → connect traditionally.

Port visual size: **14px**.  
Pointer hit area: **at least 24px**.

## 11. Progress-visible generation

Generation progress belongs to the node.

If the provider returns a real percentage, display it directly:

`正在生成 · 42%`

If the provider does not return real progress, never fabricate percentages. Use honest stages such as:

- 排队中
- 正在生成
- 正在处理结果
- 即将完成

Existing results stay visible while a secondary operation runs.

## 12. Infrastructure hidden

Normal creator UI does not expose:

- Task ID;
- HTTP status;
- polling endpoint;
- provider response payload;
- API route;
- retry count;
- worker/queue internals;
- database state.

Errors are rewritten into creator-language with a useful next action.

## 13. Signal Spine

Connections remain quiet by default.

Default edge: low-contrast gray, ~1px.  
Selected upstream/downstream route: cool blue.  
Running route: amber signal pulse.  
Failed segment: restrained danger red.

Do not turn the whole canvas into glowing wires.

## 14. Asset Manager

There is no permanent Asset sidebar.

Bottom-left contains an **资产管理** entry together with canvas helpers such as minimap and zoom.

Clicking Asset Manager opens a **272px left overlay drawer**. It overlays the Canvas and never changes Canvas width or node positions.

The final Asset Manager information architecture has two tabs:

- **画布** — current canvas nodes; click to locate/focus.
- **资产** — project-level reusable media/assets; drag to canvas.

## 15. Primary Dock

Bottom-center Dock is the global creation/manipulation surface.

Target design:

`Add | Select/Hand | Connect | Layout | History`

Height: **46px**.  
Control size: **34px**.  
Do not place Assets, Tasks, Agent, Settings, Tutorial or Help in the permanent Dock.

During migration, existing actions may remain wired until their replacement interaction is implemented, but visual duplication is not allowed.

## 16. Studio Slate tokens

Core palette:

```text
Canvas        #121313
Base          #161817
Surface 1     #1B1D1C
Surface 2     #222423
Surface 3     #292C2A
Line          #303330
Line Strong   #414541
Text 1        #ECE9E2
Text 2        #B7B6B0
Text 3        #858984
Selected      #8198D9
Running       #D6A04D
Success       #72B58B
Danger        #D36F6A
```

Color explains state or media identity. It is not decorative chrome.

## 17. Typography

Brand/workspace identity:

`Space Grotesk`, then UI fallback.

UI/body:

`Inter Variable`, `Inter`, `PingFang SC`, `Microsoft YaHei`, system UI.

Technical strings only when necessary:

`IBM Plex Mono`, `SFMono-Regular`, `Consolas`, monospace.

Type scale:

| Role | Size |
| --- | ---: |
| Page title | 20px |
| Workspace title | 16px |
| Major section | 15px |
| Node title | 13px |
| Body | 13px |
| Control | 13px |
| Supporting text | 12px |
| Metadata | 11–12px |

No production UI text below **11px**.

Weights should primarily use 400 / 500 / 600 / 650.

## 18. Geometry

```text
Workspace Capsule   34–36px
Control             32px
Small control       28px
Bottom Dock         46px
Dock button         34px
Structural node     320px default
Composer            420–660px
Asset Drawer        272px
Port                 14px visual / >=24px hit area
```

Radii:

- compact: 6px;
- buttons/fields: 8px;
- nodes: 8–10px;
- Composer / toolbar: 12px;
- large overlays: 14px.

Avoid consumer-style giant rounding and excessive shadows.

## 19. Canvas surface

Background: `#121313`.

Dot grid: 20–24px spacing at approximately 4–6% contrast.

Avoid decorative gradients, giant glows and colored canvas lighting.

## 20. Desktop only

Design targets:

- 1024
- 1280
- 1366
- 1440
- 1920

Primary design reference: **1440 × 900**.

Do not spend implementation time on phone navigation, touch-first controls or mobile canvas layouts.

## 21. CSS architecture

Visual code converges to:

```text
styles/
  tokens.css
  base.css
  workspace.css
  canvas.css
  nodes.css
  composer.css
  context-toolbar.css
  connections.css
  asset-manager.css
  overlays.css
  providers.css
  models.css
  storyboard.css
  desktop.css
```

One token namespace only: `--ui-*`.

Do not create `canvas-ui-v4.css`, `canvas-ui-v5.css` or another legacy override generation.

Eliminate `--cui-*`, `--v2-*`, `--lib-*` and unnecessary `!important` rules as migration proceeds.

`styles.css` may temporarily remain as a functional scaffold while classes are migrated, but it must shrink over time rather than receive new visual features.

## 22. Implementation sequence

1. Tokens + base typography.
2. Workspace Capsule + full-bleed Canvas.
3. Bottom Dock + bottom-left Asset entry.
4. Four-state node visual system + Smart Ports.
5. Composer + Context Toolbar separation.
6. Honest generation progress in-node.
7. Asset Manager `画布 / 资产` tabs and node focusing.
8. Result-first media node cleanup.
9. Provider / Models / Storyboard visual migration.
10. Remove remaining legacy styling from `styles.css`.

## 23. Acceptance criteria

UI 2.3 is complete only when:

- no permanent left/right side toolbar steals Canvas width;
- all node types follow the universal four-state model;
- generated media is visually the node itself;
- Composer is shown for creation/editing conditions, Context Toolbar for result actions;
- progress is visible on generating nodes without fake percentages;
- creator UI does not expose infrastructure details;
- Asset Manager opens as an on-demand overlay;
- Canvas, Provider, Models and Storyboard use one token/type system;
- no production text is below 11px;
- old v1/v2/v3 visual styles are no longer loaded or maintained;
- the final production visual layer uses the `styles/` architecture above.

---

**Final principle:** the user should spend attention on the work, not on the software around it.
