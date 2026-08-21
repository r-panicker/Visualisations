# RISC-V Simulator — Test Suites & Build Utilities Manual

This directory contains the automated test suites, bundling tools, and generator utilities for **[riscv_simulator.html](../riscv_simulator.html)** and **[riscv_simulator.md](../riscv_simulator.md)**.

---

## 📦 Prerequisites & Required Node Modules

To keep the repository clean and lightweight, `node_modules/` is **not** committed to Git. The only modules needed to run the test suite or rebuild the bundle are:

### 1. Test Dependencies (Required for Running Tests)
- **`jsdom`** (`^24.0.0`): Headless DOM & HTML5 Canvas environment for executing browser scripts and testing CodeMirror 6 in Node.js.

```bash
# Install test dependencies
npm --prefix tests_v2 install
# or
cd tests_v2 && npm install
```

### 2. Build Dependencies (Optional — only if recompiling CodeMirror 6 bundle from scratch)
- **`esbuild`** (`^0.20.0`): Fast bundler used to compile `cm6_entry.js` into `cm6_bundle.min.js`.
- **CodeMirror 6 Packages**:
  - `@codemirror/state`
  - `@codemirror/view`
  - `@codemirror/language`
  - `@codemirror/commands`
  - `@codemirror/search`
  - `@codemirror/autocomplete`
  - `@lezer/highlight`

> **Note**: `cm6_bundle.min.js` is already pre-bundled and included in this directory, so `esbuild` and the `@codemirror/*` packages are **not** required for standard testing or running `generate_v2.js`.

---

## 📋 Quick Test Commands

```bash
# 1. Install dependencies (first time only)
npm --prefix tests_v2 install

# 2. Run the complete test suite (all 6 suites sequentially)
npm --prefix tests_v2 run test:all

# 3. Run individual test suites
node tests_v2/test_comprehensive_suite.js
node tests_v2/test_tab_and_autocomplete.js
node tests_v2/test_breakpoint_highlight_and_snap.js
node tests_v2/test_jsdom.js
node tests_v2/test_all_instructions_v2.js
node tests_v2/test_execution_programs.js

# 4. Re-generate riscv_simulator.html
npm --prefix tests_v2 run build
```

---

## 📂 Detailed File-by-File Documentation

### 1. `test_comprehensive_suite.js` — End-to-End System & Peripheral Integration Test
- **Purpose**: Validates full system integration across all layers of the simulator (CodeMirror 6 editor, assembler, CPU execution engine, stepping, Find & Replace, and Nexys 4 FPGA Board MMIO peripherals).
- **Test Scenarios & Assertions**:
  1. **Editor Proxy Facade**: Verifies bidirectional synchronization between `window.editor.value`, `selectionStart`, `selectionEnd`, and CodeMirror 6's document state.
  2. **In-Line Tab Precision**: Verifies pressing `Tab` at a collapsed cursor inserts a literal `\t` without auto-indenting or shifting the line.
  3. **Breakpoint Gutter & Snapping**: Tests setting a breakpoint on non-instruction lines (comments/directives) and verifies automatic snapping to line 5 (`li x1, 10`).
  4. **Two-Pass Assembler**: Confirms assembly of the `basic` example produces valid machine code with 0 errors.
  5. **Stepping & State History**: Single steps forward (`F8`), verifies register updates (`x1 = 10`), checks `currentExecLine = 6`, and executes `stepBack()` (`Shift+F8`) to confirm previous state restoration (`x1 = 0, PC = 0x10000`).
  6. **All Pre-Loaded Examples**: Assembles all 5 built-in programs (`basic`, `fib`, `fact`, `loop`, `circle_accel`) with zero syntax or translation errors.
  7. **In-Editor Find & Replace**: Tests search match counting (`1/3` matches for `ecall`), single replacement (`replaceCurrent()`), and replace-all (`replaceAll()`).
  8. **Nexys 4 FPGA Board MMIO**: Tests memory reads/writes for LEDs (`0xFFFF0060`), 7-Segment SVG display (`0xFFFF0080`), 3-Axis Accelerometer (`0xFFFF0040`), and Cycle counter (`0xFFFF00A0`).
- **Run Command**: `node tests_v2/test_comprehensive_suite.js`

---

### 2. `test_tab_and_autocomplete.js` — Tab Key & IntelliSense Autocomplete Test
- **Purpose**: Focuses specifically on CodeMirror 6 keyboard event handling, custom Tab indentation rules, and operand-locked autocomplete documentation.
- **Test Scenarios & Assertions**:
  1. **Tab on Collapsed Cursor**: Tests typing `main:`, placing cursor at offset 5, and executing the Tab command. Asserts the result is `main:\t` (literal tab insertion).
  2. **Assembly Line Context Parser (`getAssemblyLineContext`)**:
     - `addi ` $\rightarrow$ context `OPERAND`, active mnemonic `addi`, operand index `0`.
     - `addi x1, ` $\rightarrow$ context `OPERAND`, active mnemonic `addi`, operand index `1`.
     - `addi x1, x2, ` $\rightarrow$ context `OPERAND`, active mnemonic `addi`, operand index `2`.
  3. **Active Instruction Documentation Locking**: Verifies that typing registers in operand position locks to `addi rd, rs1, imm` and suppresses unrelated instructions like `xor`.
  4. **Dynamic Signature Parameter Highlighting (`formatActiveInstructionSignature`)**:
     - Parameter 0: highlights `rd` in bold peach with underline.
     - Parameter 1: highlights `rs1` in bold peach with underline.
     - Parameter 2: highlights `imm` in bold peach with underline.
- **Run Command**: `node tests_v2/test_tab_and_autocomplete.js`

---

### 3. `test_breakpoint_highlight_and_snap.js` — Breakpoint Snapping & Line Number Highlight Test
- **Purpose**: Verifies that setting breakpoints on non-instruction lines (comments, directives, labels) snaps to the next executable instruction, and verifies visual gutter styling (line number highlight alone without line background tint).
- **Test Scenarios & Assertions**:
  1. **Snap from Comment Line 1**: Clicking line 1 (`# Basic RISC-V`) snaps to line 5 (`li x1, 10`).
  2. **Toggle Off**: Clicking line 2 (`.text`) when line 5 is already set toggles off line 5.
  3. **Snap from Label Line 4**: Clicking line 4 (`main:`) snaps to line 5 (`li x1, 10`).
  4. **CodeMirror 6 Breakpoint RangeSet**: Verifies `setBreakpointsEffect` updates `breakpointStateField` in CodeMirror 6 with `cm-breakpoint-line-number` in the line number gutter while leaving the code line un-tinted.
- **Run Command**: `node tests_v2/test_breakpoint_highlight_and_snap.js`

---

### 4. `test_jsdom.js` — DOM Lifecycle, Stepping & UI Simulation Test
- **Purpose**: Simulates a complete headless browser session using JSDOM to test DOM structure, editor rendering, stepping, breakpoints, and example loading.
- **Test Scenarios & Assertions**:
  1. **DOM & CodeMirror 6 Mounting**: Confirms `<div id="cmEditorContainer">` is mounted, `window.cmEditor` exists, and initial 18 lines of code are rendered.
  2. **Assembly & Machine Code Table**: Verifies `assembleOnly()` populates `window.machineCode` with 14 instructions.
  3. **Single Step Execution**: Simulates consecutive `stepOnce()` calls, asserting register progression: `x1=10`, `x2=20`, `x3=30`, `x4=30`.
  4. **Step Back Execution**: Calls `stepBack()` to confirm `x4` reverts to `0`.
  5. **Breakpoint Set/Clear**: Tests `toggleBreakpoint(6)` adding and removing line 6 from `window.breakpoints`.
  6. **Example Switcher**: Iterates over `fib`, `fact`, `loop`, `circle_accel`, and `basic`, ensuring each loads into CodeMirror 6 and compiles cleanly.
  7. **Find & Replace Panel**: Verifies find panel visibility, search term matching (`total_sum`), and count display (`1/3`).
- **Run Command**: `node tests_v2/test_jsdom.js`

---

### 5. `test_all_instructions_v2.js` — Full RV32GC Instruction Set Assembler Coverage
- **Purpose**: Verifies that the assembler in `riscv_simulator.html` correctly translates every supported instruction without syntax errors.
- **Test Scenarios & Assertions**:
  - Compiles **90+ instructions and pseudo-instructions**, including:
    - **RV32I Arithmetic/Logic**: `add`, `sub`, `and`, `or`, `xor`, `sll`, `srl`, `sra`, `slt`, `sltu`.
    - **RV32I Immediates**: `addi`, `andi`, `ori`, `xori`, `slli`, `srli`, `srai`, `slti`, `sltiu`, `lui`, `auipc`.
    - **Memory Loads/Stores**: `lw`, `lh`, `lhu`, `lb`, `lbu`, `sw`, `sh`, `sb`.
    - **Branches & Jumps**: `beq`, `bne`, `blt`, `bge`, `bltu`, `bgeu`, `jal`, `jalr`.
    - **RV32M Multiply/Divide**: `mul`, `mulh`, `mulhsu`, `mulhu`, `div`, `divu`, `rem`, `remu`.
    - **RV32A Atomic**: `lr.w`, `sc.w`, `amoswap.w`, `amoadd.w`, `amoxor.w`, `amoand.w`, `amoor.w`, `amomin.w`, `amomax.w`.
    - **Pseudo-Instructions**: `li`, `la`, `mv`, `not`, `neg`, `j`, `jr`, `ret`, `call`, `tail`, `nop`, `beqz`, `bnez`, `blez`, `bgez`, `bltz`, `bgtz`, `bgt`, `ble`, `seqz`, `snez`, `sltz`, `sgtz`.
    - **System & Control**: `ecall`, `ebreak`, `fence`.
  - Asserts `assembled instructions count >= 90` with zero error flags.
- **Run Command**: `node tests_v2/test_all_instructions_v2.js`

---

### 6. `test_execution_programs.js` — Algorithmic Simulation Execution Test
- **Purpose**: Validates multi-step CPU execution, branch resolution, arithmetic correctness, and register state across complex algorithmic programs.
- **Test Scenarios & Assertions**:
  1. **Factorial Algorithm ($5! = 120$)**:
     - Loads `factorial.asm` example.
     - Executes 29 instruction steps.
     - Asserts final result in register `x10` (`a0`) is exactly `120`.
  2. **Fibonacci Sequence Generator**:
     - Loads `fibonacci.asm` example.
     - Executes 60 instruction steps.
     - Asserts computed Fibonacci numbers in registers: `x1 = 34` ($F_9$), `x2 = 55` ($F_{10}$).
- **Run Command**: `node tests_v2/test_execution_programs.js`

---

## 🛠️ Build & Generator Utilities

### `generate_v2.js`
- **Purpose**: The main build script that generates `riscv_simulator.html` with CodeMirror 6 integration.
- **How It Works**:
  1. Reads the base template and configuration.
  2. Injects the minified standalone CodeMirror 6 bundle (`cm6_bundle.min.js`).
  3. Injects the custom RISC-V stream tokenizer, Catppuccin Mocha theme, breakpoint gutter with highlighted line numbers alone, smart breakpoint snapping, live signature floating tooltip, hover tooltips, and `window.editor` compatibility proxy.
  4. Outputs the self-contained `riscv_simulator.html`.
- **Run Command**: `node tests_v2/generate_v2.js`

---

### `cm6_bundle.min.js` & `cm6_entry.js`
- **`cm6_entry.js`**: Source entrypoint that imports CodeMirror 6 and Lezer modules and attaches them to `window.CM6`.
- **`cm6_bundle.min.js`**: Minified single-file IIFE bundle created with esbuild (`esbuild cm6_entry.js --bundle --minify --outfile=cm6_bundle.min.js`). Contains zero external dependencies and runs 100% offline.
