# RISC-V RV32GC Simulator & Assembler — Technical Specification & Architecture Manual

## 1. Project Overview

**RISC-V Simulator** is a high-performance, single-file web application (`riscv_simulator.html`) that delivers a full-featured **RISC-V RV32GC (RV32I + M + A + F + D + C) Assembler, Emulator, and Visual Debugger**. 

Designed for hardware architects, computer architecture students, and embedded software developers, the tool combines a syntax-highlighted assembly code editor, two-pass assembler, non-blocking execution engine, real-time disassembly viewer, step-by-step debugger with back-stepping history, interactive memory explorer, configurable instruction cycle timing, a hardware-accurate simulation of the **Digilent Nexys 4 FPGA Board**, a standard 16550 **UART Serial Console**, a **96x64 Pixel OLED Display MMIO Peripheral**, a **3-Axis Accelerometer & Temperature Sensor**, a **System Cycle Counter**, and pre-loaded RISC-V assembly example programs (`DIP_to_LED.asm`, `HelloWorld.asm`, `HelloWorld_jal_jalr.asm`).

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
|                                    Mode: vary_pixel_data_mode  ·  Format: 8-bit (3R-3G-2B)      |
|                                                                                                   |
|  3-Axis Accelerometer & Temp (0xFFFF0040–0xFFFF0044)           DREADY: 1  ·  Cycles: 1234        |
|  X Axis: [----|----] 0 (0x00, +0.00g)   Y Axis: [----|----] 0 (0x00, +0.00g)                      |
|  Z Axis: [----|--O-] 64 (0x40, +1.00g)   Temp:   [---|-----] 25°C (0x19)                           |
|  Presets: [Flat (Z=+1g)] [Tilt X (+1g)] [Tilt Y (+1g)] [Shake (±2g)] [Zero All]                  |
|                                                                                                   |
|  [P8][P7][P6][P5][P4][P3][P2]   [CLK]   [L7][L6][L5][L4][L3][L2][L1][L0]   (16 LEDs)                |
|  LED15------------------LED9    LED8    LED7----------------------LED0                            |
|                                                                                                   |
|  [SW15]--------------[SW9]     [SW8]    [SW7]--------------------[SW0]   (16 Dual-Rect 24px DIPs)  |
|                                                                                                   |
|  Push Buttons: [L] [C] [R] (Bit 2=BTNL, Bit 1=BTNC, Bit 0=BTNR)  7-Segment: [0 0 0 0 0 0 0 0] |
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

---

## 6. Version History (v1.0 – v8.0)

| Version | Milestone Description & Features Implemented |
|---------|----------------------------------------------|
| **v1.0 – v6.0** | Basic RV32GC simulator core, two-pass assembler, non-blocking engine, Nexys 4 FPGA LEDs/DIP switches/buttons/7-segment, UART Serial Console, escape sequence parser, and double-height dual-rectangle 3D DIP switches. |
| **v7.0** | 96x64 Pixel OLED Display MMIO Peripheral (`0xFFFF0020`–`0xFFFF002C`) with 3 color formats, 5 trigger/autoadvance modes, and 3x scale HTML5 pixelated canvas renderer. |
| **v8.0** | **3-Axis Accelerometer & Temp Sensor (`0xFFFF0040`–`0xFFFF0044`) & Cycle Counter (`0xFFFF00A0`)**: Implemented 32-bit packed `ACCEL_DATA` (`[31:24] Temp`, `[23:16] Z`, `[15:8] Y`, `[7:0] X`), `ACCEL_DREADY`, and `CYCLECOUNT`. Added 3 interactive X, Y, Z range sliders (-128 to +127, $\pm 2g$), temperature slider (-40 to +85°C), preset buttons (`Flat`, `Tilt X`, `Tilt Y`, `Shake`, `Zero All`), byte read access for `lbu`/`lb`, and Memory View row descriptors. |
