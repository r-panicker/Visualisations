# RISC-V RV32GC Simulator & Assembler — Technical Specification & Architecture Manual

## 1. Project Overview

**RISC-V Simulator** is a high-performance, single-file web application (`riscv_simulator.html`) that delivers a full-featured **RISC-V RV32GC (RV32I + M + A + F + D + C) Assembler, Emulator, and Visual Debugger**. 

Designed for hardware architects, computer architecture students, and embedded software developers, the tool combines a syntax-highlighted assembly code editor, two-pass assembler, non-blocking execution engine, real-time disassembly viewer, step-by-step debugger with back-stepping history, interactive memory explorer, configurable instruction cycle timing, a hardware-accurate simulation of the **Digilent Nexys 4 FPGA Board**, a standard 16550 **UART Serial Console**, and pre-loaded RISC-V assembly example programs (`DIP_to_LED.asm`, `HelloWorld.asm`, `HelloWorld_jal_jalr.asm`).

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
| **Single-Click** | **Localized Inline Edit** | Turns the target table cell into an active `contenteditable` inline input field with auto-selected text for quick inline edits. |
| **Double-Click** | **Centered Popup Modal Window** | Opens a modal overlay (`#regEditOverlay`) displaying register index, ABI name, current hex/decimal values, and Enter (commit) / Escape (cancel) key bindings. |

---

## 4. Peripherals & FPGA Board Simulation

The **Peripherals Panel** implements an interactive hardware simulation of the **Digilent Nexys 4 FPGA Board** and a standard 16550 **UART Serial Console**.

```
+---------------------------------------------------------------------------------------------------+
|                                 COMPACT NEXYS 4 FPGA PERIPHERAL BOARD                             |
|                                                                                                   |
|  UART Serial Console (115200 8N1) 0xFFFF0000–0xFFFF000C        RX_VALID: 0  ·  TX_READY: 1         |
|  [Terminal Output Box]                                                                            |
|  Line 1: [ Mode: ASCII/Hex ] [ Text Box ] [ Send ] [ Clear ]                                      |
|  Line 2: [☑ Buffer]        [ 10 ▲▼ ] instr delay  ·  RX Queue: 0 bytes (empty)                    |
|                                                                                                   |
|  [P8][P7][P6][P5][P4][P3][P2]   [CLK]   [L7][L6][L5][L4][L3][L2][L1][L0]   (16 LEDs)                |
|  LED15------------------LED9    LED8    LED7----------------------LED0                            |
|                                                                                                   |
|  [SW15]--------------[SW9]     [SW8]    [SW7]--------------------[SW0]   (16 Dual-Rect 24px DIPs)  |
|                                                                                                   |
|  Push Buttons: [L] [C] [R] (Bit 2=BTNL, Bit 1=BTNC, Bit 0=BTNR)  7-Segment: [0 0 0 0 0 0 0 0] |
+---------------------------------------------------------------------------------------------------+
```

### 4.1 UART Serial Console (115200 8N1) & Control Layout
- **Title Header Layout**: Styled with `display: flex; justify-content: space-between; align-items: center; gap: 8px;`. Ensures clear visual separation between the title, address badge (`0xFFFF0000–0xFFFF000C`), and status indicators (`RX_VALID` / `TX_READY`).
- **Settings**: 115200 Baud Rate, 8 Data Bits, No Parity, 1 Stop Bit (8N1).
- **ASCII Mode Escape Sequence Parser (`parseAsciiEscapes`)**:
  - `\n` -> Line Feed (LF, `0x0A` / 10), `\r` -> Carriage Return (CR, `0x0D` / 13), `\t` -> Tab (TAB, `0x09` / 9), `\0` -> Null (NUL, `0x00` / 0), `\e` -> Escape (ESC, `0x1B` / 27), `\xHH` -> Hex byte value `parseInt(HH, 16)`.
- **Single-Row Controls Layout**:
  - **Buffer Checkbox**: Explicitly scoped `input[type="checkbox"]` (`flex: 0 0 auto; margin: 0 2px 0 0;`) positioned immediately next to the text `'Buffer'`.
  - **Instruction Delay Box (`#uartAutoSeqDelay`)**: 48px wide, 24px tall numeric input with `text-align: center`, horizontally separated by a 28px gap (`margin-left: 24px`) from `'Buffer'`. Includes a mouseover tooltip: `"Number of RISC-V instructions executed between sending each character in the buffered sequence"`.
  - **RX Queue Status**: Fits on the same single row separated by a dot separator (`·`).
- **Hardware Single-Character Buffer vs. Buffered Delay Mode**:
  - **Unbuffered Mode (`Buffer` unchecked)**: Hardware-accurate 1-character UART buffer. Sending multi-character text retains strictly the **first byte** in `UART_RX` (`0xFFFF0004`).
  - **Buffered Mode (`Buffer` checked)**: Queues the sequence into an instruction-delayed auto-send buffer. Delivers bytes one-by-one every $N$ instructions.
- **Clear & Reset**: Clicking **Clear** or system **Reset** clears the Terminal output screen and empties all UART queues.

### 4.2 FPGA Board Simulation & DIP Switch Architecture
- **Double-Height Dual-Rectangle 3D DIP Switches**: Each DIP switch is 24px tall (more than double original 11px height) containing two stacked inner rectangles (`.dip-rect-top` & `.dip-rect-bottom`).
  - **OFF State (0)**: Top rectangle is dark/recessed inset (`#181825`); bottom rectangle is a raised tactile slider knob (`#585b70` -> `#313244` gradient).
  - **ON State (1)**: Top rectangle is a raised glowing active knob (`#cba6f7` -> `#a6e3a1` gradient); bottom rectangle is dark/recessed inset (`#181825`).
- **Strict Column-for-Column Vertical Alignment**: Center of LED $k$ is 100% mathematically locked to the center of DIP switch $k$ (`maxCenterDiff: 0px`). Independent row scrollbars are disabled to guarantee zero horizontal alignment dislocation at any window resolution.

### 4.3 Built-In Assembly Example Programs
Selectable directly from the main toolbar dropdown (`#exampleSelect`):
1. **Basic**: Basic arithmetic sum computation (`a + b + c`).
2. **Fibonacci**: Computes Fibonacci sequence `fib(10) = 55`.
3. **Factorial**: Computes `5! = 120`.
4. **Loop & Array**: Sums an array of 5 integer words in memory.
5. **I/O & M-Ext**: Demonstrates M-extension `mul`, `div`, `rem` instructions.
6. **DIP to LED (`DIP_to_LED.asm`)**: Real-time DIP switch polling (`0xFFFF0064`) and LED driving (`0xFFFF0060`) with delay loop.
7. **Hello World (`HelloWorld.asm`)**: Polled UART RX/TX console program that waits for `A\r` or `A\n` input, updates 7-segment/LED displays, and prints `"\r\nWelcome to CG3207..\r\n"`.
8. **Hello World Subroutine (`HelloWorld_jal_jalr.asm`)**: Subroutine implementation of `HelloWorld.asm` using RISC-V function calls (`jal PRINT_S` and `ret` / `jalr zero, 0(ra)`).

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
           | MMIO Peripheral & UART Region     |  Row Direction: Increasing (+8 B/row)
0xFFFF00FF +-----------------------------------+
```

| Segment | Base Address | Row Direction | Behavioral Notes |
|---------|--------------|---------------|------------------|
| **Code (.text)** | `0x00010000` | Increasing (`+8` B/row) | Executable instruction memory stream. |
| **Data (.data)** | `0x00020000` | Increasing (`+8` B/row) | Initialized static variables, strings, and constants. Steps upwards to higher addresses. |
| **Stack (.stack)**| `0x00020200` | **Decreasing (`-8` B/row)** | **Stack Region**. Steps downwards to lower addresses matching RISC-V stack push growth. |
| **MMIO Region** | `0xFFFF0000` | Increasing (`+8` B/row) | Memory-mapped I/O peripherals & UART (`0xFFFF0000`–`0xFFFF00FF`). |

### 5.2 Complete MMIO Address Map
| MMIO Address | Size | Access | Symbol | Description & Behavioral Rules | Row Annotation in Memory View |
|--------------|------|--------|--------|--------------------------------|-------------------------------|
| `0xFFFF0000` | 4 B  | Read   | `UART_RX_VALID` | Bit 0 = 1 if data is available in `UART_RX` queue (`uartRxQueue.length > 0`). | `[UART RX VALID RO 0xFFFF0000 · UART RX RO 0xFFFF0004]` |
| `0xFFFF0004` | 4 B  | Read   | `UART_RX` | Reading returns and pops the next 8-bit character from `uartRxQueue`. | `[UART RX VALID RO 0xFFFF0000 · UART RX RO 0xFFFF0004]` |
| `0xFFFF0008` | 4 B  | Read   | `UART_TX_READY` | Bit 0 = 1 when `UART_TX` is ready to receive data (always returns `1`). | `[UART TX READY RO 0xFFFF0008 · UART TX WO 0xFFFF000C]` |
| `0xFFFF000C` | 4 B  | Write  | `UART_TX` | Writing an 8-bit character transmits it to the UART TX output terminal. | `[UART TX READY RO 0xFFFF0008 · UART TX WO 0xFFFF000C]` |
| `0xFFFF0060` | 4 B  | Write  | `PERIPH_LED` | User Output LEDs (bits `[7:0]`). | `[LED WO 0xFFFF0060 · DIP RO 0xFFFF0064]` |
| `0xFFFF0064` | 4 B  | Read   | `PERIPH_DIP` | 16-bit DIP Switch inputs (`SW15`..`SW0`). | `[LED WO 0xFFFF0060 · DIP RO 0xFFFF0064]` |
| `0xFFFF0068` | 4 B  | Read   | `PERIPH_PB` | Push Buttons (Bit 2=BTNL, Bit 1=BTNC, Bit 0=BTNR). | `[PB RO 0xFFFF0068]` |
| `0xFFFF0080` | 4 B  | Write  | `PERIPH_SEVENSEG` | 32-bit value displayed as 8 hex digits on the 7-Segment display. | `[7SEG WO 0xFFFF0080]` |

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
| **RV32A** | Atomic Operations | `lr.w`, `sc.w`, `amoswap.w`, `amoadd.w`, `amoxor.w`, `amoor.w`, `amomin.w`, `amomax.w`, `amominu.w`, `amomaxu.w` |
| **RV32F** | Single-Precision Floating-Point | `flw`, `fsw`, `fmadd.s`, `fmsub.s`, `fnmsub.s`, `fnmadd.s`, `fadd.s`, `fsub.s`, `fmul.s`, `fdiv.s`, `fsqrt.s`, `fsgnj.s`, `fsgnjn.s`, `fsgnjx.s`, `fmin.s`, `fmax.s`, `fcvt.w.s`, `fcvt.wu.s`, `fmv.x.w`, `feq.s`, `flt.s`, `fle.s`, `fclass.s`, `fcvt.s.w`, `fcvt.s.wu`, `fmv.w.x` |
| **RV32D** | Double-Precision Floating-Point | `fld`, `fsd`, `fmadd.d`, `fmsub.d`, `fnmsub.d`, `fnmadd.d`, `fadd.d`, `fsub.d`, `fmul.d`, `fdiv.d`, `fsqrt.d`, `fsgnj.d`, `fsgnjn.d`, `fsgnjx.d`, `fmin.d`, `fmax.d`, `fcvt.s.d`, `fcvt.d.s`, `feq.d`, `flt.d`, `fle.d`, `fclass.d`, `fcvt.w.d`, `fcvt.wu.d`, `fcvt.d.w`, `fcvt.d.wu` |
| **RV32C** | Compressed 16-bit Instructions | `c.nop`, `c.addi`, `c.jal`, `c.li`, `c.addi16sp`, `c.lui`, `c.srli`, `c.srai`, `c.andi`, `c.sub`, `c.xor`, `c.or`, `c.and`, `c.j`, `c.beqz`, `c.bnez`, `c.slli`, `c.lwsp`, `c.jr`, `c.mv`, `c.ebreak`, `c.jalr`, `c.add`, `c.swsp`, `c.lw`, `c.sw` |
| **Directives** | Assembler Directives | `.text`, `.data`, `.globl`, `.equ`, `.byte`, `.half`, `.word`, `.dword`, `.asciz`, `.string`, `.space`, `.align` |
| **Pseudo-Ops** | Pseudo-Instructions | `nop`, `li`, `la`, `mv`, `not`, `neg`, `seqz`, `snez`, `sltz`, `sgtz`, `j`, `jr`, `jal`, `ret`, `call` |

---

## 9. Version History (v1.0 – v6.0)

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
| **v3.8** | Code base refactoring and cleanup, unified script blocks, removed duplicate functions. |
| **v4.0** | Standard 16550 UART Serial Console (115200 8N1) with `UART_RX_VALID`, `UART_RX`, `UART_TX_READY`, and `UART_TX`. |
| **v4.1** | ASCII Escape Sequence Encoding (`parseAsciiEscapes`) for `\n`, `\r`, `\t`, `\0`, `\b`, `\e`, `\xHH`, octal. |
| **v4.2** | Automated Delayed Sequence Generator with instruction-accurate delivery integrated in `executeOne()`. |
| **v4.3** | Unified Auto-Send UI & Default 10-Instruction Delay. |
| **v4.4** | UART Header Spacing Fix & 3 New Example Programs (`DIP_to_LED.asm`, `HelloWorld.asm`, `HelloWorld_jal_jalr.asm`). |
| **v4.5** | Assembler Immediate Character Literal Fix (`parseImm`). |
| **v4.6** | Refined UART Console UI & Single-Character Hardware Buffer Rule. |
| **v4.7** | Single-Row Control Layout & Delay Spinner Ergonomics. |
| **v4.8** | Buffer Proximity Fix & 26px Ultra-Compact Delay Box. |
| **v4.9** | Balanced 38px Instruction Delay Box & 18px Horizontal Separation. |
| **v5.0** | Spacious 48px Instruction Delay Box & 28px Horizontal Separation. |
| **v6.0** | **Double-Height Dual-Rectangle 3D DIP Switches & Locked LED Column Alignment**: Doubled DIP switch height to 24px using dual-rectangle 3D rocker switches (`.dip-rect-top` & `.dip-rect-bottom`). OFF state displays dark recessed top and raised tactile bottom slider knob; ON state displays raised glowing active top knob and dark recessed bottom. Eliminated independent row scrollbars so LED $k$ and DIP $k$ maintain 100% mathematical center alignment (`maxCenterDiff: 0px`). |
