# Prompt: Process Lifecycle Visualizer (v3)

Build a single-file HTML educational simulator that teaches the **5-State Process Lifecycle Model** used in operating systems. Target audience: CS students seeing this concept for the first time.

---

## Aesthetic Direction

Dark-mode "mission control" theme — serious but inviting, like a teaching lab's debug console.

- **Background:** `#0a0e27` (deep navy-black), with a faint CSS grid overlay for texture.
- **State colors (neon accents):**
  - New → Cyan `#00e5ff`
  - Ready → Purple `#b388ff`
  - Running → Blue `#448aff` (pulsing glow when occupied)
  - Blocked → Amber `#ffd740`
  - Terminated → Green `#69f0ae`
- **Text:** `#e0e0e0` primary, `#7a7f9e` secondary.
- **Typography:** Use Google Fonts — `IBM Plex Mono` for headings, labels, code, and monospace elements. `Outfit` for body text.
  - **Mobile readability is critical.** Use `clamp()` with generous minimums: body text at `clamp(14px, 1.8vw, 16px)`, descriptions at `clamp(13px, 1.5vw, 14px)`, table cells at `clamp(12px, 1.4vw, 13px)`. Buttons at `clamp(13px, 1.5vw, 14px)`.
  - Set `font-size: 16px` on body and `-webkit-text-size-adjust: 100%` to prevent mobile Safari from shrinking text.
- **Borders & cards:** Subtle `1px` borders at low opacity. Prefer soft neon glows on active elements over heavy drop shadows.

---

## Layout

### Desktop (≥ 1024px)
Two-pane horizontal split below the header:
- **Left pane (~65%):** SVG visualization canvas with step controls directly beneath it.
- **Right pane (~35%):** Stacked vertically — Step Description card, Process State Table, Event Log.

### Mobile (< 1024px)
Single-column stack: Header → Mode Bar → (Algorithm bar if Mode 4) → Canvas → Controls → Description → Table → Log. The SVG canvas scales via `viewBox` / `preserveAspectRatio` and stays at top without scrolling past it. Give the canvas `height: 55vw; min-height: 220px; max-height: 380px` on mobile.

---

## The SVG Canvas

Use `viewBox="0 0 720 380"`. All geometry uses absolute SVG coordinates.

### State Nodes

Five rounded rectangles with the following approximate positions and sizes (center x, center y, width, height):

| State | x | y | w | h | Notes |
|---|---|---|---|---|---|
| NEW | 65 | 110 | 120 | 70 | Entry point, far left — wide enough for 3 token slots |
| READY | 240 | 80 | 140 | 65 | Wide enough for 3 token slots |
| RUNNING | 460 | 80 | 110 | 65 | Central, prominent, pulsing glow rect when occupied |
| BLOCKED | 350 | 290 | 140 | 65 | Below the main flow |
| TERMINATED | 650 | 110 | 120 | 70 | Exit point, far right — wide enough for 3 token slots |

Each node has its state name as a label (in state color) and a grey sublabel beneath it. The RUNNING node has an outer glow rect that pulses via CSS `@keyframes` when a process occupies it.

### Process Tokens — NON-OVERLAPPING

Tokens are circles (radius ~13px) with the process ID centered inside. Each process gets a distinct, consistent color: P1 = Cyan, P2 = Pink, P3 = Amber.

**Critical: Tokens must never overlap.** When multiple processes occupy the same state:
- Calculate the total row width as `(count - 1) * 32px` gap.
- Center the row horizontally within the state box.
- Place each token at `centerX - totalWidth/2 + index * 32`.
- Token Y position: `stateY + 12` (below the label area, but inside the box).

A single process in a state is simply centered at `(stateX, stateY + 12)`.

### Transition Arrows — Clean Edge-to-Edge Curves

Arrows connect from the **edge** of one state box to the **edge** of another. Use quadratic (`Q`) or cubic (`C`) Bézier curves. All curves should be **consistently convex** (arcing away from the straight-line path between endpoints).

Compute start/end points by referencing the state boxes' edges:

| Arrow | From edge | To edge | Curve direction |
|---|---|---|---|
| **Admit** (New→Ready) | NEW right edge | READY left edge | Arc upward |
| **Dispatch** (Ready→Running) | READY right edge | RUNNING left edge | Gentle arc upward |
| **Timeout / Preempted** (Running→Ready) | RUNNING top-left corner area | READY top-right corner area | Arc upward (above both boxes) |
| **I/O Request** (Running→Blocked) | RUNNING bottom edge | BLOCKED right edge | Arc rightward |
| **I/O Done** (Blocked→Ready) | BLOCKED left edge | READY bottom edge | Arc leftward |
| **Exit** (Running→Terminated) | RUNNING right edge | TERMINATED left edge | Gentle arc downward |

Write a `boxEdge(stateKey, side)` helper that returns `{x, y}` for a named edge of any state. Build all arrow paths programmatically from these edge coordinates plus computed control points (offset 30–60px away from the straight line in the arc direction).

Each arrow has a text label positioned at the midpoint of the curve. Labels are **upright text** (not rotated along the path) — use a `<text>` element placed at the SVG point returned by `path.getPointAtLength(totalLength / 2)`, with an appropriate offset to avoid overlapping the line. For the **Timeout / Preempted** arrow, render two lines of upright text ("Timeout" above "/ Preempted"). When a transition fires: brighten the arrow stroke to its state color, add a `stroke-dasharray` flow animation for ~800ms, then return to idle.

All arrow paths must be **smooth curves** — use quadratic (`Q`) Béziers by default. Only use cubic (`C`) Béziers where the path requires two distinct bends (e.g., I/O Request, I/O Done). Avoid cubic curves for simple arcs (like Admit) where a single control point suffices, as two control points can introduce visible kinks.

---

## Scenarios (Modes 1–3)

### Mode 1 — The Happy Path (4 steps)
Single process `P1`: New → Ready → Running → Terminated.

### Mode 2 — Preemption (8 steps)
Two processes. P1 runs, timer interrupt preempts it, P2 gets CPU, finishes. P1 resumes, finishes.

### Mode 3 — I/O Blocking (8 steps)
One process runs, issues I/O request, goes to Blocked. While P1 is blocked, show the CPU executing in **kernel mode** with a visual indicator on the RUNNING box (dashed red border, "⚙ KERNEL MODE" label pulsing). Include an extra step where the kernel services the I/O request, with a note in the event log that the kernel's I/O servicing may not be continuous — other processes could run while waiting for I/O to complete. Then I/O completes, P1 returns to Ready (not Running), gets dispatched again, finishes.

---

## Mode 4 — Multitasking with Scheduling Algorithm Selector

Mode 4 uses **three processes (P1, P2, P3)** and adds a **secondary selector bar** that lets the user pick a scheduling algorithm. When Mode 4 is selected, an "Algorithm" bar appears below the mode bar with buttons for each algorithm. Switching algorithms resets and loads a different step sequence for the same 3 processes.

### Algorithms to implement:

**Round Robin (preemptive, ~15 steps)**
- Processes take turns in FIFO order, each getting a fixed time quantum.
- Show timer interrupts cycling through P1→P2→P3.
- P2 does an I/O request mid-quantum (cooperative yield within a preemptive system).
- Emphasize fairness: no process is starved.

**FCFS — First-Come First-Served (non-preemptive, ~11 steps)**
- Processes run to completion or until they block. No timer interrupts.
- P1 blocks on I/O, P2 runs fully, P3 runs fully, then P1 finally resumes.
- Teach the **convoy effect**: P1 arrived first but finishes last because of I/O + no preemption.

**Priority Scheduling (preemptive, ~12 steps)**
- P1 = low priority, P2 = high, P3 = medium.
- P2 runs first, blocks on I/O. P3 runs. When P2's I/O completes, it **preempts P3** (higher priority ready process immediately gets CPU).
- P2 finishes, then P3, then P1 last.
- Teach the **starvation risk** and mention **aging** as a mitigation.

### Algorithm bar UI:
- Only visible when Mode 4 is active. Hidden for Modes 1-3.
- Row of buttons styled like the mode bar but with a purple accent for the active button.
- Include a "Algorithm:" label prefix.
- Switching algorithm calls `resetScenario()` and loads the new step sequence.
- At each I/O request step in Mode 4 algorithms, the event log should include a note: "(Kernel execution to service the I/O request is not shown in this visualization.)"

---

## UI Components

### Mode Selector Bar
Row of four buttons at the top. Highlight the active mode with a blue accent border and background tint.

### Step Controls
Below the SVG canvas: **← Prev**, step counter (`Step 3 / 8`), **Next →**, and **↺ Reset** buttons.

### Step Description Card
A text box in the right pane that updates each step with:
- **What happened** (bold, white text): e.g., "Timer interrupt! P1 is preempted."
- **Why** (lighter text): e.g., "The hardware timer fires — P1 has used its time quantum. The OS saves P1's state and moves it back to Ready so no process hogs the CPU."

Write descriptions in clear, jargon-light language. **This is the primary teaching element.**

### Process State Table
Compact table: PID | State | Last Action. Colored dot before each state name.

### Event Log
Scrolling monospace panel, one line per step. Auto-scrolls to latest. Format: `[Step N] P1, P2: description`.

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `→` or `Space` | Next step |
| `←` | Previous step |
| `R` | Reset current scenario |
| `1` `2` `3` `4` | Switch to that mode |

Display a keyboard hint in the header (hidden on mobile).

---

## Implementation Constraints

1. **Single HTML file.** All CSS in a `<style>` block, all JS in a `<script>` block. No frameworks, no build tools.
2. **Clarity over flash.** Every animation must help the student understand. If an effect doesn't teach, cut it.
3. **Tokens must never overlap.** Use the slot positioning algorithm described above.
4. **Arrows must connect edge-to-edge** with clean, consistent convex curves. Compute paths programmatically from box geometry — do not hardcode path strings.
5. **Mobile-readable fonts.** All text must be legible on a 375px-wide screen without zooming. Use `clamp()` with minimum values ≥ 12px for body text.
6. **Step-by-step control.** Forward AND backward at the user's own pace. No auto-play.
7. **Smooth token glide** (~500ms cubic-bezier) between states is the key "aha moment."
8. **Readable descriptions** — the Step Description card is arguably more important than the animation.
