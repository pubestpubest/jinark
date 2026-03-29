# ✨ TalesRunner Craft Tracker — PRD

**Product Requirements Document**
v1.2 — March 2026

| | |
|---|---|
| **Project** | TalesRunner Craft Tracker — Web App |
| **Author** | Pubest |
| **Target** | Claude Code implementation |
| **Stack** | Vanilla HTML / CSS / JavaScript · LocalStorage |
| **Status** | Ready for Development |
| **Data Reference** | See `data.md` for full item/recipe/drop data |

---

## 📌 1. Overview

TalesRunner Craft Tracker is a single-page web application designed to help TalesRunner players plan and track the crafting of complex items. The app visualizes nested recipes across multiple layers, supports alternative (branching) crafting routes, and persists progress locally between sessions.

The core interaction model is a **hybrid input system**: materials that are simply bought or obtained as a fixed unit use a quick **checkbox**, while farmable/drop-based materials use a **numeric inventory counter**. This keeps the UI fast for simple cases and detailed for complex farming.

The initial release tracks the **จินอาร์ค** item series. Full item data, drop tables, and board probabilities are documented in `data.md`.

---

## 🎯 2. Goals & Non-Goals

### Goals

- Track crafting progress for a single master item with multi-layer nested sub-recipes
- Support alternative (branching) recipe routes per node
- Hybrid input: **checkbox** for fixed-count items, **counter** for farmable items
- Display item images alongside each node in the recipe tree
- Scale all required quantities by a craft multiplier (e.g. craft ×3)
- Show overall completion percentage and per-material mini progress bars
- Persist all state (progress, recipe, quantity, alt choice) in localStorage
- Load custom recipe via JSON editor in-app

### Non-Goals

- No backend or cloud sync — localStorage only
- No user accounts or multi-device support
- No market price lookup or economy tracking
- No probability/expected-value calculator (data documented in `data.md` for reference only)
- No multiple simultaneous master items (one recipe loaded at a time)

---

## 👤 3. User Stories

| Feature | As a user I want to… | Input Type | Notes |
|---|---|---|---|
| Track overall progress | See a single % bar showing how close I am to completing the master item | Auto-calculated | Based on leaf-node completion only |
| Scale recipe | Plan for crafting 3× the master item at once | Quantity stepper (+/−) | Multiplies all `need` values in real time |
| Checkbox item | Mark "buy from shop" materials as done in one click | Checkbox | Binary done/not done, no partial state |
| Counter item | Track 47 out of 100 monster drops collected | Number input + ± buttons | Persists partial progress across sessions |
| See item image | Recognize materials visually by their in-game icon | Image per node | Uses placeholder until real images are added |
| Expand sub-recipe | See what ingredients make up a crafted component | Click to expand node | Collapsible tree; closed by default |
| Switch alt recipe | Choose between two crafting routes for a node | Tab switcher on node | Persists selected alt per node |
| Load custom recipe | Paste my own item's JSON to start tracking | JSON editor modal | Replaces default sample recipe |
| Persist progress | Come back tomorrow and see my saved counts | Auto-save on input | All state in localStorage |
| Reset progress | Start over on a fresh craft run | Reset button with confirm | Clears progress but keeps recipe |

---

## 🗂 4. Data Model

The entire recipe is stored as a single nested JSON object. Each node represents one ingredient or crafted component. Nodes can have `children` (sub-recipe) **or** `alternatives` (branching routes), but not both simultaneously.

### RecipeNode Schema

```ts
{
  name:          string         // Display name of the material/component
  emoji?:        string         // Optional icon emoji (master item only)
  image?:        string         // Filename from /images/ (e.g. "crystal-jinark.png")
  need:          number         // Base quantity required (scaled by qty multiplier)
  type?:         "checkbox"     // Binary done/not done
               | "counter"      // Numeric have/need  ← default if omitted
  children?:     RecipeNode[]   // Sub-recipe (mutually exclusive with alternatives)
  alternatives?: AltRecipe[]    // Branching routes (mutually exclusive with children)
}

AltRecipe: { label: string, children: RecipeNode[] }
```

### LocalStorage Keys

| Key | Type | Contents |
|---|---|---|
| `tr_recipe` | JSON string | Full recipe tree object |
| `tr_progress` | JSON string | Map of `nodeKey → have` value (number) or boolean (checkbox) |
| `tr_qty` | Number string | Current craft multiplier (default: 1) |
| `tr_alt` | JSON string | Map of `nodeKey → selected alternative index` |

---

## ⚙️ 5. Feature Specifications

### 5.1 Hybrid Input System

Each `RecipeNode` declares its input type via the `type` field. The UI renders accordingly:

| `type` | UI Control | Progress Contribution | Use Case |
|---|---|---|---|
| `checkbox` | Single toggle (☑ / ☐) | 0% or 100% (binary) | Shop items, quest rewards, fixed-count mats |
| `counter` *(default)* | Number input + − / + buttons | `have / need × 100%` | Farmable drops, gathered resources |

> `type` defaults to `"counter"` if omitted from the JSON.
> Checkbox items are not affected by the quantity scaler — one checkbox = one unit, always binary.

---

### 5.2 Item Images

- Each node optionally has an `image` field containing a filename (e.g. `"crystal-jinark.png"`)
- Images are loaded from `/images/{filename}`
- If `image` is absent or the file is missing, display `/images/placeholder.png` instead
- Images are shown as small icons (32×32px) next to the node name in the tree
- Full image asset list is documented in `data.md`

---

### 5.3 Recipe Tree

- Render as collapsible tree; **all nodes collapsed by default**
- Click header row to toggle expand/collapse
- Visual depth cues via left-border color per depth level (depth 0–3+)
- Nodes with children show a `▶` chevron that rotates 90° when open
- Leaf nodes (no children, no alternatives) show the input control
- Parent nodes show a mini progress bar summarizing children completion
- Completed nodes show strikethrough name and a "Done" badge

---

### 5.4 Alternative Recipes

- A node with `alternatives` renders tab buttons above its child list
- Only one alternative active at a time
- Switching alt tab re-renders only that node's children
- Selected alt index persisted in `tr_alt`
- `alternatives` and `children` are mutually exclusive on the same node

---

### 5.5 Quantity Scaler

- Stepper control at top of the master card (`+` / `−` buttons), minimum value: 1
- All `need` values across the entire tree multiply by `qty` in real time
- Counter progress compared against scaled `need`
- **Checkbox items:** `need` treated as 1 regardless of `qty` — always binary

---

### 5.6 Overall Progress Bar

- Calculated from **leaf nodes only** (nodes with no active children)
- Formula: `sum(min(have, need_scaled)) / sum(need_scaled)` across all leaves
- Checkbox leaves contribute `0` or `need_scaled` (binary)
- Counter leaves contribute `have` capped at `need_scaled`
- Updates live on every input change

---

### 5.7 Persistence (LocalStorage)

- Progress **auto-saves** on every checkbox toggle or counter change
- Recipe, alt choices, and qty saved on explicit **Save** button
- **Reset Progress:** clears `tr_progress` only — recipe stays intact
- **Load Recipe:** clears progress + alt choices, saves new recipe to `tr_recipe`

---

### 5.8 JSON Recipe Editor

- Modal dialog with monospace textarea
- Pre-populated with current recipe when opened
- **Apply** button: validates JSON, shows toast on error, renders on success
- Schema hint shown below textarea

---

## 🔑 6. Node Key System

Each node has a stable, unique key for localStorage lookup. Keys are generated **deterministically from tree position**:

```
root_0           → first child of master item
root_0_1         → second child of root_0
root_1           → second child of master item
```

For alternative children, the parent key gets an `_alt{idx}` infix:

```
root_1_alt0_0    → first child of alt-0 of root_1
root_1_alt1_0    → first child of alt-1 of root_1
```

Keys are path-based (depth indices joined by `_`). Stable across reloads as long as recipe structure doesn't change. Loading a new recipe resets all progress.

---

## 📋 7. Hardcoded Recipe (จินอาร์ค)

The app ships with the จินอาร์ค recipe hardcoded as the default. Full item details in `data.md`.

```json
{
  "name": "จินอาร์ค",
  "emoji": "✨",
  "image": "jinark.png",
  "children": [
    {
      "name": "ผมจินอาร์ค", "need": 1, "type": "counter", "image": "hair-jinark.png",
      "children": [
        { "name": "คริสตัลจินอาร์ค", "need": 10, "type": "counter", "image": "crystal-jinark.png" }
      ]
    },
    {
      "name": "ปีกจินอาร์ค", "need": 1, "type": "counter", "image": "wing-jinark.png",
      "children": [
        { "name": "คริสตัลจินอาร์ค", "need": 10, "type": "counter", "image": "crystal-jinark.png" }
      ]
    },
    {
      "name": "ผ้าปิดตาจินอาร์ค", "need": 1, "type": "counter", "image": "blindfold-jinark.png",
      "children": [
        { "name": "คริสตัลจินอาร์ค", "need": 10, "type": "counter", "image": "crystal-jinark.png" }
      ]
    },
    {
      "name": "ทักษะแปรธาตุจินอาร์ค", "need": 1, "type": "counter", "image": "skill-jinark.png",
      "children": [
        {
          "name": "คริสตัลจินอาร์ค(เดวิล)", "need": 1, "type": "counter", "image": "crystal-jinark-devil.png",
          "children": [
            { "name": "ถุงมือพรีมาเดวิล",  "need": 1, "type": "checkbox", "image": "glove-prima-devil.png" },
            { "name": "รองเท้าพรีมาเดวิล", "need": 1, "type": "checkbox", "image": "shoes-prima-devil.png" },
            { "name": "ชุดพรีมาเดวิล",     "need": 1, "type": "checkbox", "image": "suit-prima-devil.png"  },
            { "name": "ผมพรีมาเดวิล",      "need": 1, "type": "checkbox", "image": "hair-prima-devil.png"  },
            { "name": "มงกุฏพรีมาเดวิล",   "need": 1, "type": "checkbox", "image": "crown-prima-devil.png" },
            { "name": "ปีกพรีมาเดวิล",     "need": 1, "type": "checkbox", "image": "wing-prima-devil.png"  }
          ]
        },
        {
          "name": "คริสตัลจินอาร์ค(แองเจิล)", "need": 1, "type": "counter", "image": "crystal-jinark-angel.png",
          "children": [
            { "name": "ถุงมือพรีมาแองเจิล",  "need": 1, "type": "checkbox", "image": "glove-prima-angel.png" },
            { "name": "รองเท้าพรีมาแองเจิล", "need": 1, "type": "checkbox", "image": "shoes-prima-angel.png" },
            { "name": "ชุดพรีมาแองเจิล",     "need": 1, "type": "checkbox", "image": "suit-prima-angel.png"  },
            { "name": "ผมพรีมาแองเจิล",      "need": 1, "type": "checkbox", "image": "hair-prima-angel.png"  },
            { "name": "มงกุฏพรีมาแองเจิล",   "need": 1, "type": "checkbox", "image": "crown-prima-angel.png" },
            { "name": "ปีกพรีมาแองเจิล",     "need": 1, "type": "checkbox", "image": "wing-prima-angel.png"  }
          ]
        }
      ]
    }
  ]
}
```

---

## 🖼 8. UI Component Map

| Component | Responsibility | Key Behaviour |
|---|---|---|
| `MasterCard` | Item name + image, overall progress bar, qty scaler | Progress bar animates on update |
| `ControlsBar` | Load recipe / Save / Reset buttons | Reset requires confirmation dialog |
| `RecipeTree` | Renders full nested node tree | Full re-render from state on every change |
| `RecipeNode` | Single collapsible tree node | Renders `CheckboxInput` or `CounterInput` based on `type` |
| `NodeImage` | 32×32 item icon per node | Falls back to `placeholder.png` on missing image |
| `CheckboxInput` | Single toggle for binary items | Saves boolean to `progress[key]` |
| `CounterInput` | Number input + ± buttons | Saves number to `progress[key]`, min 0 |
| `AltTabs` | Tab switcher for alternative recipes | Saves index to `altChoice[key]` |
| `MiniProgressBar` | 4px bar under each parent node | Summarises children completion ratio |
| `JsonEditorModal` | Full-screen modal with textarea | Validates JSON before applying |
| `Toast` | Ephemeral feedback message | Auto-dismisses after 2.2s |

---

## 🛠 9. Technical Specification

### Stack

- **Single HTML file** — no build step, no framework
- **Vanilla JavaScript** (ES2020+) — no external JS libraries
- CSS custom properties for theming; Google Fonts via CDN (Nunito + Fredoka One)
- **LocalStorage** for all persistence — no cookies, no IndexedDB

### File Structure

```
talesrunner-tracker.html   ← single file app
/images/
  placeholder.png          ← default fallback image
  jinark.png
  hair-jinark.png
  ... (see data.md for full list)
data.md                    ← item/recipe/drop reference
PRD.md                     ← this file
```

### Render Strategy

- **Full re-render** on every state change (recipe is small, performance is fine)
- `render()` rebuilds `#recipeTree` DOM from scratch on each call
- Open/closed state of nodes resets to closed on re-render

### Key Functions

| Function | Role |
|---|---|
| `init()` | Bootstrap: load from localStorage or defaults, call `render()` |
| `render()` | Update master card, rebuild recipe tree DOM, update overall bar |
| `buildNode(node, depth, key)` | Recursively create DOM element for one node and its children |
| `getActiveChildren(node, key)` | Returns `node.children` or `node.alternatives[altChoice[key]].children` |
| `collectLeafTotals(nodes, prefix, mult)` | Recursively sum `have`/`need` from all leaf nodes for overall % |
| `autosave()` | `JSON.stringify` progress to localStorage immediately |
| `loadFromJson()` | Parse textarea, validate, reset progress, save recipe, re-render |
| `updateOverall()` | Compute overall % and update progress bar + label |

---

## ❓ 10. Open Questions for Development

- Should open/closed node state persist in localStorage across page reloads?
- Should resetting progress also reset the qty multiplier back to 1?
- Is a "copy recipe JSON" button needed for exporting/sharing builds?

### ✅ Resolved

| Question | Decision |
|---|---|
| คริสตัลจินอาร์ค — shared pool or per-piece? | **Per-piece** — tracked independently for ผม, ปีก, ผ้าปิดตา (×10 each, total 30) |

---

*End of PRD — Ready for Claude Code 🚀*
