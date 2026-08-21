# NUS-CG3207 RISC-V Simulator v2 (RV32GC) — Technical Specification & Architecture Manual

## 1. Project Overview

**NUS-CG3207 RISC-V Simulator v2** is a next-generation, high-performance, single-file web application (`riscv_simulatorv2.html`) that delivers a full-featured **RISC-V RV32GC (RV32I + M + A + F + D + C) Assembler, Emulator, and Visual Debugger**, powered by **CodeMirror 6** (the latest modern modular code editor engine).
Available at [https://nus-cg3207.github.io/labs](https://nus-cg3207.github.io/labs). Vibe coded by Rajesh Panicker.

Designed for computer engineering students, hardware architects, and embedded systems developers, Simulator v2 combines a modern CodeMirror 6 assembly editor with custom RISC-V syntax highlighting, live parameter signature help, hover inspection, breakpoint gutter with highlighted line numbers and smart snapping, two-pass assembler, non-blocking execution engine, real-time disassembly viewer, step-by-step debugger with back-stepping history, interactive memory explorer with custom segment mapping, configurable instruction cycle timing, a hardware-accurate simulation of the **Digilent Nexys 4 FPGA Board**, a standard 16550 **UART Serial Console**, a **96x64 Pixel OLED Display MMIO Peripheral**, a **3-Axis Accelerometer & Temperature Sensor**, a **System Cycle Counter**, support for standard **RARS `ecall` Syscalls**, and pre-loaded RISC-V assembly example programs (`rars_syscalls.asm`, `Circle_delay_accel.asm`, `DIP_to_LED.asm`, `HelloWorld.asm`, `HelloWorld_jal_jalr.asm`, `fibonacci.asm`, `factorial.asm`, `loop_array.asm`, `io_mext.asm`, `basic.asm`).

---

## 2. Architecture & Design System

### 2.1 Technology Stack & Core Philosophy
- **Zero External Dependencies / 100% Offline**: Pure HTML5, CSS3, and modern Vanilla JavaScript (ES6+) with an embedded, self-contained CodeMirror 6 bundle (`window.CM6`). Runs completely client-side in all modern web browsers without internet access or external CDNs.
- **Theme & Aesthetics**: Dark mode theme inspired by the *Catppuccin Mocha* palette (`#1e1e2e` base, `#181825` mantle, `#313244` surface, `#cba6f7` mauve primary accents, `#89b4fa` blue keywords, `#a6e3a1` green registers/strings, `#f5c2e7` pink directives, `#fab387` peach labels, `#f9e2af` yellow immediates, `#6c7086` gray comments).
- **Responsive Layout**: Resizable two-pane layout using a custom draggable divider (`.splitter`). Optimized for desktop, tablet, and mobile viewports.
- **Embedded Favicon & Microchip Branding**: Custom vector SVG microchip architecture icon and embedded data URI SVG favicon in `<head>`, displaying an integrated circuit package with central silicon die, gold bonding I/O pins, and central `RV` (RISC-V) core logo.
- **Unified Toolbar Controls**: Uniform button heights (`28px`) and vertical alignment across standard buttons, icon controls, and dropdown selectors.

---

### 2.2 CodeMirror 6 Editor Architecture

Simulator v2 replaces the legacy dual-layer stacked textarea with a state-of-the-art **CodeMirror 6** editor architecture mounted directly in `<div id="cmEditorContainer"></div>`:

#### 1. Embedded Standalone CM6 Bundle (`window.CM6`)
Contains all necessary CodeMirror 6 and Lezer packages compiled into a single IIFE bundle:
- `@codemirror/state`: `EditorState`, `StateField`, `StateEffect`, `RangeSet`, `RangeSetBuilder`, `EditorSelection`, `Transaction`, `Facet`, `Compartment`.
- `@codemirror/view`: `EditorView`, `GutterMarker`, `gutter`, `lineNumbers`, `lineNumberMarkers`, `highlightActiveLine`, `highlightActiveLineGutter`, `showTooltip`, `hoverTooltip`, `drawSelection`, `dropCursor`.
- `@codemirror/language`: `StreamLanguage`, `HighlightStyle`, `syntaxHighlighting`, `bracketMatching`.
- `@codemirror/commands`: `history`, `historyKeymap`, `defaultKeymap`, `indentWithTab`, `indentMore`, `indentLess`, `undo`, `redo`.
- `@codemirror/search`: `openSearchPanel`, `closeSearchPanel`, `findNext`, `findPrevious`, `replaceNext`, `replaceAll`.
- `@codemirror/autocomplete`: `autocompletion`, `completionKeymap`, `startCompletion`, `closeCompletion`, `acceptCompletion`.
- `@lezer/highlight`: `tags` (keyword, variableName, meta, labelName, comment, number, string, punctuation, operator, propertyName).

#### 2. Custom RISC-V Assembly Syntax Tokenizer & Highlight Style
A specialized `StreamLanguage` tokenizer (`riscvStreamParser`) parses RISC-V assembly code token-by-token:
- **Instructions**: RV32I base, RV32M multiply/divide, RV32A atomic, RV32F single-float, RV32D double-float, and standard pseudo-instructions (`li`, `la`, `mv`, `not`, `neg`, `j`, `jr`, `ret`, `call`, `tail`, `beqz`, `bnez`, etc.) $\rightarrow$ `#89b4fa` (Blue, font weight 600).
- **Registers**: Hardware (`x0`–`x31`, `f0`–`f31`) and ABI names (`zero`, `ra`, `sp`, `gp`, `tp`, `t0`–`t6`, `s0`–`s11`, `a0`–`a7`, `ft0`–`ft11`, `fs0`–`fs11`, `fa0`–`fa7`) $\rightarrow$ `#a6e3a1` (Green).
- **Assembler Directives**: `.text`, `.data`, `.globl`, `.word`, `.byte`, `.half`, `.ascii`, `.asciiz`, `.space`, `.align`, `.equ`, `.set`, `.bss` $\rightarrow$ `#f5c2e7` (Pink, font weight 600).
- **Labels**: Label definitions (`main:`, `.LBB0_1:`, `loop:`) $\rightarrow$ `#fab387` (Peach, bold).
- **Numbers / Immediates**: Hexadecimal (`0x...`, `0X...`) and decimal/signed integers $\rightarrow$ `#f9e2af` (Yellow).
- **Comments**: `# ...` and `; ...` $\rightarrow$ `#6c7086` (Italic gray).
- **Operators & Macros**: `%hi(...)`, `%lo(...)`, `%pcrel_hi(...)`, `%pcrel_lo(...)` $\rightarrow$ `#89dceb` (Cyan).
- **CSRs**: `mstatus`, `mie`, `mtvec`, `mepc`, `mcause`, `mtval`, `mip`, `cycle`, `time`, `instret` $\rightarrow$ `#cba6f7` (Mauve).

---

### 2.3 Visual Debugging & Breakpoint System

#### 1. Interactive Breakpoint Gutter with Drop-Shadow Glow
- Clickable breakpoint gutter (`.cm-breakpoint-gutter`) and line numbers margin.
- Active breakpoints display a vibrant red circular badge (`●`, `#f38ba8`) with soft drop-shadow glow.
- Synchronized bidirectionally with the simulator's internal `breakpoints` Set and the `F9` toggle shortcut.

#### 2. Highlighted Breakpoint Line Numbers
- When a breakpoint is set on a line, **the line number alone in the line numbers gutter is highlighted** with bold red text (`#f38ba8`), a soft red rounded background pill, and a text glow alongside the breakpoint dot marker (`●`).
- The code line itself remains un-tinted while editing/waiting so that there is no visual ambiguity, leaving full line highlighting exclusively for the active execution line when execution reaches or stops at that point.

#### 3. Smart Breakpoint Snapping to Next Valid Instruction
- If a user clicks or sets a breakpoint on a line that does not contain an executable instruction (e.g. comment lines `# ...`, directives like `.text`/`.data`/`.word`, blank lines, or bare labels `main:` without an instruction on the same line):
  - The simulator automatically resolves the line and **moves the breakpoint to the next valid executable instruction line**.
  - If the program is already assembled, it uses the exact assembler line-to-instruction mapping.
  - If not yet assembled, it parses source lines downwards to locate the next valid instruction.
  - The console status log provides clear feedback: `Breakpoint set at line X (moved from line Y to next valid instruction).`

#### 4. Unambiguous Execution Line Tracking (`cm-execLine`)
- When execution actually reaches a breakpoint (or during `Step (F8)`, `Back (Shift+F8)`, `Run (F5)`), the active instruction line is prominently highlighted with a blue background (`rgba(137, 180, 250, 0.18)`) and a 3px blue left accent border (`#89b4fa`), and automatically scrolls smoothly into view (`CM6.EditorView.scrollIntoView`).

---

### 2.4 Advanced Editing, IntelliSense & Guidance Features

#### 1. Context-Aware IntelliSense Autocomplete (`riscvAutocomplete`)
- **Mnemonic Position**: At the start of a statement, completions offer matching RV32I/M/A/F/D instructions, pseudo-instructions, and directives with full syntax formats and descriptions. Bare registers are suppressed.
- **Operand Position & Active Instruction Locking**: Once a mnemonic is established on the line (e.g. after typing `addi ` or `sw `):
  - Completions exclusively filter to **Registers** (`x0`–`x31`, `zero`, `ra`, `sp`, `a0`–`a7`), **Labels**, and **Equates**. Unrelated instruction mnemonics (like `xor` when typing `sw x`) are completely suppressed.
  - **Active Instruction Format Banner**: Every candidate's documentation panel features an active instruction header showing the parent instruction's format (e.g. `addi rd, rs1, imm`), description, and metadata, with the **active operand parameter highlighted** (e.g. `PARAM 1: rd`, `PARAM 2: rs1`, `PARAM 3: imm`).
  - **Jump/Branch Prioritization**: For control flow instructions (`j`, `jal`, `beq`, `bne`, `la`, `call`), user-defined labels and equates are boosted to the top of the completion list.
- **Automatic Triggering**: Automatically triggers while typing (`activateOnTyping: true`), or manually via `Ctrl+Space`.
- **Comment/String Guard**: Autocomplete is suppressed inside comments (`# ...`) and double-quoted strings (`"..."`).

#### 2. Live Signature Helper Floating Tooltip (`signatureHelpField`)
- While the cursor is in the operand section of any instruction (e.g. `addi |` or `sw x1, 4(|)`), a floating tooltip appears above the cursor displaying the instruction's signature with the **active parameter dynamically highlighted** in bold peach/cyan with an underline.

#### 3. Interactive Hover Tooltips (`riscvHoverTooltip`)
- Hovering the mouse over any instruction mnemonic, register name, directive, or declared label displays a styled documentation card with its syntax format, description, and encoding/line metadata.

#### 4. Precision Tab & Indentation Engine
- **In-line Tab Insertion**: When the cursor is collapsed (single cursor, normal typing, e.g. after a label `main:` or instruction `addi`), pressing `Tab` inserts a literal `\t` at the cursor position without shifting or auto-indenting the whole line.
- **Block Indentation**: When a block of text is selected, `Tab` indents the entire selection (`indentMore`), and `Shift+Tab` unindents (`indentLess`).
- **Completion Acceptance**: When the autocompletion dropdown is open, pressing `Tab` or `Enter` accepts the selected completion.

#### 5. Floating Find & Replace Panel (`Ctrl+F` / `Ctrl+H`)
- Real-time search match counter, next/previous navigation (`Enter` / `Shift+Enter`), case-sensitivity toggle (`Alt+C`), single replacement, and replace-all with full undo history tracking.

#### 6. Backward-Compatible Editor Facade
Provides a drop-in proxy object `window.editor` exposing `.value`, `.selectionStart`, `.selectionEnd`, `.scrollTop`, `.scrollLeft`, `.focus()`, and `.setSelectionRange()`, ensuring 100% backward compatibility with all simulator functions (`loadExample`, `loadFile`, `saveFile`, `assembleOnly`, `updateEditor`).

---

### 2.5 Intelligent UX Button State Lifecycle Management

All toolbar action buttons dynamically track runtime and editor state:
- **Assemble (`#btnAssemble`)**: Active when code is newly loaded or modified; inactive (`disabled`, tooltip: `"Program is already assembled and up to date"`) once assembled.
- **Undo (`#btnUndo`) & Redo (`#btnRedo`)**: Track CodeMirror 6's native transaction history depth via `CM6.undoDepth` and `CM6.redoDepth`.
- **Run / Pause / Resume (`#runPauseBtn`)**: Inactive when unassembled; shows `▶ Run` when ready; morphs into `⏸ Pause` while running; shows `▶ Resume` when paused mid-execution.
- **Step Forward (`#btnStep`) & Step Back (`#btnBack`)**: Step forward is active when assembled and paused; Step back is active whenever instruction execution history exists (`execHistory.length > 0`).
- **Reset (`#btnReset`)**: Active during execution; resets registers/peripherals while maintaining assembled status so the user can immediately step or run without re-assembling.

---

## 3. Processor Execution State & RARS Syscalls

### 3.1 Register Bank Structure
Models 32 32-bit integer registers (`x0`–`x31`), 32 floating-point registers (`f0`–`f31`), and the Program Counter (`PC`). Register `x0` is hardwired to `0x00000000`.
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

---

## 4. Peripherals & FPGA Board Simulation

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
- **`0xFFFF0040` (RO)**: `ACCEL_DATA` — 32-bit packed `{temperature, X, Y, Z}` from **MSB to LSB**:
  - `[31:24]`: **Temperature** (8-bit signed integer, $-40..+85^\circ\text{C}$, default `25` / `0x19`, offset `+3`).
  - `[23:16]`: **X Acceleration** (8-bit signed integer, $\pm 2g$, default `0` / `0x00` = $0.00g$, offset `+2`).
  - `[15:8]`: **Y Acceleration** (8-bit signed integer, $\pm 2g$, default `0` / `0x00` = $0.00g$, offset `+1`).
  - `[7:0]`: **Z Acceleration** (8-bit signed integer, $\pm 2g$, default `+64` / `0x40` = $+1.00g$, offset `+0`).
- **`0xFFFF0044` (RO)**: `ACCEL_DREADY` — Bit 0 = 1 when data is ready.
- **Interactive UI Sliders & Toggle Presets**: Range sliders for X, Y, Z ($\pm 128$), temperature slider, live $g$-force calculation, and toggle presets (`Flat`, `Tilt X ±1g`, `Tilt Y ±1g`, `Shake ±2g`, `Zero All`).

### 4.2 Cycle Count Register (`0xFFFF00A0`)
- **`0xFFFF00A0` (RO)**: `CYCLECOUNT` — Returns total instruction cycles elapsed since system reset (`totalCycles`).

### 4.3 96x64 Pixel OLED Display Peripheral (`0xFFFF0020`–`0xFFFF002C`)
- **Resolution**: 96 Columns $\times$ 64 Rows ($288\text{px} \times 192\text{px}$ canvas at 3x scale).
- **Modes**: 3 color formats (8-bit 3R-3G-2B, 16-bit 5R-6G-5B, 24-bit RGB) and 5 advance modes (`vary_pixel_data_mode`, `vary_col_mode`, `vary_row_mode`, `autoadvance_col`, `autoadvance_row`).

### 4.4 UART Serial Console (`0xFFFF0000`–`0xFFFF000C`)
- Memory-mapped serial terminal with independent output buffer, auto-sequencer delay, and responsive flex wrapping.

---

## 5. Memory Model & Segment Mapping

### 5.1 Complete MMIO Address Map
| MMIO Address | Size | Access | Symbol | Description & Behavioral Rules | Row Annotation in Memory View |
|--------------|------|--------|--------|--------------------------------|-------------------------------|
| `0xFFFF0000` | 4 B  | Read   | `UART_RX_VALID` | Bit 0 = 1 if data is available in `UART_RX` queue. | `[UART RX VALID RO 0xFFFF0000 · UART RX RO 0xFFFF0004]` |
| `0xFFFF0004` | 4 B  | Read   | `UART_RX` | Reading returns and pops next 8-bit character from queue. | `[UART RX VALID RO 0xFFFF0000 · UART RX RO 0xFFFF0004]` |
| `0xFFFF0008` | 4 B  | Read   | `UART_TX_READY` | Bit 0 = 1 when `UART_TX` is ready (always `1`). | `[UART TX READY RO 0xFFFF0008 · UART TX WO 0xFFFF000C]` |
| `0xFFFF000C` | 4 B  | Write  | `UART_TX` | Transmits 8-bit character to UART terminal. | `[UART TX READY RO 0xFFFF0008 · UART TX WO 0xFFFF000C]` |
| `0xFFFF0020` | 4 B  | Write  | `OLED_COL` | Pixel column index ($0..95$). | `[OLED COL WO 0xFFFF0020 · OLED ROW WO 0xFFFF0024]` |
| `0xFFFF0024` | 4 B  | Write  | `OLED_ROW` | Pixel row index ($0..63$). | `[OLED COL WO 0xFFFF0020 · OLED ROW WO 0xFFFF0024]` |
| `0xFFFF0028` | 4 B  | Write  | `OLED_DATA` | Writing color word sets pixel & triggers advance. | `[OLED DATA WO 0xFFFF0028 · OLED CTRL WO 0xFFFF002C]` |
| `0xFFFF002C` | 4 B  | Write  | `OLED_CTRL` | Control mode (bits `[3:0]` advance mode, bits `[7:4]` format). | `[OLED DATA WO 0xFFFF0028 · OLED CTRL WO 0xFFFF002C]` |
| `0xFFFF0040` | 4 B  | Read   | `ACCEL_DATA` | Packed 32-bit `[31:24] Temp, [23:16] X, [15:8] Y, [7:0] Z`. | `[ACCEL DATA RO 0xFFFF0040 · ACCEL DREADY RO 0xFFFF0044]` |
| `0xFFFF0044` | 4 B  | Read   | `ACCEL_DREADY` | Bit 0 = 1 when new reading is available. | `[ACCEL DATA RO 0xFFFF0040 · ACCEL DREADY RO 0xFFFF0044]` |
| `0xFFFF0060` | 4 B  | Write  | `PERIPH_LED` | User Output LEDs (bits `[7:0]`). | `[LED WO 0xFFFF0060 · DIP RO 0xFFFF0064]` |
| `0xFFFF0064` | 4 B  | Read   | `PERIPH_DIP` | 16-bit DIP Switch inputs (`SW15`..`SW0`). | `[LED WO 0xFFFF0060 · DIP RO 0xFFFF0064]` |
| `0xFFFF0068` | 4 B  | Read   | `PERIPH_PB` | Push Buttons (Bit 2=BTNL, Bit 1=BTNC, Bit 0=BTNR). | `[PB RO 0xFFFF0068]` |
| `0xFFFF0080` | 4 B  | Write  | `PERIPH_SEVENSEG` | 32-bit value displayed as 8 hex digits on 7-Segment. | `[7SEG WO 0xFFFF0080]` |
| `0xFFFF00A0` | 4 B  | Read   | `CYCLECOUNT` | Cycles elapsed since system reset (`totalCycles`). | `[CYCLECOUNT RO 0xFFFF00A0]` |

### 5.2 Dynamic Memory Segments & Verilog Dumps
- **Configurable Segments (`🗺 Segments…`)**: Custom base addresses for Code (`0x10000`), Data (`0x20000`), Stack (`0x30000`), and MMIO (`0xFFFF0000`).
- **Verilog `.mem` Dumps**:
  - Code segment $\rightarrow$ **`AA_IROM.mem`** (`💾 Dump txt`).
  - Data segment $\rightarrow$ **`AA_DMEM.mem`** (`💾 Dump data`).
  - Formatted with `// @<HEX_ADDR>` address comments for testbench compatibility.

---

## 6. Keyboard Shortcuts Reference

| Shortcut | Action | Scope |
|----------|--------|-------|
| `F5` | Toggle Run / Pause / Resume | Global / Editor |
| `F8` | Single Step Forward | Global / Editor |
| `Shift+F8` | Step Back (Undo Instruction) | Global / Editor |
| `F9` | Toggle Breakpoint at Cursor Line (Auto-snapping to valid instruction) | Global / Editor |
| `Ctrl+Enter` / `Cmd+Enter` | Assemble Source Program | Global / Editor |
| `Ctrl+S` / `Cmd+S` | Save Source File (`.asm`) | Global / Editor |
| `Ctrl+Space` | Manually Trigger Autocomplete & IntelliSense | Editor |
| `Ctrl+F` / `Cmd+F` | Open Find & Replace (Focus Find) | Editor |
| `Ctrl+H` / `Cmd+H` | Open Find & Replace (Focus Replace) | Editor |
| `Esc` | Close Find & Replace Panel / Dismiss Autocomplete | Editor |
| `Enter` / `Shift+Enter` | Next / Previous Search Match | Find Box |
| `Alt+C` | Toggle Case-Sensitive Search | Find Box |
| `Tab` | Insert `\t` (Cursor) / Indent Selection (Block) / Accept Completion | Editor |
| `Shift+Tab` | Unindent / Dedent Selected Lines | Editor |
| `Ctrl+Z` / `Ctrl+Y` | Undo / Redo (CM6 Native Transaction History) | Editor |

---

## 7. Version History

| Version | Milestone Description & Features Implemented |
|---------|----------------------------------------------|
| **v1.0 – v6.0** | Basic RV32GC simulator core, two-pass assembler, non-blocking engine, Nexys 4 FPGA LEDs/DIP switches/buttons/7-segment, UART Serial Console, escape sequence parser, and double-height dual-rectangle 3D DIP switches. |
| **v7.0 – v11.0** | 96x64 Pixel OLED Display MMIO peripheral, 3-Axis Accelerometer & Temperature Sensor `{temp, X, Y, Z}`, System Cycle Counter (`0xFFFF00A0`), RARS `ecall` syscall engine, and mobile viewport enhancements. |
| **v12.0 – v14.0** | Intelligent UX button state lifecycle management, in-editor IntelliSense autocomplete, extended load/store pseudo-instructions, and 60 FPS visual rendering optimization. |
| **v2.0 (CodeMirror 6 Upgrade)** | **Major Architecture Overhaul**: Upgraded editor to **CodeMirror 6 (latest version)** with standalone offline bundle (`window.CM6`). Implemented custom RISC-V stream tokenizer & Catppuccin Mocha theme, **interactive breakpoint gutter with highlighted line numbers and line glows**, **smart breakpoint snapping to next valid executable instruction**, **live floating parameter signature helper (`signatureHelpField`)**, **interactive hover tooltips (`riscvHoverTooltip`)**, **active instruction format banner in operand autocompletions**, **precision in-line `\t` Tab key insertion**, native transaction undo/redo history, and complete backward compatibility proxy facade. |
