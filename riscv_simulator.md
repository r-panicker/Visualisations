# NUS-CG3207 RISC-V Simulator (RV32GC) — Technical Specification & Architecture Manual

## 1. Project Overview

**NUS-CG3207 RISC-V Simulator** is a high-performance, single-file web application (`riscv_simulator.html`) that delivers a full-featured **RISC-V RV32GC (RV32I + M + A + F + D + C) Assembler, Emulator, and Visual Debugger**.

Designed for computer engineering students, hardware architects, and embedded systems developers, the tool combines a syntax-highlighted assembly code editor with advanced plain-JS editing capabilities, two-pass assembler, non-blocking execution engine, real-time disassembly viewer, step-by-step debugger with back-stepping history, interactive memory explorer with custom segment mapping, configurable instruction cycle timing, a hardware-accurate simulation of the **Digilent Nexys 4 FPGA Board**, a standard 16550 **UART Serial Console**, a **96x64 Pixel OLED Display MMIO Peripheral**, a **3-Axis Accelerometer & Temperature Sensor**, a **System Cycle Counter**, and pre-loaded RISC-V assembly example programs (`Circle_delay_accel.asm`, `DIP_to_LED.asm`, `HelloWorld.asm`, `HelloWorld_jal_jalr.asm`, etc.).

---

## 2. Architecture & Design System

### 2.1 Technology Stack & Core Philosophy
- **Zero External Dependencies**: Pure HTML5, CSS3, and modern Vanilla JavaScript (ES6+). Runs completely client-side in all modern web browsers.
- **Theme & Aesthetics**: Dark mode theme inspired by the *Catppuccin Macchiato/Mocha* palette (`#1e1e2e` base, `#181825` mantle, `#313244` surface, `#cba6f7` mauve primary accents, `#89b4fa` blue highlights).
- **Responsive Layout**: Resizable two-pane layout using a custom draggable divider (`.splitter`). Optimized for desktop and mobile screens.
- **Embedded Favicon & Architecture Microchip Icon**: Custom vector SVG microchip architecture icon and embedded data URI SVG favicon in `<head>`, displaying an integrated circuit package with central silicon die, gold bonding I/O pins, and central `RV` (RISC-V) core logo.
- **Unified Toolbar Controls**: Every button in the main toolbar is styled with `display: inline-flex; height: 28px; line-height: 28px; box-sizing: border-box;` ensuring uniform vertical alignment across standard buttons and icon controls.

### 2.2 Stacked Code Editor Architecture
- **Dual-Layer Overlay**: Synchronized line numbers and custom syntax highlighting (`.highlight-layer`) positioned directly beneath a transparent `<textarea>` input layer.
- **Pixel-Perfect Line Gutter**: Standardized block rendering (`display: block; height: 20px; line-height: 20px; box-sizing: border-box;`) with `-webkit-text-size-adjust: 100%` and `font-variant-ligatures: none` preventing vertical baseline drift on high-DPI and mobile displays.
- **CSS Breakpoint Badges**: High-visibility 6px circular pink badges (`.bp-line::after`) indicating active line breakpoints without inflating font metrics.

### 2.3 Advanced Plain JavaScript Editor Features
- **In-Editor Floating Find & Replace Panel (`Ctrl+F` / `Ctrl+H` / `🔍 Find`)**:
  - Live token-aware search match highlighting directly in the syntax layer (`<mark class="hl-find-match">` for all occurrences, `<mark class="hl-find-active">` for active focus).
  - Real-time match counter (`1/5 matches`), next/previous navigation (`Enter` / `Shift+Enter` / `▲` / `▼`), and case-sensitivity toggle (`Aa` / `Alt+C`).
  - Search focus preservation: typing in search input does not steal focus from the find box.
  - Single and All replacement with automatic undo history tracking.
- **Auto-Indentation & Smart Colon Indent**: Automatically preserves leading whitespace on `Enter` and indents label definitions ending in `:`.
- **Multi-Line Indent & Dedent**: `Tab` indents selected lines; `Shift+Tab` dedents (strips `\t` or up to 4 leading spaces).
- **Comment / Uncomment**: Toggles `# ` comment prefix on single lines or selected blocks (`Ctrl+/` or `Cmd+/`).
- **Line Movement & Duplication**:
  - `Alt+Up` / `Alt+Down`: Moves selected line(s) up or down.
  - `Shift+Alt+Down` / `Ctrl+Shift+D`: Duplicates selected line(s).
- **Bracket & Quote Auto-Closing**: Auto-closes `()`, `[]`, `{}`, `""`, `''`, wraps active selections, steps over closing brackets, and auto-deletes empty pairs on `Backspace`.
- **Undo / Redo History**: Custom `EditorHistory` stack preserving exact cursor coordinates and selection ranges (`Ctrl+Z` / `Ctrl+Y`).

---

## 3. Register Panel & Processor Execution State

### 3.1 Register Bank Structure
The simulator models the standard 32 32-bit integer registers (`x0` / `zero` through `x31` / `t6`), 32 floating-point registers (`f0`–`f31`), and the Program Counter (`PC`). Register `x0` is hardwired to `0x00000000` (writes are silently discarded).

- **Hardware-Accurate Stack Pointer**: `sp` (register `x2`) is initialized to `0x00000000` on reset as per RISC-V hardware specification.

```
+-----+------+-------------------+-------------------+
|  #  | Name |    Value (Hex)    |    Value (Dec)    |
+-----+------+-------------------+-------------------+
| x0  | zero | 0x00000000        | 0                 |
| x1  | ra   | 0x00010040        | 65600             |
| x2  | sp   | 0x00000000        | 0                 |
| ... | ...  | ...               | ...               |
+-----+------+-------------------+-------------------+
```

### 3.2 Unified Morphing Run / Pause Button
- **State-Aware Control (`#runPauseBtn`)**:
  - **Ready / Stopped**: Shows `▶ Run`.
  - **Running**: Automatically morphs into `⏸ Pause` (with danger accent styling). Clicking it pauses execution.
  - **Paused / At Breakpoint**: Morphs into `▶ Resume` to continue from the current PC.
  - **Inactive Assemble State**: When code is edited or reset, the button becomes subtly inactive (`opacity: 0.55; cursor: not-allowed;`) with a tooltip requiring assembly before execution.

---

## 4. Peripherals & FPGA Board Simulation

The **Peripherals Panel** implements an interactive hardware simulation of the **Digilent Nexys 4 FPGA Board**, a standard 16550 **UART Serial Console**, a **96x64 Pixel OLED Display**, a **3-Axis Accelerometer & Temperature Sensor**, and a **Cycle Counter**.

```
+---------------------------------------------------------------------------------------------------+
|                                 COMPACT NEXYS 4 FPGA PERIPHERAL BOARD                             |
|                                                                                                   |
|  UART Serial Console (115200 8N1) 0xFFFF0000–0xFFFF000C        RX_VALID: 0  ·  TX_READY: 1         |
|  [Terminal Output Box]                                                                            |
|  Line 1: [ Mode: ASCII/Hex ] [ Text Box ] [ Send ] [ Clear ]                                      |
|  Line 2: [☑ Buffer]        [ 10 ▲▼ ] instr delay  ·  RX Queue: 0 bytes (empty)                    |
|                                                                                                   |
|  OLED 96x64 Pixel Display (0xFFFF0020–0xFFFF002C)              [ Clear Display ]                  |
|  [ 288x192 3x Pixelated Canvas ]   OLED_COL: 0 (0-95)  ·  OLED_ROW: 0 (0-63)  ·  OLED_CTRL: 0x00   |
|                                    Mode: vary_pixel_data_mode  ·  Format: 8-bit (3R-3G-2B)        |
|                                                                                                   |
|  3-Axis Accelerometer & Temp (0xFFFF0040–0xFFFF0044)           DREADY: 1  ·  Cycles: 1234          |
|  X Axis: [----|----] 0 (0x00, +0.00g)   Y Axis: [----|----] 0 (0x00, +0.00g)                      |
|  Z Axis: [----|--O-] 64 (0x40, +1.00g)   Temp:   [---|-----] 25°C (0x19)                           |
|  Presets: [Flat (Z=+1g)] [Tilt X (+1g)] [Tilt Y (+1g)] [Shake (±2g)] [Zero All]                   |
|                                                                                                   |
|  [P8][P7][P6][P5][P4][P3][P2]   [CLK]   [L7][L6][L5][L4][L3][L2][L1][L0]   (16 LEDs)              |
|  LED15------------------LED9    LED8    LED7----------------------LED0                            |
|                                                                                                   |
|  [SW15]--------------[SW9]     [SW8]    [SW7]--------------------[SW0]   (16 Dual-Rect 22px DIPs)  |
|                                                                                                   |
|  Push Buttons: [L] [C] [R] (Bit 2=BTNL, Bit 1=BTNC, Bit 0=BTNR)  7-Segment: [0 0 0 0 0 0 0 0]   |
+---------------------------------------------------------------------------------------------------+
```

### 4.1 3-Axis Accelerometer & Temperature Sensor (`0xFFFF0040`–`0xFFFF0044`)
- **`0xFFFF0040` (RO)**: `ACCEL_DATA` — 32-bit packed register:
  - Bits `[31:24]`: **Temperature** (8-bit signed integer, $-40..+85^\circ\text{C}$, default `25` / `0x19`).
  - Bits `[23:16]`: **Z Acceleration** (8-bit signed integer, $\pm 2g$ range, default `+64` / `0x40` = $+1.00g$).
  - Bits `[15:8]`: **Y Acceleration** (8-bit signed integer, $\pm 2g$ range, default `0` / `0x00` = $0.00g$).
  - Bits `[7:0]`: **X Acceleration** (8-bit signed integer, $\pm 2g$ range, default `0` / `0x00` = $0.00g$).
  - **Byte Access Support**: Individual byte reads via `lbu` / `lb` at offset `+0` (X), `+1` (Y), `+2` (Z), and `+3` (Temp).
- **`0xFFFF0044` (RO)**: `ACCEL_DREADY` — Bit 0 = 1 when a new accelerometer reading is ready.
- **Interactive UI Sliders & Presets**: Includes 3 range sliders for X, Y, Z ($\pm 128$), temperature slider, live $g$-force calculation, and preset buttons (`Flat`, `Tilt X`, `Tilt Y`, `Shake`, `Zero All`).

### 4.2 Cycle Count Register (`0xFFFF00A0`)
- **`0xFFFF00A0` (RO)**: `CYCLECOUNT` — Returns total instruction cycles elapsed since system reset (`totalCycles`).

### 4.3 96x64 Pixel OLED Display Peripheral (`0xFFFF0020`–`0xFFFF002C`)
- **Display Resolution**: 96 Columns $\times$ 64 Rows ($288\text{px} \times 192\text{px}$ canvas at 3x scale).
- **Internal Frame Buffer**: 6,144-pixel built-in frame buffer.
- **Modes**: 3 color formats (8-bit 3R-3G-2B, 16-bit 5R-6G-5B, 24-bit RGB) and 5 trigger/autoadvance modes (`vary_pixel_data_mode`, `vary_col_mode`, `vary_row_mode`, `autoadvance_col`, `autoadvance_row`).

---

## 5. Memory Model & Segment Mapping

### 5.1 Complete MMIO Address Map
| MMIO Address | Size | Access | Symbol | Description & Behavioral Rules | Row Annotation in Memory View |
|--------------|------|--------|--------|--------------------------------|-------------------------------|
| `0xFFFF0000` | 4 B  | Read   | `UART_RX_VALID` | Bit 0 = 1 if data is available in `UART_RX` queue (`uartRxQueue.length > 0`). | `[UART RX VALID RO 0xFFFF0000 · UART RX RO 0xFFFF0004]` |
| `0xFFFF0004` | 4 B  | Read   | `UART_RX` | Reading returns and pops the next 8-bit character from `uartRxQueue`. | `[UART RX VALID RO 0xFFFF0000 · UART RX RO 0xFFFF0004]` |
| `0xFFFF0008` | 4 B  | Read   | `UART_TX_READY` | Bit 0 = 1 when `UART_TX` is ready to receive data (always returns `1`). | `[UART TX READY RO 0xFFFF0008 · UART TX WO 0xFFFF000C]` |
| `0xFFFF000C` | 4 B  | Write  | `UART_TX` | Writing an 8-bit character transmits it to the UART TX output terminal. | `[UART TX READY RO 0xFFFF0008 · UART TX WO 0xFFFF000C]` |
| `0xFFFF0020` | 4 B  | Write  | `OLED_COL` | Pixel column index ($0..95$). | `[OLED COL WO 0xFFFF0020 · OLED ROW WO 0xFFFF0024]` |
| `0xFFFF0024` | 4 B  | Write  | `OLED_ROW` | Pixel row index ($0..63$). | `[OLED COL WO 0xFFFF0020 · OLED ROW WO 0xFFFF0024]` |
| `0xFFFF0028` | 4 B  | Write  | `OLED_DATA` | Writing color word sets pixel at `(COL, ROW)` & triggers advance mode. | `[OLED DATA WO 0xFFFF0028 · OLED CTRL WO 0xFFFF002C]` |
| `0xFFFF002C` | 4 B  | Write  | `OLED_CTRL` | Control mode (bits `[3:0]` advance mode, bits `[7:4]` color format). | `[OLED DATA WO 0xFFFF0028 · OLED CTRL WO 0xFFFF002C]` |
| `0xFFFF0040` | 4 B  | Read   | `ACCEL_DATA` | Packed 32-bit `[31:24] Temp, [23:16] Z, [15:8] Y, [7:0] X`. | `[ACCEL DATA RO 0xFFFF0040 · ACCEL DREADY RO 0xFFFF0044]` |
| `0xFFFF0044` | 4 B  | Read   | `ACCEL_DREADY` | Bit 0 = 1 when new reading is available. | `[ACCEL DATA RO 0xFFFF0040 · ACCEL DREADY RO 0xFFFF0044]` |
| `0xFFFF0060` | 4 B  | Write  | `PERIPH_LED` | User Output LEDs (bits `[7:0]`). | `[LED WO 0xFFFF0060 · DIP RO 0xFFFF0064]` |
| `0xFFFF0064` | 4 B  | Read   | `PERIPH_DIP` | 16-bit DIP Switch inputs (`SW15`..`SW0`). | `[LED WO 0xFFFF0060 · DIP RO 0xFFFF0064]` |
| `0xFFFF0068` | 4 B  | Read   | `PERIPH_PB` | Push Buttons (Bit 2=BTNL, Bit 1=BTNC, Bit 0=BTNR). | `[PB RO 0xFFFF0068]` |
| `0xFFFF0080` | 4 B  | Write  | `PERIPH_SEVENSEG` | 32-bit value displayed as 8 hex digits on the 7-Segment display. | `[7SEG WO 0xFFFF0080]` |
| `0xFFFF00A0` | 4 B  | Read   | `CYCLECOUNT` | Cycles elapsed since system reset (`totalCycles`). | `[CYCLECOUNT RO 0xFFFF00A0]` |

### 5.2 Dynamic Memory Segments & Verilog Dumps
- **Custom Base Addresses (`🗺 Segments…`)**: Configurable base addresses for Code (`0x10000`), Data (`0x20000`), Stack (`0x30000`), and MMIO (`0xFFFF0000`). Applying changes triggers automatic re-assembly and memory view re-indexing.
- **Verilog `.mem` File Generation**:
  - Code segment dumps to **`AA_IROM.mem`** (`💾 Dump txt`).
  - Data segment dumps to **`AA_DMEM.mem`** (`💾 Dump data`).
  - Address headers are formatted as `// @<HEX_ADDR>` to support relative addressing in Verilog testbenches.

---

## 6. Keyboard Shortcuts Reference

| Shortcut | Action | Scope |
|----------|--------|-------|
| `F5` | Toggle Run / Pause / Resume | Global |
| `F8` | Single Step Forward | Global |
| `Shift+F8` | Step Back (Undo Instruction) | Global |
| `F9` | Toggle Breakpoint at Cursor Line | Global |
| `Ctrl+Enter` / `Cmd+Enter` | Assemble Source Program | Global |
| `Ctrl+S` / `Cmd+S` | Save Source File (`.asm`) | Global |
| `Ctrl+F` / `Cmd+F` | Open Find & Replace (Focus Find) | Editor |
| `Ctrl+H` / `Cmd+H` | Open Find & Replace (Focus Replace) | Editor |
| `Esc` | Close Find & Replace Panel | Editor |
| `Enter` / `Shift+Enter` | Next / Previous Search Match | Find Box |
| `Alt+C` | Toggle Case-Sensitive Search | Find Box |
| `Ctrl+/` / `Cmd+/` | Toggle Line / Block `# ` Comment | Editor |
| `Tab` / `Shift+Tab` | Indent / Dedent Selected Lines | Editor |
| `Alt+Up` / `Alt+Down` | Move Line(s) Up / Down | Editor |
| `Shift+Alt+Down` / `Ctrl+Shift+D` | Duplicate Line(s) Down | Editor |
| `Ctrl+Z` / `Ctrl+Y` | Undo / Redo with Cursor Tracking | Editor |

---

## 7. Version History (v1.0 – v10.0)

| Version | Milestone Description & Features Implemented |
|---------|----------------------------------------------|
| **v1.0 – v6.0** | Basic RV32GC simulator core, two-pass assembler, non-blocking engine, Nexys 4 FPGA LEDs/DIP switches/buttons/7-segment, UART Serial Console, escape sequence parser, and double-height dual-rectangle 3D DIP switches. |
| **v7.0** | 96x64 Pixel OLED Display MMIO Peripheral (`0xFFFF0020`–`0xFFFF002C`) with 3 color formats, 5 trigger/autoadvance modes, and 3x scale HTML5 pixelated canvas renderer. |
| **v8.0** | **3-Axis Accelerometer & Temp Sensor (`0xFFFF0040`–`0xFFFF0044`) & Cycle Counter (`0xFFFF00A0`)**: Implemented 32-bit packed `ACCEL_DATA` (`[31:24] Temp`, `[23:16] Z`, `[15:8] Y`, `[7:0] X`), `ACCEL_DREADY`, and `CYCLECOUNT`. Added 3 interactive X, Y, Z range sliders (-128 to +127, $\pm 2g$), temperature slider (-40 to +85°C), preset buttons (`Flat`, `Tilt X`, `Tilt Y`, `Shake`, `Zero All`), byte read access for `lbu`/`lb`, and Memory View row descriptors. |
| **v9.0** | **Advanced Plain JS Editor & UI Refinements**: In-editor Find & Replace (`Ctrl+F`/`Ctrl+H`) with real-time match counting and token-aware match glow (`<mark>`), smart auto-indent, multi-line Tab/Shift+Tab, comment toggling (`Ctrl+/`), line moving/duplication, bracket auto-closing, and undo/redo history. Re-calibrated peripheral compactness (~10%). |
| **v10.0** | **Morphing Run/Pause Control, Hardware-Accurate Stack Pointer, & Verilog Dumps**: Unified dynamic `#runPauseBtn` with inactive assemble state, hardware-accurate SP initialization (`x2 = 0x0` on reset), dynamic segment re-assembly, `Circle_delay_accel.asm` example integration, `AA_IROM.mem` / `AA_DMEM.mem` memory dump naming with `// @` address comments, vector SVG microchip branding, and embedded SVG favicon. |
