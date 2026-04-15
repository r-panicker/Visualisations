# OpenCL Interactive Teaching Demo — Detailed Specification

## 1. Purpose & Audience

**Goal:** Single-page browser-based interactive teaching tool introducing all four OpenCL conceptual models to students with FPGA acceleration experience (Kria KV260 / Vivado HLS).

**Pedagogical bridge:** OpenCL abstracts the parallelism students previously wired in RTL into a portable, software-defined model. Each tab maps OpenCL concepts to FPGA equivalents they already know.

**Delivery:** Available as both a self-contained HTML file and a React JSX artifact.

---

## 2. The Four Models → Five Tabs

OpenCL defines four conceptual models. The demo dedicates one tab to each, with the Execution Model split across two tabs for clarity:

| Tab | OpenCL Model | Content |
|-----|-------------|---------|
| 1 — Platform | Platform Model | Host↔Device hierarchy, CU/PE drill-down, device-type toggle |
| 2 — Memory | Memory Model | 5-region memory hierarchy with FPGA equivalents, data-flow arrows |
| 3 — NDRange | Execution Model (spatial) | 2D work-item grid, work-group partitioning, ID lookup |
| 4 — Timeline | Execution Model (temporal) | Gantt-style kernel lifecycle, CU parallelism slider |
| 5 — Comparison | Programming Model | Side-by-side OpenCL kernel vs HLS code |

---

## 3. Tab Details

### Tab 1 — Platform Model

- **Diagram:** Host (CPU) box on left, Device box on right, connected by a curved arrow labeled "PCIe / AXI".
- **Device toggle:** Three buttons (GPU / FPGA / CPU). Switching changes the device box's color, icon, and description, but preserves the CU/PE structure — reinforcing portability.
- **Progressive reveal (6 steps):**
  1. Platform concept + `clGetPlatformIDs` highlighted
  2. Device query + `clGetDeviceIDs` highlighted
  3. Context creation + `clCreateContext` highlighted
  4. CU boxes appear inside device (4 CUs, each with 3 PE blocks)
  5. PE detail — ALU mapping to FPGA datapath
  6. Portability summary
- **Code panel:** 7-line host setup snippet (`clGetPlatformIDs` → `clCreateContext`).

### Tab 2 — Memory Model (NEW)

- **Visualization:** Five stacked memory-region cards, each with:
  - Color-coded border and label (Host=purple, Global=green, Constant=cyan, Local=amber, Private=pink)
  - Subtitle explaining scope and speed
  - FPGA equivalent (e.g., "BRAM per CU", "PS DDR on Kria")
  - Example buffer/variable names as small blocks
- **Progressive reveal (6 steps):**
  1. Host memory only — intro to memory model concept
  2. Global memory appears — DDR/VRAM, accessible by all work-items
  3. Constant memory appears — read-only cached, maps to ROM/LUT
  4. Local memory appears — work-group scratchpad, maps to BRAM
  5. Private memory appears — per-work-item registers, maps to FFs
  6. Data-flow arrows appear (Host → Global → Local → Private) with summary
- **Code panel:** 11-line kernel using `__local` memory, `barrier()`, and `get_local_id`.
- **FPGA analogy at each step:** Students see exactly how each memory region maps to hardware they've already used.

### Tab 3 — NDRange (Execution Model — Spatial)

- **Grid:** 2D array of work-item cells (16×8 desktop, 8×4 mobile).
- **Work-group slider:** Adjusts partition size (2×2, 4×2, 4×4, 8×4). Grid re-colors live.
- **Cell interaction:** Click/tap a cell → shows `get_global_id`, `get_local_id`, `get_group_id` in a detail panel below.
- **5 steps:** Empty grid → partitioned → highlight one group → show local IDs → show ID calculation code.
- **Code panel:** 7-line vector-add kernel, highlighting `get_global_id` line.

### Tab 4 — Timeline (Execution Model — Temporal)

- **Gantt chart:** Four horizontal phases: `clCreateBuffer` → `clEnqueueWriteBuffer` → `clEnqueueNDRangeKernel` → `clEnqueueReadBuffer`.
- **CU slider (1–8):** Controls how many concurrent work-group bars appear during the kernel execution phase. More CUs = shorter bars = faster execution.
- **6 steps:** Intro → allocate → write → execute (multi-bar) → read → summary.
- **Code panel:** 14-line host code, with the active API call highlighted per step.

### Tab 5 — Comparison (Programming Model)

- **Two-column code layout:** OpenCL kernel (left) vs HLS C function (right).
- **5 steps:** Define computation → interface declaration → parallelism → deployment → trade-off summary.
- **No side code panel** — both code panels are the visualization.
- **Synchronized highlights:** Both columns highlight corresponding sections simultaneously.

---

## 4. Interaction Model

### Step Controls
- **Buttons:** "← Prev" / "Next →", 44px min touch targets, centered below visualization.
- **Keyboard:**
  - `←` / `→` — step backward / forward
  - `Home` / `End` — first / last step
  - `1` – `5` — switch tabs directly
- **Step indicator:** "Step 3 / 6" between buttons.
- **Per-tab persistence:** Each tab's step state is preserved when switching tabs.

### Sliders
- NDRange: work-group size (discrete steps)
- Timeline: compute unit count (1–8)
- Native `<input type="range">` styled with `accent-color`.

### Cell Interaction (NDRange tab)
- Desktop: click to select. Mobile: tap to select (no hover).
- Detail panel appears below grid with calculated IDs.

---

## 5. Visual Design

### Layout
- **Desktop (≥768px):** Two-column — code panel (320px, left) + visualization (flex-grow, right). Tab 5 is full-width two-column code.
- **Mobile (<768px):** Single column — code panel (full-width, collapsible via Show/Hide toggle) above visualization.

### Typography
- Code: `'JetBrains Mono', monospace` — 12px, line-height 20px. No blank lines.
- Body: `'DM Sans', sans-serif` — 13px desktop, 12px mobile.
- Loaded from Google Fonts CDN.

### Color Palette
- Dark theme: `#0f1117` background, `#1a1d27` cards, `#141620` code.
- Accents: blue (`#4a9eff`), green (`#34d399`), amber (`#f59e0b`), purple (`#a78bfa`), cyan (`#22d3ee`), pink (`#f472b6`), red (`#f87171`).
- Memory regions each get a distinct accent color for clear identification.
- Work-group colors: 6 translucent hues cycling across groups.

### SVG
- All diagrams as inline SVG with `viewBox` for responsive scaling.
- Arrows: endpoint on shape edge via quadratic Bézier (`Q`), single control point, no kinks. Arrowheads via `<marker>`.
- Drop shadows via `<filter>` / `feDropShadow`.

### Transitions
- Step changes: 200–400ms ease-out on opacity, width, border.
- Memory regions: opacity transition (0.2 → 1) as they appear.
- Timeline bars: width transition over 400ms.

### Syntax Highlighting (inline, no library)
- Keywords (`__kernel`, `__global`, `void`, `const`, `CL_*`): purple
- Functions (`clCreate*`, `get_global_id`, `barrier`): blue
- Pragmas (`#pragma HLS`): amber
- Numbers: green

---

## 6. Code Snippets

### Platform host setup (7 lines)
`clGetPlatformIDs` → `clGetDeviceIDs` → `clCreateContext`

### Memory kernel (11 lines)
Uses `__local float* scratch`, `get_local_id`, `barrier(CLK_LOCAL_MEM_FENCE)`

### Vector-add kernel (7 lines)
Standard `__kernel void vec_add` with `get_global_id`

### Host execution code (14 lines)
`clCreateBuffer` × 3 → `clEnqueueWriteBuffer` × 2 → `clEnqueueNDRangeKernel` → `clEnqueueReadBuffer`

### HLS equivalent (10 lines)
Pragma-annotated C function with `#pragma HLS INTERFACE m_axi` and `#pragma HLS PIPELINE`

---

## 7. Responsive Behavior

| Breakpoint | Layout | NDRange Grid | Code Panel |
|---|---|---|---|
| ≥768px | Side-by-side | 16×8 | Fixed 320px left |
| <768px | Stacked | 8×4 | Full-width, collapsible |

- Touch targets: ≥44px everywhere.
- Tab labels: abbreviated on mobile ("Plat", "Mem", "NDR", "Time", "Cmp").

---

## 8. State Management

Single top-level component with:
```
tab: 0–4
steps: [step0, step1, step2, step3, step4]   // per-tab, preserved
codeCollapsed: boolean (mobile only)
```

Tab-specific local state (device selection, wgIdx, selCell, CU count) lives within each tab component.

Global `keydown` listener for arrow keys, Home/End, digit keys.

---

## 9. Deliverables

| File | Format | Notes |
|------|--------|-------|
| `opencl_demo.html` | Standalone HTML | Vanilla JS, no build step, works offline (except fonts) |
| `opencl_demo.jsx` | React artifact | For Claude.ai rendering, same features |
| `SPEC_DETAILED.md` | This file | Full specification |
| `SPEC_CONCISE.md` | Minimal spec | Reproduction-ready, not over-engineered |
