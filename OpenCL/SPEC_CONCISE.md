# OpenCL Interactive Demo — Reproducibility Spec

## What
Single-file interactive teaching tool (HTML or React JSX): 5 tabbed panels covering all 4 OpenCL models for students with FPGA background.

## Tabs

1. **Platform Model** — Host↔Device SVG diagram. Toggle device type (GPU/FPGA/CPU). Step-through reveals CUs and PEs. Code: `clGetPlatformIDs` snippet (7 lines).

2. **Memory Model** — Five stacked cards (Host/Global/Constant/Local/Private). Each card shows scope, speed, FPGA equivalent, and example buffers. Step-through reveals regions one by one. Final step shows data-flow arrows. Code: kernel using `__local`, `barrier` (11 lines).

3. **NDRange** — 2D grid of work-items (16×8 desktop, 8×4 mobile). Slider adjusts work-group size. Click cell → shows global/local/group IDs. 5 steps. Code: vector-add kernel (7 lines).

4. **Timeline** — Horizontal Gantt: create buffer → write → execute → read. Slider for CU count (1–8) controls parallel work-group bars. 6 steps. Code: host API calls (14 lines).

5. **Comparison** — Side-by-side: OpenCL kernel vs HLS code. 5 steps with synchronized highlights. No side code panel.

## Interaction
- Prev/Next buttons + ←/→ arrow keys. Home/End for first/last. 1–5 switch tabs.
- Step indicator between buttons. Per-tab step state preserved.

## Layout
- Desktop (≥768px): code panel left (320px), SVG visualization right. Tab 5: two-column code.
- Mobile (<768px): stacked, code panel collapsible. Grid shrinks. Tab labels abbreviated.
- All buttons ≥44px touch target.

## Visuals
- Dark theme (#0f1117 bg). JetBrains Mono for code, DM Sans for labels. Google Fonts CDN.
- SVG with viewBox. Rounded rects, drop shadows. Arrows via quadratic Bézier, endpoints on shape edges.
- Memory regions: 5 distinct colors (purple/green/cyan/amber/pink).
- Inline syntax highlighting: keywords=purple, functions=blue, pragmas=amber, numbers=green.
- Step transitions: 200–400ms ease-out.

## Constraints
- HTML version: single file, vanilla JS, no build step.
- JSX version: single file, React + hooks only, no external deps beyond Tailwind core.
- No localStorage. All state in JS variables (HTML) or useState (React).
