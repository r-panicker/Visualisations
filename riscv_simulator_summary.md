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
| **Panel layout** | Registers / Memory / Peripherals / Disassembly are independent (not exclusive tabs): show any combination, stack them vertically with drag-resize splitters, or detach any panel into a draggable, resizable floating window. Layout persists to `localStorage`. |
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

**v22.0** — Dockable/detachable inspector panels: Registers, Memory, Peripherals, and Disassembly are no longer mutually-exclusive tabs; they can be stacked in the side column or torn off into floating windows, with layout persisted to `localStorage`.

**v21.0** — Clang 20.1.0 stable as default compiler; accurate C data-segment sizing (ignores debug sections); fixed false-positive overflow warnings on small programs; code-segment overflow warning in `assemble()`; removed duplicate C data-section warnings.

See §12 of [`riscv_simulator.md`](file:///home/rajesh/GitHub/Visualisations/riscv_simulator.md) for the full v1–v22 changelog and the exhaustive specification.
