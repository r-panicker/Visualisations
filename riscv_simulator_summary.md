# RISC-V Simulator — Summary

**File:** [`riscv_simulator.html`](file:///home/rajesh/GitHub/Visualisations/riscv_simulator.html) · single-file web app · **Live:** <https://nus-cg3207.github.io/labs>

A self-contained, offline-capable **RISC-V RV32GC** assembler, C compiler front-end, emulator, and visual debugger built for the NUS **CG3207** computer architecture labs. Everything (editor engine, ISA tables, peripherals, examples) is embedded in one HTML file with zero external dependencies; C compilation optionally uses the Compiler Explorer (Godbolt) REST API but ships with precompiled offline mappings for all built-in examples.

---

## What it does

| Area | Capability |
|------|------------|
| **Editor** | Embedded CodeMirror 6 bundle (`window.CM6`). Toggles between **RV32 Assembly** and **C**, each with its own syntax highlighter, autocomplete, live signature help, and hover docs. Catppuccin Mocha dark theme. |
| **Assembler** | Two-pass assembler for RV32I + M + A + F + D + C, plus common pseudo-instructions. Emits disassembly with label header rows, jump/branch target annotations, and C source-line tags. |
| **C support** | Compiles via Godbolt (RV32 GCC / Clang, selectable `-O` level and ABI). Prepends a baremetal CRT0 shim that sets `sp`. Builds bidirectional PC↔C-line maps for source-level stepping and breakpoints. Clang 20.1.0 is the default compiler. |
| **Execution** | Non-blocking `requestAnimationFrame` loop, fixed `BATCH_SIZE = 10,000` instr/tick. Configurable run limit (`simMaxInstrPerRun`, default 100,000,000) auto-pauses infinite loops. Cycle-accurate CPI timing by instruction category. |
| **Debugging** | Run / Pause / Resume, Step, Step Back (full register+memory history), optional **Statement Stepping** (one C statement / multi-instr pseudo-op per step). Breakpoint gutter with smart snapping to the next valid instruction; highlighted breakpoint line numbers; active execution line tracking with auto-scroll. |
| **Memory view** | Tabbed `[ Code | Data | Stack | MMIO ]`. Code segment read-only; Data/Stack/MMIO editable. Stack shown in downward-decreasing address order. Little-endian word display. Code/data segment overflow warnings. Verilog `.mem` dumps (`AA_IROM.mem`, `AA_DMEM.mem`). |
| **Panel layout** | Registers / Memory / Peripherals / Disassembly are independent (not exclusive tabs): show any combination; ≤2 docked panels stack vertically, >2 form a **2×2 grid** (dock expands to half the window width) with draggable row/column splitters; detach any panel into a draggable, resizable floating window. Layout persists to `localStorage`. |
| **Settings** | One `⚙ Settings…` modal, 3 tabs: **Compiler** (toolchain, `-O`, march/mabi), **Linker** (segment bases/sizes, stack top, MMIO base — SPIM-style defaults), **Simulator** (statement stepping, run limit, per-category CPI). |

---

## Memory layout (SPIM-style defaults)

| Segment | Base | Size |
|---------|------|------|
| `.text` (code) | `0x00400000` | `0x200` (512 B / 128 instr) |
| `.data` | `0x10010000` | `0x200` |
| Stack top (`sp`) | `0x10010200` | (Data base + Data size; customizable) |
| MMIO base | `0xFFFF0000` | — |

## MMIO map (Nexys 4 board simulation)

| Address | Access | Symbol | Purpose |
|---------|--------|--------|---------|
| `0xFFFF0000` / `0xFFFF0004` | RO | `UART_RX_VALID` / `UART_RX` | Serial receive status + data (pop on read) |
| `0xFFFF0008` / `0xFFFF000C` | RO / WO | `UART_TX_READY` / `UART_TX` | Serial transmit status + data |
| `0xFFFF0020`–`0xFFFF002C` | WO | `OLED_COL/ROW/DATA/CTRL` | 96×64 pixel OLED; `CTRL[3:0]` advance mode, `CTRL[7:4]` color format (8/16/24-bit) |
| `0xFFFF0040` / `0xFFFF0044` | RO | `ACCEL_DATA` / `ACCEL_DREADY` | Packed `[31:24]=Temp, [23:16]=X, [15:8]=Y, [7:0]=Z`, all 8-bit signed |
| `0xFFFF0060` / `0xFFFF0064` | WO / RO | `PERIPH_LED` / `PERIPH_DIP` | 16 output LEDs / 16 DIP switches |
| `0xFFFF0068` | RO | `PERIPH_PB` | Push buttons (bit 2 = BTNL, 1 = BTNC, 0 = BTNR) |
| `0xFFFF0080` | WO | `PERIPH_SEVENSEG` | 32-bit value → 8 hex digits on 7-segment |
| `0xFFFF00A0` | RO | `CYCLECOUNT` | Total instruction cycles since reset |

Peripheral panel also renders the OLED canvas (3× scale), accelerometer sliders with presets (Flat / Tilt X / Tilt Y / Shake / Zero), a UART console with ASCII/Hex I/O modes and configurable RX delay, and the LED / DIP / button / 7-segment board.

---

## Example programs (19 built-in)

**C (8):** Basic Sum, Factorial (recursive), Fibonacci, Array Search, 2×2 Matrix Multiply, MMIO Peripherals, Circle & Delay + Accel (`Circle_delay_accel.c`), Image Display + Accel (`ImageDisplay_autoadvance_accel.c`).

**Assembly (11):** basic sum, RARS syscalls demo, Fibonacci, Factorial (`5! = 120`), array loop, I/O + M-extension, DIP→LED, Hello World (UART), Hello World with `jal`/`jalr`, Circle + Accel, Image Display + Accel.

All C examples carry embedded precompiled Godbolt assembly so they run fully offline.

---

## ISA & syscalls

- **RV32I** base + **M** (mul/div), **A** (atomics), **F/D** (single/double float), **C** (compressed), plus pseudo-instructions (`li`, `la`, `mv`, `j`, `call`, `ret`, `beqz`, …).
- 32× integer registers `x0`–`x31` (`x0` hardwired 0, `sp` starts at 0), 32× float registers `f0`–`f31`, `PC`.
- **RARS `ecall` services:** print int/float/double/string/char/hex/binary/unsigned (1–4, 11, 34–36), read int/float/double/string/char (5–8, 12), `sbrk` (9), `MilliSleep` (40), `Exit` / `Exit2` (10 / 93).

## Key shortcuts

| Key | Action |
|-----|--------|
| `F5` | Run / Pause / Resume |
| `F8` / `Shift+F8` | Step forward / Step back |
| `F9` | Toggle breakpoint at cursor line |
| `Ctrl/Cmd+Enter` | Assemble / Compile |
| `Ctrl/Cmd+S` | Save source (`.asm` / `.c`) |
| `Ctrl+Space` | Trigger autocomplete |
| `Ctrl/Cmd+F` / `Ctrl/Cmd+H` | Find / Replace |
| `Tab` / `Shift+Tab` | Insert `\t` or indent / dedent selection |

---

## Tests

Node-based harness in [`riscv_simulator_tests/`](file:///home/rajesh/GitHub/Visualisations/riscv_simulator_tests) covering: full system integration, Godbolt C compilation + line mapping, all 19 baked examples, statement stepping, run-limit throttling, disassembly labels & warnings, image-display rendering parity (ASM vs C), Tab/autocomplete behavior, breakpoint snapping & highlight, RV32GC instruction coverage (90+), and multi-step execution correctness.

---

## Current version

**v23.4** — Streamlined Memory-view toolbar & legend:
- **Two-row Memory toolbar**: Row 1 = `Addr` + `[ Code | Data | Stack | MMIO ]` + **↻ refresh**; Row 2 = `Rows` + a **segmented `[ Byte | Word ]`** display-mode toggle (a two-button pill with the active mode highlighted, replacing the old bare checkbox).
- **Word-mode legend**: when Word view is active the legend shows *"each row = two 32-bit words · Full word (LSB to the right)"* (never called "big endian" — RISC-V is little-endian); byte mode keeps *"groups of 4 bytes = one 32-bit little endian (LSB to the left) word"*. The little-endian hint stays cyan.
- **Legend as its own row** with syntax highlighting mirroring the code editor: `label` in **orange** (`#fab387`), `highlighted bytes` in **yellow** (`#ffe08f`), `Data/Stack/MMIO: editable` in **blue** (`#89b4fa`).
- **Code/data symbol labels**: any label whose address falls inside a row is anchored **directly above the word it belongs to** in orange (`mem-row-label` + `mem-row-label-anchor`), so with two words per row it's always clear which word the label refers to (e.g. `main` above the first word on the `0x00400000` row). **Non-word-aligned** labels (e.g. a `.byte`/`.asciz` symbol at `+2` inside a word) show their exact byte address in a hover tooltip. Disassembly **label names now also orange** (`#fab387`, matching the Code window / Memory view) and **pseudoinstructions in the Original-source column are blue** (`#89b4fa`) — a colour swap freeing orange exclusively for labels.
- **Cleaner empty state**: the "All panels are hidden" hint is now a compact single line with a grid icon and emphasised panel names (no more `<br>`-cluttered two-liner).

**v23.3** — Memory byte/word view toggle, M-extension compiler checkbox, and auto-assemble on load:
- **Memory View toggle**: a **segmented `[ Byte | Word ]`** control in the Memory toolbar flips between the classic separate-editable-bytes view (single-click byte edit, double-click word edit) and a **whole-32-bit-word view** where each aligned 4-byte group renders as one 8-digit little-endian hex word. Word cells are click-editable via the word overlay (code segment stays read-only), ASCII column and symbol labels are preserved, and the legend hint updates to match the active mode.
- **Compiler options — M extension checkbox**: Settings → Compiler now has a tiny **"Include M extension (RV32I + M — mul/div)"** checkbox (checked by default) that automatically rewrites the Architecture & ABI flags text box between `-march=rv32im -mabi=ilp32` and `-march=rv32i -mabi=ilp32`. Both "Reset Defaults" paths restore the checkbox.
- **Auto-assemble on load**: loading an example or file (and the initial boot example) now assembles immediately in ASM mode, so **Run and Step are active right away** and the **Assemble button is disabled** until the source is edited. Editing the code re-enables Assemble and disables Run/Step. The **Memory (code/data) view now refreshes immediately** after Assemble/Compile (previously only the Disassembly window updated).

**v23.0** — 2×2 docking grid: when more than two inspector panels are docked they arrange in a 2×2 grid (2 rows × 2 columns) and the dock expands to half the window width; draggable column (`.panel-hsplitter`) and row (`.panel-vsplitter`) separators resize the grid, with row heights and column widths persisted.

**v22.0** — Dockable/detachable inspector panels: Registers, Memory, Peripherals, and Disassembly are no longer mutually-exclusive tabs; they can be stacked in the side column or torn off into floating windows, with layout persisted to `localStorage`.

**v21.0** — Clang 20.1.0 stable as default compiler; accurate C data-segment sizing (ignores debug sections); fixed false-positive overflow warnings on small programs; code-segment overflow warning in `assemble()`; removed duplicate C data-section warnings.

See §12 of [`riscv_simulator.md`](file:///home/rajesh/GitHub/Visualisations/riscv_simulator.md) for the full v1–v22 changelog and the exhaustive specification.
