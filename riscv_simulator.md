# RISC-V RV32GC Simulator & Assembler — Technical Specification & Architecture Manual

## 1. Project Overview

**RISC-V Simulator** is a high-performance, single-file web application (`riscv_simulator.html`) that delivers a full-featured **RISC-V RV32GC (RV32I + M + A + F + D + C) Assembler, Emulator, and Visual Debugger**. 

Designed for hardware architects, computer architecture students, and embedded software developers, the tool combines a syntax-highlighted assembly code editor, two-pass assembler, non-blocking execution engine, real-time disassembly viewer, step-by-step debugger with back-stepping history, interactive memory explorer, configurable instruction cycle timing, and a hardware-accurate simulation of the **Digilent Nexys 4 FPGA Board**.

---

## 2. Architecture & Design System

### 2.1 Technology Stack & Core Philosophy
- **Zero Dependencies**: Pure HTML5, CSS3, and modern Vanilla JavaScript (ES6+). Runs completely client-side in standard web browsers.
- **Theme & Aesthetics**: Dark mode theme inspired by the *Catppuccin Macchiato/Mocha* palette (`#1e1e2e` base, `#181825` mantle, `#313244` surface, `#cba6f7` mauve primary accents).
- **Responsive Layout**: Resizable two-pane layout using a custom draggable divider (`.splitter`).
- **Unified Toolbar Controls**: Every button in the main toolbar is styled with `display: inline-flex; height: 28px; line-height: 28px; box-sizing: border-box;` ensuring perfectly uniform vertical alignment across standard buttons and unicode icon controls.

### 2.2 Stacked Code Editor Architecture
- **Dual-Layer Overlay**: Synchronized line numbers and custom syntax highlighting (`.highlight-layer`) positioned directly beneath a transparent `<textarea>` input layer.
- **Auto-Formatting**: Handles real-time indentation, line sync, undo/redo history (`editorHistory`), and syntax token highlighting for directives, labels, instructions, registers, numbers, and comments.

---

## 3. Register Panel & Editing Experience

### 3.1 Register Bank Structure
The simulator models the standard 32 32-bit integer registers (`x0` / `zero` through `x31` / `t6`) plus the Program Counter (`PC`). Register `x0` is hardwired to `0x00000000` (writes are silently discarded).

```
+-----+------+-------------------+-------------------+
|  #  | Name |    Value (Hex)    |    Value (Dec)    |
+-----+------+-------------------+-------------------+
| x0  | zero | 0x00000000        | 0                 |
| x1  | ra   | 0x00010040        | 65600             |
| x2  | sp   | 0x00020200        | 131584            |
| ... | ...  | ...               | ...               |
+-----+------+-------------------+-------------------+
```

### 3.2 Column Alignment & Spacing Rules
- **Left-Aligned Headers (`#`, `Name`)**: Left-aligned (`text-align: left; vertical-align: middle`) with compact column width constraints (`table-layout: fixed`). This eliminates dead white space and brings the `Name` column right next to `Value (Hex)`.
- **Right-Aligned Headers (`Value (Hex)`, `Value (Dec)`)**: Right-aligned (`text-align: right; vertical-align: middle`) with equal wide column allocation for numeric clarity.

### 3.3 Register Interaction & Editing Modes
| Gesture | Action Mode | Behavioral Description |
|---------|-------------|------------------------|
| **Single-Click** | **Localized Inline Edit** | Turns the target table cell into an active `contenteditable` inline input field with auto-selected text for instant localized value edits. |
| **Double-Click** | **Centered Popup Modal Window** | Opens a modal overlay (`#regEditOverlay`) displaying register index, ABI name, current hex/decimal values, and Enter (commit) / Escape (cancel) key bindings. |

---

## 4. Nexys 4 FPGA Board Simulation

The **Peripherals Panel** implements an interactive hardware simulation of the **Digilent Nexys 4 FPGA Board**.

```
+---------------------------------------------------------------------------------------------------+
|                                 COMPACT NEXYS 4 FPGA PERIPHERAL BOARD                             |
|                                                                                                   |
|  [P8][P7][P6][P5][P4][P3][P2]   [CLK]   [L7][L6][L5][L4][L3][L2][L1][L0]   (16 LEDs)                |
|  LED15------------------LED9    LED8    LED7----------------------LED0                            |
|                                                                                                   |
|  [SW15]--------------[SW9]     [SW8]    [SW7]--------------------[SW0]   (16 Compact DIPs)        |
|                                                                                                   |
|  Push Buttons: [L] [C] [R] (Bit 2=BTNL, Bit 1=BTNC, Bit 0=BTNR)  7-Segment: [0 0 0 0 0 0 0 0] |
+---------------------------------------------------------------------------------------------------+
```

### 4.1 16-LED Output Array (LED[15:0])
The 16 LEDs are arranged in 3 distinct functional groups with distinct Catppuccin color indicators:

| LED Subset | Color Theme | Drive Source / Function |
|------------|-------------|--------------------------|
| **LED[15:9]** (7 bits) | **Vibrant Cyan / Blue** (`#89b4fa`) | Displays lower Program Counter bits `PC[8:2]`. |
| **LED[8]** (1 bit) | **Vibrant Amber / Orange** (`#fab387`) | **Divided Clock Indicator**. Blinks per instruction cycle during continuous execution; remains lit (ON) when paused. |
| **LED[7:0]** (8 bits) | **Vibrant Green** (`#a6e3a1`) | **User Output Register**. Driven by the least significant byte written to MMIO at `0xFFFF0060`. |

### 4.2 16-DIP Switch Input Array (SW[15:0])
- **Alignment**: 16 DIP switches aligned 1-to-1 directly beneath `LED15` through `LED0`.
- **Compact Sizing**: Switches are styled with compact 16px x 11px bounds and tight 1px gaps (`gap: 1px`), achieving a 319px total board width that fits mobile viewports without horizontal scrolling.
- **Sublabel Distance**: `.dip-sublabel` (`SW15`..`SW0`) styled with `margin-top: 3px`, matching the exact visual spacing of the LED sublabel circles.
- **MMIO Access**: Read at address `0xFFFF0064`.

### 4.3 Push Buttons (`PERIPH_PB` at `0xFFFF0068`)
- **Bit Mapping (`[2:0]`)**:
  - **Bit 2 (`0x4`)**: **BTNL** (Left Push Button)
  - **Bit 1 (`0x2`)**: **BTNC** (Center Push Button)
  - **Bit 0 (`0x1`)**: **BTNR** (Right Push Button)
- **Toggle Behavior**: Click button element (`L`, `C`, `R`) to toggle active press/release state.

### 4.4 7-Segment Display (`PERIPH_SEVENSEG` at `0xFFFF0080`)
- **Rendering**: 8-digit hexadecimal display rendered using inline SVG 7-segment digits (`0`–`9`, `A`–`F`).
- **Alignment**: Centered inside the bounding box (`justify-content: center; gap: 8px; padding: 10px 12px;`) with balanced 8px inter-digit spacing.

---

## 5. Memory Model & Segment Mapping

### 5.1 Memory Layout & Segment Default Addresses

```
0x00000000 +-----------------------------------+
           | Reserved / Zero Page              |
0x00010000 +-----------------------------------+
           | .text (Code Segment)              |  Row Direction: Increasing (+8 B/row)
0x00020000 +-----------------------------------+
           | .data (Static Data Segment)       |  Row Direction: Increasing (+8 B/row)
0x00020200 +-----------------------------------+
           | .stack (Stack Pointer SP Base)    |  Row Direction: DECREASING (-8 B/row)
           |   (Grows downwards to lower addrs)|
0x00400000 +-----------------------------------+
           | End of RAM Bounds (4 MB)          |
           +-----------------------------------+
0xFFFF0000 +-----------------------------------+
           | MMIO Peripheral Region            |  Row Direction: Increasing (+8 B/row)
0xFFFF00FF +-----------------------------------+
```

| Segment | Base Address | Row Direction | Behavioral Notes |
|---------|--------------|---------------|------------------|
| **Code (.text)** | `0x00010000` | Increasing (`+8` B/row) | Executable instruction memory stream. |
| **Data (.data)** | `0x00020000` | Increasing (`+8` B/row) | Initialized static variables, strings, and constants. Steps upwards to higher addresses. |
| **Stack (.stack)**| `0x00020200` | **Decreasing (`-8` B/row)** | **Stack Region**. Steps downwards to lower addresses matching RISC-V stack push growth. |
| **MMIO Region** | `0xFFFF0000` | Increasing (`+8` B/row) | Memory-mapped I/O peripherals (`0xFFFF0000`–`0xFFFF00FF`). |

### 5.2 Complete MMIO Address Map
| MMIO Address | Size | Access | Symbol | Description & Row Annotations |
|--------------|------|--------|--------|-------------------------------|
| `0xFFFF0000` | 1 B  | Read   | `MMIO_GETC` | Console Input character buffer |
| `0xFFFF0004` | 1 B  | Write  | `MMIO_PUTC` | Console Output character stream |
| `0xFFFF0008` | 1 B  | Read   | `MMIO_STATUS` | Console Input Status (Bit 0 = 1 if input available) |
| `0xFFFF0060` | 4 B  | Write  | `PERIPH_LED` | User Output LEDs (bits `[7:0]`). Row annotation: `[LED WO 0xFFFF0060 · DIP RO 0xFFFF0064]` |
| `0xFFFF0064` | 4 B  | Read   | `PERIPH_DIP` | 16-bit DIP Switch inputs. Row annotation: `[LED WO 0xFFFF0060 · DIP RO 0xFFFF0064]` |
| `0xFFFF0068` | 4 B  | Read   | `PERIPH_PB` | Push Buttons (Bit 2=BTNL, Bit 1=BTNC, Bit 0=BTNR). Row annotation: `[PB RO 0xFFFF0068]` |
| `0xFFFF0080` | 4 B  | Write  | `PERIPH_SEVENSEG` | 32-bit value displayed as 8 hex digits. Row annotation: `[7SEG WO 0xFFFF0080]` |

### 5.3 Memory View Edits & Peripheral Synchronization
- **Unsigned 32-Bit Addressing**: All memory addresses are formatted using `(base >>> 0)` to prevent 32-bit signed bitwise sign-extension (`0xffff0000`).
- **Read/Write MMIO Persistence**: `handleMMIORead(addr, size)` and `handleMMIOWrite(addr, val, size)` handle single-byte and 4-byte word operations for all peripheral registers (`PERIPH_LED`, `PERIPH_DIP`, `PERIPH_PB`, `PERIPH_SEVENSEG`). Memory cell edits directly in the MMIO tab persist permanently across re-renders and immediately update the Peripherals visualization.

---

## 6. Non-Blocking Execution Engine

To prevent browser freezing or non-responsive script dialogs during long-running programs or infinite loops:
- **Chunked Batch Execution Engine**: `runProgram()` executes instructions in batches of 5,000 instructions (`CHUNK_SIZE = 5000`) and yields control to the browser event loop using `setTimeout(runBatch, 0)`.
- **60 FPS Responsive UI**: DOM events, user clicks, tab switching, and window resizing remain completely fluid during program execution.
- **Responsive Pause & Resume**: The `⏸ Pause` button remains visible and interactive during execution. Clicking `⏸ Pause` pauses execution instantly, updates status to `Paused`, and toggles the button to `▶ Resume`.

---

## 7. Two-Pass Assembler Architecture

The built-in assembler compiles RISC-V assembly into RV32GC machine code using a strict two-pass pipeline:

### 7.1 Pre-Pass (.equ Symbol Resolution)
Scans the source file for `.equ SYMBOL, VALUE` directives and populates the global symbol table before pass 1.

### 7.2 Pass 1: Label Resolution & Sizing
Scans the text and data segments to record label addresses. Pseudo-instruction expansions (e.g. `la`, `li`, `lw rd, bare_label`) reserve exact instruction slot allocations (e.g. 2 slots / 8 bytes for bare label load expansion `lui` + `load`) to ensure label address offsets remain 100% accurate.

### 7.3 Pass 2: Machine Code Encoding
Encodes instructions into 32-bit or 16-bit RISC-V machine words:
- **PC-Relative Jump & Branch Offsets**: Branch (`beq`, `bne`, `blt`, `bge`, `bltu`, `bgeu`) and Jump (`jal`, `j`) offsets are calculated as `targetAddress - instructionPC` per the official RISC-V specification.
- **Relative Numeric Offsets**: Full support for relative numeric offsets (`+N`, `-N`) in branch and jump targets (e.g., `jal zero, +8`).

---

## 8. Instruction Set Reference Table

The simulator supports the complete **RV32GC** instruction set architecture:

| Extension | Category | Supported Instructions |
|-----------|----------|------------------------|
| **RV32I** | Base Integer | `lui`, `auipc`, `jal`, `jalr`, `beq`, `bne`, `blt`, `bge`, `bltu`, `bgeu`, `lb`, `lh`, `lw`, `lbu`, `lhu`, `sb`, `sh`, `sw`, `addi`, `slti`, `sltiu`, `xori`, `ori`, `andi`, `slli`, `srli`, `srai`, `add`, `sub`, `sll`, `slt`, `sltu`, `xor`, `srl`, `sra`, `or`, `and`, `fence`, `ecall`, `ebreak` |
| **RV32M** | Multiplication & Division | `mul`, `mulh`, `mulhsu`, `mulhu`, `div`, `divu`, `rem`, `remu` |
| **RV32A** | Atomic Operations | `lr.w`, `sc.w`, `amoswap.w`, `amoadd.w`, `amoxor.w`, `amoand.w`, `amoor.w`, `amomin.w`, `amomax.w`, `amominu.w`, `amomaxu.w` |
| **RV32F** | Single-Precision Floating-Point | `flw`, `fsw`, `fmadd.s`, `fmsub.s`, `fnmsub.s`, `fnmadd.s`, `fadd.s`, `fsub.s`, `fmul.s`, `fdiv.s`, `fsqrt.s`, `fsgnj.s`, `fsgnjn.s`, `fsgnjx.s`, `fmin.s`, `fmax.s`, `fcvt.w.s`, `fcvt.wu.s`, `fmv.x.w`, `feq.s`, `flt.s`, `fle.s`, `fclass.s`, `fcvt.s.w`, `fcvt.s.wu`, `fmv.w.x` |
| **RV32D** | Double-Precision Floating-Point | `fld`, `fsd`, `fmadd.d`, `fmsub.d`, `fnmsub.d`, `fnmadd.d`, `fadd.d`, `fsub.d`, `fmul.d`, `fdiv.d`, `fsqrt.d`, `fsgnj.d`, `fsgnjn.d`, `fsgnjx.d`, `fmin.d`, `fmax.d`, `fcvt.s.d`, `fcvt.d.s`, `feq.d`, `flt.d`, `fle.d`, `fclass.d`, `fcvt.w.d`, `fcvt.wu.d`, `fcvt.d.w`, `fcvt.d.wu` |
| **RV32C** | Compressed 16-bit Instructions | `c.nop`, `c.addi`, `c.jal`, `c.li`, `c.addi16sp`, `c.lui`, `c.srli`, `c.srai`, `c.andi`, `c.sub`, `c.xor`, `c.or`, `c.and`, `c.j`, `c.beqz`, `c.bnez`, `c.slli`, `c.lwsp`, `c.jr`, `c.mv`, `c.ebreak`, `c.jalr`, `c.add`, `c.swsp`, `c.lw`, `c.sw` |
| **Directives** | Assembler Directives | `.text`, `.data`, `.globl`, `.equ`, `.byte`, `.half`, `.word`, `.dword`, `.asciz`, `.string`, `.space`, `.align` |
| **Pseudo-Ops** | Pseudo-Instructions | `nop`, `li`, `la`, `mv`, `not`, `neg`, `seqz`, `snez`, `sltz`, `sgtz`, `j`, `jr`, `jal`, `ret`, `call` |

---

## 9. Version History (v1.0 – v3.8)

| Version | Milestone Description & Features Implemented |
|---------|----------------------------------------------|
| **v1.0 – v2.8** | Initial RV32GC simulator core, dual-layer syntax editor, `.equ` pre-pass, `.dword` data rendering, and spec-compliant PC-relative jump/branch offset calculations (`targetAddr - address`). |
| **v3.0** | Nexys 4 FPGA peripheral board simulation with 16 LEDs, 16 DIP switches, 3-color scheme (Cyan, Amber, Green), divided clock blink/pause logic, and 32-bit unsigned MMIO addressing. |
| **v3.1** | Register Edit UI overhaul, non-blocking run loop, memory MMIO rendering and editing. |
| **v3.2** | MMIO address formatting fix, stack downward direction, toolbar height, register header alignment. |
| **v3.3** | Compact mobile DIP switch & LED layout (319px total width, 0 horizontal scroll). |
| **v3.4** | Data segment growth fix, MMIO edits sync, detailed row annotations. |
| **v3.5** | MMIO read persistence fix, DIP switch sublabel margin adjustment. |
| **v3.6** | Register column gap reduction, 7-segment display centering and spacing. |
| **v3.7** | Push Button bit mapping fix (`[2:0] → Bit 2=BTNL, Bit 1=BTNC, Bit 0=BTNR`). |
| **v3.8** | **Code Base Refactoring & Cleanup**: Removed obsolete duplicate synchronous `runProgram()` definition, formatted line breaks (`function sext`), merged script blocks, and reorganized source codebase into 11 structured sections with comprehensive block comments. |
