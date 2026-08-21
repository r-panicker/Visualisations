# NUS-CG3207 RISC-V Simulator (RV32GC) — Technical Specification & Architecture Manual

## 1. Project Overview

**NUS-CG3207 RISC-V Simulator** is a high-performance, single-file web application (`riscv_simulator.html`) that delivers a full-featured **RISC-V RV32GC (RV32I + M + A + F + D + C) Assembler, Emulator, and Visual Debugger**.
Available at [https://nus-cg3207.github.io/labs](https://nus-cg3207.github.io/labs). Vibe coded by Rajesh Panicker.

Designed for computer engineering students, hardware architects, and embedded systems developers, the tool combines a syntax-highlighted assembly code editor with advanced plain-JS editing capabilities, two-pass assembler, non-blocking execution engine, real-time disassembly viewer, step-by-step debugger with back-stepping history, interactive memory explorer with custom segment mapping, configurable instruction cycle timing, a hardware-accurate simulation of the **Digilent Nexys 4 FPGA Board**, a standard 16550 **UART Serial Console**, a **96x64 Pixel OLED Display MMIO Peripheral**, a **3-Axis Accelerometer & Temperature Sensor**, a **System Cycle Counter**, support for standard **RARS `ecall` Syscalls**, and pre-loaded RISC-V assembly example programs (`rars_syscalls.asm`, `Circle_delay_accel.asm`, `DIP_to_LED.asm`, `HelloWorld.asm`, `HelloWorld_jal_jalr.asm`, etc.).

---

## 2. Architecture & Design System

### 2.1 Technology Stack & Core Philosophy
- **Zero External Dependencies**: Pure HTML5, CSS3, and modern Vanilla JavaScript (ES6+). Runs completely client-side in all modern web browsers.
- **Theme & Aesthetics**: Dark mode theme inspired by the *Catppuccin Macchiato/Mocha* palette (`#1e1e2e` base, `#181825` mantle, `#313244` surface, `#cba6f7` mauve primary accents, `#89b4fa` blue highlights).
- **Responsive Layout**: Resizable two-pane layout using a custom draggable divider (`.splitter`). Optimized for desktop and mobile viewports.
- **Embedded Favicon & Architecture Microchip Icon**: Custom vector SVG microchip architecture icon and embedded data URI SVG favicon in `<head>`, displaying an integrated circuit package with central silicon die, gold bonding I/O pins, and central `RV` (RISC-V) core logo.
- **Unified Toolbar Controls**: Every button in the main toolbar is styled with `display: inline-flex; height: 28px; line-height: 28px; box-sizing: border-box;` ensuring uniform vertical alignment across standard buttons and icon controls.

### 2.2 Stacked Code Editor Architecture
- **Dual-Layer Overlay**: Synchronized line numbers and custom syntax highlighting (`.highlight-layer`) positioned directly beneath a transparent `<textarea>` input layer.
- **Pixel-Perfect Line Gutter & Bottom Scroll Alignment**: Standardized block rendering (`display: block; height: 20px !important; line-height: 20px !important; box-sizing: border-box !important;`) with `-webkit-text-size-adjust: 100% !important`, `tab-size: 4`, `white-space: pre !important`, `word-wrap: normal !important`, and `font-variant-ligatures: none !important`. Both the line-numbers container and the syntax highlight layer include bottom scroll headroom spacers (`height: 120px`), preventing early browser scroll clamping when the `<textarea>` has horizontal scrollbars or bottom clearance margins, ensuring 1:1 pixel alignment across top, middle, and bottom lines.
- **CSS Breakpoint Badges**: High-visibility 6px circular pink badges (`.bp-line::after`) indicating active line breakpoints without inflating font metrics.

### 2.3 Advanced Plain JavaScript Editor Features
- **In-Editor Floating Autocomplete & Live Guidance (RARS-Style IntelliSense)**:
  - **Context-Aware Grammar Position Detection**:
    - **Mnemonic Position**: When starting a line or statement (e.g. `sw`, `addi`, `j`, `.word`), autocomplete prioritizes and offers matching RV32I/M/F/D/A instructions, pseudo-instructions, and assembler directives with full syntax signatures and operation descriptions.
    - **Operand Position & Active Instruction Locking**: Once a mnemonic is established on the line (e.g. after typing `sw ` or `addi `), autocomplete automatically locks to the active instruction (e.g. displaying `sw rs2, offset(rs1) | sw rs2, symbol[, rt]`) and exclusively filters suggestions to **Registers** (`x0`–`x31`, `f0`–`f31`, `zero`, `ra`, `sp`, `gp`, `tp`, `t0`–`t6`, `s0`–`s11`, `a0`–`a7`), **Labels**, and **Equates**. When typing `sw x`, it accurately matches `x0`, `x1`, `x2`, etc., and completely suppresses unrelated mnemonics like `xor`.
    - **Load & Store Pseudo-Instruction Support**: Comprehensive guidance and full assembler execution support for:
      - `lw rd, symbol` and `lw rd, symbol, rt` (expands to `lui` + `lw`)
      - `sw rs2, symbol` and `sw rs2, symbol, rt` (expands to `lui` + `sw` using auto or explicit temporary register)
      - `lb rd, symbol`, `lh rd, symbol`, `lbu rd, symbol`, `lhu rd, symbol`
      - `sb rs2, symbol[, rt]`, `sh rs2, symbol[, rt]`
      - Address pseudos: `la rd, symbol`, `lla rd, symbol`, `lga rd, symbol`
      - Floating-point pseudos: `fmv.s`, `fneg.s`, `fabs.s`, `fmv.d`, `fneg.d`, `fabs.d`
      - Integer pseudos: `li`, `mv`, `not`, `neg`, `negw`, `sext.w`, `seqz`, `snez`, `sltz`, `sgtz`, `j`, `jr`, `ret`, `call`, `tail`, `beqz`, `bnez`, `blez`, `bgez`, `bltz`, `bgtz`, `bgt`, `ble`, `bgtu`, `bleu`, `nop`
    - **Branch & Jump Label Prioritization**: For control flow instructions (`j`, `jal`, `beq`, `bne`, `la`, `call`), user-defined labels and equates are given priority.
  - **Live Label & Equate Autocomplete**: Dynamically scans user code for declared labels (`main:`, `loop:`, `delay:`) and symbolic equates (`.equ LED_ADDR, 0xFFFF0060`, `N = 10`), offering them as completion items with dedicated badges (`[label]`, `[equ]`, `[inst]`, `[pseudo]`, `[dir]`, `[reg]`).
  - **Full Keyboard Navigation**: `ArrowDown` / `ArrowUp` to navigate suggestions, `Enter` / `Tab` to insert the selected item, `Escape` to dismiss, and `Ctrl+Space` to manually invoke completion anywhere.
  - **Context-Aware Guards**: Autocomplete is intelligently suppressed inside comments (`# ...`) and quoted strings (`"..."`).
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

### 2.4 Intelligent & Logical UX Button State Lifecycle Management
To ensure a clean, intuitive, and error-proof user experience, all interactive action buttons in the simulator toolbar, floating find panel, and peripheral consoles dynamically track runtime and editor state:

- **Assemble (`#btnAssemble`)**:
  - **Modified / Freshly Loaded Code**: Active/enabled (`"Assemble and load program into memory (Ctrl+Enter)"`).
  - **Assembled & Up-to-Date**: Disabled/inactive (`opacity: 0.45; cursor: not-allowed;` with tooltip `"Program is already assembled and up to date"`). Re-enables only when the user edits the source code or loads a different file/example.
- **Undo (`#btnUndo`) & Redo (`#btnRedo`)**:
  - **Undo**: Inactive/disabled when `history.currentIndex <= 0` (no edits made or initial state). Active with tooltip `"Undo last edit (Ctrl+Z)"` when undoable edits exist.
  - **Redo**: Inactive when `history.currentIndex >= history.length - 1` (at newest head). Active with tooltip `"Redo last undone edit (Ctrl+Y)"` when redoable states are available.
- **Run / Pause / Resume (`#runPauseBtn`)**:
  - **Standard Harmonious Styling**: Styled identically to all other toolbar buttons (`#313244` background, hover `#45475a`, `#cdd6f4` text), maintaining equal visual hierarchy alongside Step, Back, Reset, and Assemble.
  - **Unassembled / Modified**: Inactive (`disabled`, `opacity: 0.45`, tooltip: `"Please assemble the program first (⚙ Assemble or Ctrl+Enter) before running"`).
  - **Assembled & Paused (Initial)**: Active `▶ Run` (tooltip: `"Run assembled program (F5)"`).
  - **Running**: Active `⏸ Pause` (tooltip: `"Pause program execution (F5)"`).
  - **Paused Mid-Execution**: Active `▶ Resume` (tooltip: `"Resume execution from line <N> (F5)"`).
  - **Program Finished**: Active `▶ Run` (tooltip: `"Run program from start (F5)"`).
- **Step Forward (`#btnStep`)**:
  - Inactive when not assembled, when running, or when execution has reached `programFinished`. Active with tooltip `"Single step forward (F8)"` when assembled and paused.
- **Step Back (`#btnBack`)**:
  - Inactive when not assembled, when running, or when execution history is empty (`execHistory.length === 0`). Active with tooltip `"Step back 1 instruction (<N> step(s) available) (Shift+F8)"` once at least one instruction step has executed.
- **Reset (`#btnReset`) & Post-Reset Assembled State**:
  - **Inactive at Origin**: Disabled when at pristine start with 0 instructions executed (`instructionCount === 0 && execHistory.length === 0`).
  - **Active During Execution**: Enables once execution begins (stepping or running).
  - **Assembling NOT Required After Reset**: Clicking Reset reloads the compiled machine code into memory, resets registers and peripherals, and maintains `assembled = true`. The user can immediately click `▶ Run` or `⏭ Step` without re-assembling.
- **Verilog Memory Dumps (`#btnDumpTxt` / `#btnDumpData`)**:
  - Inactive when not assembled; active once valid machine code and data memory are assembled.
- **Find & Replace Actions (`#findPrevBtn`, `#findNextBtn`, `#findReplaceBtn`, `#findReplaceAllBtn`)**:
  - Inactive when there are 0 search matches in the editor; active when 1 or more matches are found.
- **UART Clear (`#uartClearBtn`)**:
  - Inactive when serial terminal buffer is empty; active when terminal output is present.

---

## 3. Processor Execution State & RARS Syscalls

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

### 3.2 Standard RARS `ecall` Syscall Services
The simulator implements the standard RARS/MARS syscall table using the `ecall` instruction.
- **Service Number**: Specified in register `a7` (`x17`).
- **Arguments**: Passed in registers `a0` (`x10`), `a1` (`x11`), `fa0` (`f10`).
- **Return Values**: Returned in registers `a0` / `fa0`.
- **Output Destination**: Syscall printing outputs directly to the **Execution Status & Log Console Window** (`#console`), cleanly distinguished from the UART terminal MMIO interface.

> [!NOTE]
> **Practical Hardware Note**: In practical computer systems, using `ecall` for I/O and printing requires operating system kernel support and an Interrupt Service Routine (ISR) trap handler. The simulator emulates these services directly for educational convenience.

| Syscall Code (`a7`) | Name | Inputs | Outputs / Effects | Destination |
|---------------------|------|--------|-------------------|-------------|
| `1` | `PrintInt` | `a0` = integer to print | Prints decimal integer | Status Log Console |
| `2` | `PrintFloat` | `fa0` = single-precision float | Prints float value | Status Log Console |
| `3` | `PrintDouble` | `fa0` = double-precision float | Prints double value | Status Log Console |
| `4` | `PrintString` | `a0` = address of null-terminated string | Prints null-terminated string | Status Log Console |
| `5` | `ReadInt` | None | `a0` = integer entered by user | User Input Prompt |
| `6` | `ReadFloat` | None | `fa0` = float entered by user | User Input Prompt |
| `7` | `ReadDouble` | None | `fa0` = double entered by user | User Input Prompt |
| `8` | `ReadString` | `a0` = destination buffer, `a1` = max length | Reads string into memory at `a0` | User Input Prompt |
| `9` | `Sbrk` | `a0` = number of bytes to allocate | `a0` = address of allocated block | Dynamic Heap |
| `10` | `Exit` | None | Halts execution cleanly | Execution Engine |
| `11` | `PrintChar` | `a0` = ASCII character code | Prints character | Status Log Console |
| `12` | `ReadChar` | None | `a0` = ASCII character code | User Input Prompt |
| `34` | `PrintIntHex` | `a0` = integer | Prints `0x...` hexadecimal string | Status Log Console |
| `35` | `PrintIntBinary` | `a0` = integer | Prints `0b...` binary string | Status Log Console |
| `36` | `PrintIntUnsigned` | `a0` = unsigned integer | Prints unsigned decimal value | Status Log Console |
| `40` | `MilliSleep` | `a0` = milliseconds to delay | Pauses execution delay | Simulator Timer |
| `93` | `Exit2` | `a0` = exit return code | Halts execution with return code | Execution Engine |

### 3.3 Unified Morphing Run / Pause Button
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
|  Line 2: [☑ Buffer] [ 10 ▲▼ ] instr delay  ·  RX Queue: 0 bytes (empty) (wraps locally)          |
|                                                                                                   |
|  OLED 96x64 Pixel Display (0xFFFF0020–0xFFFF002C)              [ Clear Display ]                  |
|  [ 288x192 3x Pixelated Canvas ]   OLED_COL: 0 (0-95)  ·  OLED_ROW: 0 (0-63)  ·  OLED_CTRL: 0x00   |
|                                    Mode: vary_pixel_data_mode  ·  Format: 8-bit (3R-3G-2B)        |
|                                                                                                   |
|  3-Axis Accelerometer & Temp (0xFFFF0040–0xFFFF0044)           DREADY: 1  ·  Cycles: 1234          |
|  X Axis: [----|----] 0 (0x00, +0.00g)   Y Axis: [----|----] 0 (0x00, +0.00g)                      |
|  Z Axis: [----|--O-] 64 (0x40, +1.00g)   Temp:   [---|-----] 25°C (0x19)                           |
|  Presets: [Flat (Z=+1g)] [Tilt X (±1g)] [Tilt Y (±1g)] [Shake (±2g)] [Zero All]                   |
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
  - **Packing Specification**: `{temperature, X, Y, Z}` from **MSB down to LSB**:
    - Bits `[31:24]`: **Temperature** (8-bit signed integer, $-40..+85^\circ\text{C}$, default `25` / `0x19`, byte offset `+3`).
    - Bits `[23:16]`: **X Acceleration** (8-bit signed integer, $\pm 2g$ range, default `0` / `0x00` = $0.00g$, byte offset `+2`).
    - Bits `[15:8]`: **Y Acceleration** (8-bit signed integer, $\pm 2g$ range, default `0` / `0x00` = $0.00g$, byte offset `+1`).
    - Bits `[7:0]`: **Z Acceleration** (8-bit signed integer, $\pm 2g$ range, default `+64` / `0x40` = $+1.00g$, byte offset `+0`).
  - **Byte Access Support**: Individual byte reads via `lbu` / `lb` at offset `+0` (Z), `+1` (Y), `+2` (X), and `+3` (Temp).
- **`0xFFFF0044` (RO)**: `ACCEL_DREADY` — Bit 0 = 1 when a new accelerometer reading is ready.
- **Interactive UI Sliders & Toggle Presets**: Includes 3 range sliders for X, Y, Z ($\pm 128$), temperature slider, live $g$-force calculation, and toggle preset buttons:
  - `Flat (Z=+1g)`: Sets $Z = +64 (+1.00g)$, $X = 0$, $Y = 0$.
  - `Tilt X (±1g)`: Toggles between $+64 (+1.00g)$ and $-64 (-1.00g)$.
  - `Tilt Y (±1g)`: Toggles between $+64 (+1.00g)$ and $-64 (-1.00g)$.
  - `Shake (±2g)`: Sets alternating extreme accelerations.
  - `Zero All`: Resets all axes to $0.00g$.

### 4.2 Cycle Count Register (`0xFFFF00A0`)
- **`0xFFFF00A0` (RO)**: `CYCLECOUNT` — Returns total instruction cycles elapsed since system reset (`totalCycles`).

### 4.3 96x64 Pixel OLED Display Peripheral (`0xFFFF0020`–`0xFFFF002C`)
- **Display Resolution**: 96 Columns $\times$ 64 Rows ($288\text{px} \times 192\text{px}$ canvas at 3x scale).
- **Internal Frame Buffer**: 6,144-pixel built-in frame buffer.
- **Modes**: 3 color formats (8-bit 3R-3G-2B, 16-bit 5R-6G-5B, 24-bit RGB) and 5 trigger/autoadvance modes (`vary_pixel_data_mode`, `vary_col_mode`, `vary_row_mode`, `autoadvance_col`, `autoadvance_row`).

### 4.4 UART Serial Console (`0xFFFF0000`–`0xFFFF000C`)
- Memory-mapped serial terminal operating independently from the status log window.
- Writing to `UART_TX` (`0xFFFF000C`) outputs strictly to the UART terminal display without mirroring characters into the lower status log.
- Localized responsive flex wrapping prevents `RX Queue: 0 bytes (empty)` from overflowing container bounds on narrow mobile screens.

---

## 5. Memory Model & Segment Mapping

### 5.1 Complete MMIO Address Map
| MMIO Address | Size | Access | Symbol | Description & Behavioral Rules | Row Annotation in Memory View |
|--------------|------|--------|--------|--------------------------------|-------------------------------|
| `0xFFFF0000` | 4 B  | Read   | `UART_RX_VALID` | Bit 0 = 1 if data is available in `UART_RX` queue (`uartRxQueue.length > 0`). | `[UART RX VALID RO 0xFFFF0000 · UART RX RO 0xFFFF0004]` |
| `0xFFFF0004` | 4 B  | Read   | `UART_RX` | Reading returns and pops the next 8-bit character from `uartRxQueue`. | `[UART RX VALID RO 0xFFFF0000 · UART RX RO 0xFFFF0004]` |
| `0xFFFF0008` | 4 B  | Read   | `UART_TX_READY` | Bit 0 = 1 when `UART_TX` is ready to receive data (always returns `1`). | `[UART TX READY RO 0xFFFF0008 · UART TX WO 0xFFFF000C]` |
| `0xFFFF000C` | 4 B  | Write  | `UART_TX` | Writing an 8-bit character transmits it to the UART TX terminal. | `[UART TX READY RO 0xFFFF0008 · UART TX WO 0xFFFF000C]` |
| `0xFFFF0020` | 4 B  | Write  | `OLED_COL` | Pixel column index ($0..95$). | `[OLED COL WO 0xFFFF0020 · OLED ROW WO 0xFFFF0024]` |
| `0xFFFF0024` | 4 B  | Write  | `OLED_ROW` | Pixel row index ($0..63$). | `[OLED COL WO 0xFFFF0020 · OLED ROW WO 0xFFFF0024]` |
| `0xFFFF0028` | 4 B  | Write  | `OLED_DATA` | Writing color word sets pixel at `(COL, ROW)` & triggers advance mode. | `[OLED DATA WO 0xFFFF0028 · OLED CTRL WO 0xFFFF002C]` |
| `0xFFFF002C` | 4 B  | Write  | `OLED_CTRL` | Control mode (bits `[3:0]` advance mode, bits `[7:4]` color format). | `[OLED DATA WO 0xFFFF0028 · OLED CTRL WO 0xFFFF002C]` |
| `0xFFFF0040` | 4 B  | Read   | `ACCEL_DATA` | Packed 32-bit `[31:24] Temp, [23:16] X, [15:8] Y, [7:0] Z`. | `[ACCEL DATA RO 0xFFFF0040 · ACCEL DREADY RO 0xFFFF0044]` |
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

## 7. Version History (v1.0 – v13.0)

| Version | Milestone Description & Features Implemented |
|---------|----------------------------------------------|
| **v1.0 – v6.0** | Basic RV32GC simulator core, two-pass assembler, non-blocking engine, Nexys 4 FPGA LEDs/DIP switches/buttons/7-segment, UART Serial Console, escape sequence parser, and double-height dual-rectangle 3D DIP switches. |
| **v7.0** | 96x64 Pixel OLED Display MMIO Peripheral (`0xFFFF0020`–`0xFFFF002C`) with 3 color formats, 5 trigger/autoadvance modes, and 3x scale HTML5 pixelated canvas renderer. |
| **v8.0** | **3-Axis Accelerometer & Temp Sensor (`0xFFFF0040`–`0xFFFF0044`) & Cycle Counter (`0xFFFF00A0`)**: Implemented 32-bit packed `ACCEL_DATA`, `ACCEL_DREADY`, and `CYCLECOUNT`. Added interactive X, Y, Z range sliders (-128 to +127, $\pm 2g$), temperature slider (-40 to +85°C), preset buttons, byte read access for `lbu`/`lb`, and Memory View row descriptors. |
| **v9.0** | **Advanced Plain JS Editor & UI Refinements**: In-editor Find & Replace (`Ctrl+F`/`Ctrl+H`) with real-time match counting and token-aware match glow (`<mark>`), smart auto-indent, multi-line Tab/Shift+Tab, comment toggling (`Ctrl+/`), line moving/duplication, bracket auto-closing, and undo/redo history. Re-calibrated peripheral compactness (~10%). |
| **v10.0** | **Morphing Run/Pause Control, Hardware-Accurate Stack Pointer, & Verilog Dumps**: Unified dynamic `#runPauseBtn` with inactive assemble state, hardware-accurate SP initialization (`x2 = 0x0` on reset), dynamic segment re-assembly, `Circle_delay_accel.asm` example integration, `AA_IROM.mem` / `AA_DMEM.mem` memory dump naming with `// @` address comments, vector SVG microchip branding, and embedded SVG favicon. |
| **v11.0** | **RARS Syscalls Engine, Corrected Accelerometer Packing `{temp, X, Y, Z}`, & Mobile Polish**: Implemented full RARS `ecall` syscall table (print/read int, float, double, string, char, sbrk, hex, bin, unsigned, sleep, exit/exit2) with status log destination, corrected 32-bit `ACCEL_DATA` packing `{temperature, X, Y, Z}` MSB downto LSB, added toggleable Tilt `±1g` presets, fixed UART TX duplicate logging to status window, standardized mobile line height & font metrics to eliminate baseline drift, and enabled local wrapping for UART RX queue info. |
| **v12.0** | **Intelligent & Logical UX Button State Lifecycle Management**: Full dynamic active/inactive lifecycle states for Undo, Redo, Run/Pause/Resume, Step forward, Step back, Reset, Memory Dumps (`AA_IROM.mem` / `AA_DMEM.mem`), Find & Replace actions, and UART Clear with informative hover tooltips and accessibility styles (`opacity: 0.45`, `cursor: not-allowed`). Reset becomes active only after execution begins (Run/Step); Back Step activates only when historical states exist; Undo/Redo reflect editor stack depth. |
| **v13.0** | **In-Editor IntelliSense Autocomplete, Extended Pseudo-Instructions (`lw`/`sw`/`lla`/`lga`/FP), & Header Banner Attribution**: Context-aware grammar position detection (Mnemonic vs Operand), active instruction locking on operands (e.g. `sw rs2, offset(rs1)` pinned at top while typing registers, suppressing false mnemonic matches), full 32-register completion, user-defined labels/equates autocomplete, multi-line load/store pseudo-instruction expansion (`lw rd, symbol[, rt]`, `sw rs2, symbol[, rt]`, `sb`, `sh`, `sd`, `lb`, `lh`, `lbu`, `lhu`, `lla`, `lga`, FP pseudos `fmv.s`/`fneg.s`/`fabs.s`/`fmv.d`/`fneg.d`/`fabs.d`), bottom scroll headroom spacer (120px) preventing line gutter clamping, and top header banner attribution (`https://nus-cg3207.github.io/labs. Vibe coded by Rajesh Panicker.`). |
| **v14.0** | **High-Speed Execution Engine & Optimized Example Animation**: Optimized batch execution loop with $O(1)$ `pcToLineMap` line resolution (eliminating linear `machineCode` scans on every cycle), optimized direct byte/word memory indexing in `readMem`/`writeMem`, detached DOM layout/canvas repaints from MMIO pixel writes into frame-based batched updates (`CHUNK_SIZE = 100,000`), cached `ImageData` buffer reuse in `updateOledCanvas`, tuned delay (`li s4, 50`), and commented out UART debug writes in `Circle_delay_accel.asm` for real-time 60 FPS visual rendering. |
