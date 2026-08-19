# RISC-V Simulator — Specification Document

## Project Overview
A single-file web application (`riscv_simulator.html`) implementing a **RISC-V RV32GC Assembler + Simulator** with an interactive code editor, disassembly view, execution control, and interactive debugging features.

---

## Architecture

### Technology Stack
- **Platform**: Single HTML file (self-contained web app)
- **Language**: HTML + CSS + JavaScript (vanilla, no frameworks)
- **Architecture**: RV32GC (RISC-V 32-bit with Compressed instructions)

### CSS Layout
- **Flexbox layout**: `.main` uses `flex: 1` with `min-height: 0` to prevent collapse
- **Editor container**: `min-height: 300px !important` ensures minimum editor height
- **Disassembly table**: `table-layout: fixed` with `min-width: 30ch` on native/source columns
- **Mobile responsive**: `@media (max-width: 800px)` sets `overflow: auto` on body and main panel

### Core Components
1. **Code Editor**: Syntax-aware textarea with line numbers, syntax highlighting layer, scroll synchronization, and **full undo/redo history** (Ctrl+Z/Ctrl+Y)
2. **Assembler**: Two-pass assembler (label collection → encoding)
3. **Simulator**: Step-by-step execution engine with cycle counting, **pause capability**, and **100M cycle limit**
4. **Disassembly View**: Real-time instruction decode display with **fixed-width aligned columns** (table-layout: fixed)
5. **Memory Viewer**: Code and data segment visualization with **8-byte row wrapping**
6. **Configuration Panels**: Memory segment addresses, instruction cycle counts
7. **Debug Features**: Breakpoints (F9), Pause button, invalid breakpoint validation

---

## Assembler Specification

### Instruction Set Support

#### Base RV32I Instructions
- Load/Store: `lb`, `lh`, `lw`, `sb`, `sh`, `sw`
- ALU: `add`, `sub`, `sll`, `slt`, `sltu`, `xor`, `srl`, `sra`, `or`, `and`
- Branch: `beq`, `bne`, `blt`, `bge`, `bltu`, `bgeu`
- Jump: `j`, `jal`, `jr`, `jalr`
- System: `ecall`, `ebreak`, `csrrw`, `csrrs`, `csrrc`, `nop`
- Pseudo: `mv`, `neg`, `ret`, `li`, `la`, `seqz`, `snez`, `sltz`, `sgtz`

#### Compressed (C) Instructions
- Support for compressed instruction encoding and decoding
- Pseudo-instruction expansion to 32-bit equivalents

#### FENCE Instructions
- `fence`, `fence.i` support

### Pseudo-Instruction Expansions
```
li rd, imm     -> lui + addi / auipc + addi (depending on imm)
la rd, label   -> auipc + addi (label-relative)
mv rd, rs      -> addi rd, rs, 0
neg rd, rs     -> sub rd, x0, rs
ret            -> jr ra / ecall (depending on context)
call label     -> jal rd, label (expanded to auipc+jalr for far jumps)
```

### Branch Pseudo-Instructions
```
beqz rs, label -> beq rs, x0, label
bnez rs, label -> bne rs, x0, label
bgez rs, label -> bge rs, x0, label
bgezal rs, label -> blt x0, rs, label
beqz rd, label -> (compressed form support)
```

---

## Directive Support

### Section Directives
| Directive | Description |
|-----------|-------------|
| `.text` | Switch to code section |
| `.data` | Switch to data section |
| `.section` | Switch to named section |
| `.rodata` | Read-only data section |
| `.bss` | Uninitialized data section |

### Data Directives
| Directive | Description | Size |
|-----------|-------------|------|
| `.word` | 32-bit values (comma-separated) | 4 bytes each |
| `.half` | 16-bit values | 2 bytes each |
| `.byte` | 8-bit values | 1 byte each |
| `.dword` | 64-bit values | 8 bytes each |
| `.space` / `.zero` | Reserve/uninitialized bytes | N bytes |
| `.asciiz` | Null-terminated string | N+1 bytes |
| `.asciz` | Null-terminated string | N+1 bytes |
| `.string` | String without null terminator | N bytes |
| `.ascii` | String without null terminator | N bytes |

### Constant Directives
| Directive | Syntax | Description |
|-----------|--------|-------------|
| `.equ` | `.equ name, value` | Assign constant value |
| `.eqv` | `.eqv name, value` | Alias (same as `.equ`) |
| `.set` | `.set name, value` | Symbol substitution |

**Note**: `.equ`/`.eqv`/`.set` are processed in a pre-pass, allowing earlier constants to be used in later ones.

### Alignment Directives
| Directive | Syntax | Description |
|-----------|--------|-------------|
| `.align` | `.align n` | Align to 2^n bytes |
| `.balign` | `.balign n` | Align to n bytes |
| `.p2align` | `.p2align n, op, max` | Align to 2^n, fill with op |
| `.org` | `.org addr` | Set absolute address |

---

## Address Resolution

### Label Resolution
- Labels are collected in Phase 1 (address assignment pass)
- Resolved in Phase 2 (encoding pass) via `labels` table
- Case-insensitive matching for label lookups

### Symbol Table (`.equ` constants)
- Pre-pass collection allows chained definitions
- Accessible via `symbolTable` lookup
- Case-sensitive matching

### Memory Operand Syntax
```
offset(reg)      -> load/store with base register + displacement
(reg)            -> load/store with base register only
label            -> load/store with label as absolute address
```

**Implementation**: `parseMemOp()` handles:
1. Optional parentheses stripping
2. `offset(reg)` regex matching
3. Plain register identification
4. Label/symbol resolution via `labels` and `symbolTable` tables

---

## Simulator Specification

### Execution Model
- **PC**: Program counter (32-bit, word-aligned)
- **Registers**: 32 general-purpose registers (x0-x31)
- **Memory**: Unified address space with separate text/data regions
- **MMIO**: Memory-mapped I/O for system calls and device interaction
- **Max Cycles**: 100,000,000 (100 million) before forced stop
- **Pause**: `running` flag checked each iteration; Pause button sets `running = false`

### System Call Interface (MIPS-style)
| a7 value | Function | a0 input | Description |
|----------|----------|----------|-------------|
| 1 | print_int | integer | Print integer to console |
| 4 | print_string | pointer | Print null-terminated string |
| 8 | read_int | - | Read integer from input |
| 9 | sbrk | size | Allocate heap memory |
| 10 | exit | - | Terminate program |
| 30 | exit | code | Exit with status code |
| 42 | get_time | - | Get cycle count |
| 43 | get_time_ns | - | Get nanosecond count |

### MMIO Registers
| Address Offset | Register | Description |
|---------------|----------|-------------|
| +0 | `MMIO_GETC` | Read character input |
| +4 | `MMIO_PUTC` | Write character output |
| +8 | `MMIO_STATUS` | I/O status flag |

### Cycle Counting
- Configurable cycles per instruction type
- Accessed via "Cycles" panel
- Tracks total, dynamic, and per-type instruction counts

---

## Memory Model

### Memory Segments
| Segment | Default Base | Description |
|---------|-------------|-------------|
| Code (text) | `0x10000` | Executable instructions |
| Data | `0x20000` | Initialized data, constants |
| Stack | `0x7ffffc` | Grows downward from top |
| MMIO | `0x10000000` | Memory-mapped I/O region |

### Segment Configuration
- Configurable via "Segments" panel
- All bases must be word-aligned (address & ~3)
- Default values can be restored via "Reset Defaults"

### Memory Layout
```
Low Address -> High Address
[Code Segment] -> [Data Segment] -> [Stack] -> [MMIO Region]
(0x10000)       (0x20000)        (0x7ffffc)  (0x10000000)
```

---

### Memory Viewer Display
- Displays 8 bytes per row (aligned to 8-byte boundaries)
- Each row shows: hex address, 8 hex bytes (with word gap after 4th byte), ASCII representation
- Changed bytes highlighted during execution
- Click hex byte to edit; double-click to edit as 32-bit word

---

## Editor Specification

### Code Editor Features
- **Line numbers**: Synced with scroll position
- **Syntax highlighting**: Via overlay layer (`#highlightLayer`)
- **Scroll sync**: `syncScroll()` function maintains alignment
- **Input handling**: `oninput="updateEditor()"` for real-time assembly
- **Breakpoints**: Toggleable per line number with **invalid line validation**
- **Undo/Redo**: `EditorHistory` class tracking up to 100 states

### Editor History (Undo/Redo)
```javascript
class EditorHistory {
  constructor(editor) {
    this.editor = editor;
    this.history = [];        // Array of editor value strings
    this.currentIndex = -1;   // Position in history stack
    this.maxHistory = 100;    // Maximum stored states
    this.ignoreInput = false; // Prevents recursive state pushes
  }
  pushState()   // Record current editor state
  undo()        // Restore previous state, dispatch 'input' event
  redo()        // Restore next state, dispatch 'input' event
  initialState() // Initialize history with current editor value
}
```

- State is pushed on every `updateEditor()` call
- Duplicate consecutive states are not recorded
- Undo/Redo dispatches an `input` event to update syntax highlighting and assembly

### Editor Structure
```
.editor-wrapper
  .line-numbers (scrolling container)
  .code-area
    .editor-container
      .highlight-layer (z-index: 3, overlay)
      textarea (z-index: 2, input layer)
.console
```

### Scroll Synchronization
```javascript
function syncScroll() {
  highlightLayer.scrollTop = editor.scrollTop;
  highlightLayer.scrollLeft = editor.scrollLeft;
  lineNumbers.scrollTop = editor.scrollTop;
}
```

### Execution Highlight
- `highlightCurrentLine()` updates execution marker position
- Marker top: `(currentExecLine - 1) * 20 + 12` pixels
- Marker class: `.exec-marker`

### Breakpoint Validation
- `toggleBreakpoint(line)` validates line number before setting
- Rejects line numbers < 1 or > last non-empty line in editor
- Invalid lines produce warning: "Invalid breakpoint: line N is beyond code (max: M)"
- Feedback logged: "Breakpoint set/removed at line N"

---

## UI Components

### Toolbar Buttons
| Button | Function | Description |
|--------|----------|-------------|
| Open | `fileLoader.click()` | Load `.asm`, `.s`, or `.txt` file |
| Save | `saveFile()` | Save editor content as `.asm` file |
| Undo | `editorHistory.undo()` | Undo last edit (Ctrl+Z) |
| Redo | `editorHistory.redo()` | Redo last undone edit (Ctrl+Y / Ctrl+Shift+Z) |
| Assemble | `assembleOnly()` | Assemble without running |
| Run | `runProgram()` | Execute from start (F5) |
| Pause | `togglePause()` | Pause execution (visible during run only) |
| Step | `stepOnce()` | Single step (F8) |
| Back | `stepBack()` | Back step (Shift+F8) |
| Reset | `resetAll()` | Clear state and memory |
| Cycles | `toggleCyclesPanel()` | Configure instruction cycles |
| Segments | `toggleMemSegmentsPanel()` | Configure memory addresses |

### Pause Button Behavior
- **Hidden by default**, shown only during `runProgram()` execution
- Clicking Pause sets `running = false`, which exits the run loop after the current instruction completes
- The loop checks `running` on each iteration; since JavaScript is single-threaded, the button is only responsive when the loop yields (at breakpoints, errors, or cycle limit)
- When paused, registers, memory, stats, and disassembly are updated to reflect current state

### Configuration Panels
- **Cycles Panel**: Per-instruction-type cycle count configuration
- **Segments Panel**: Memory region base address configuration

### Status System
- `setStatus(message, type)`: Info, success, error states
- Console logging with timestamp and type indication

---

## Example Programs

### Included Examples
1. **Basic** — Fundamental instructions and control flow
2. **Fibonacci** — Iterative fibonacci computation with loop
3. **Factorial** — Recursive factorial with stack operations
4. **Loop and Array** — Array processing with memory access
5. **I/O and M-Ext** — System calls and MMIO operations

### Example Code Patterns
```asm
# Fibonacci-like loop
li x28, 0x20000      # Load immediate (large value)
la x28, data0        # Load address via label
sw x2, 0(x28)        # Store word with label base
lw x1, 0(x28)        # Load word with label base
addi x3, x3, 1       # Increment register
j loop               # Unconditional jump
beqz x1, there       # Branch if zero
bnez x2, there       # Branch if not zero
```

---

## Assembly Process

### Two-Pass Assembly

#### Phase 1: Address Assignment and Label Collection
1. Initialize `labels = {}` and `symbolTable = {}`
2. Process `.equ`/`.eqv`/`.set` directives (pre-pass)
3. Iterate lines, tracking `section`, `textAddr`, `dataAddr`
4. Collect labels: `labels[label_name] = getAddr()`
5. Size directives: `.word`, `.byte`, `.space`, etc.

#### Phase 2: Encoding
1. Reset `textAddr`, `dataAddr` to base addresses
2. Encode each instruction: `encodeInstruction(mnemonic, args, address)`
3. Resolve labels, symbols, and immediates
4. Handle pseudo-instruction expansion
5. Output: `machineCode[]` array of `{address, bytes, line, error}`

### Instruction Encoding
- **Bytes**: Little-endian 4-byte array per instruction
- **Address**: Absolute word-aligned address
- **Error**: `null` if valid, string if assembly error

---

## Environment and Deployment

### Runtime Requirements
- **Browser**: Modern browser with ES6+ support
- **File Format**: Single `.html` file
- **Dependencies**: None (fully self-contained)

### File I/O
- **Input**: `<input type="file">` for `.asm`, `.s`, `.txt` files
- **Output**: Blob API for client-side `.mem` file generation
- **Download**: Temporary anchor element click simulation

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| F5 | Run program |
| F8 | Step forward |
| Shift+F8 | Back step |
| F9 | Toggle breakpoint on current line |
| Ctrl+Enter | Assemble only |
| Ctrl+S | Save file |
| Ctrl+Z | Undo (in editor) |
| Ctrl+Y | Redo (in editor) |
| Ctrl+Shift+Z | Redo (in editor) |
| Tab | Insert tab (in editor) |
| F9 | Toggle breakpoint |
| Ctrl+Z | Undo last edit |
| Ctrl+Y / Ctrl+Shift+Z | Redo last undone edit |
| Ctrl+S | Save file |
| Ctrl+Enter | Assemble only |

---

## Testing and Validation

### Test Cases
1. **`lw s3, delay_val`** — Label base register mode
   - Expected: `{offset: label_address, reg: 0}`
   
2. **`lw a0, 0(sp)`** — Offset register mode
   - Expected: `{offset: 0, reg: 2}` (sp = x2)

3. **`.dword 0x1122334455667788`** — 64-bit directive
   - Expected: 8 bytes, two little-endian words

4. **`.equ` chaining** — Earlier constants in later definitions
   - Expected: All symbols resolved correctly

5. **Label resolution** — `delay_val:` defined before `lw`
   - Expected: `labels['delay_val']` accessible during Phase 2

### Known Issues Addressed
- `.eqv` comma parsing fix
- Label support in `parseMemOp` for memory operands
- Separate text/data `.mem` dump functionality (removed in v2.0)
- `.dword` directive rendering
- Base address removal (uses configurable segments)
- In-place memory editing during assembly
- **v2.0**: Fixed column alignment, 8-byte memory view, invalid breakpoint handling, mobile scrolling

---

## Future Extensions

### Potential Features
1. **Memory Viewer**: Interactive hex dump with edit capability (partially implemented)
2. **Trace Output**: Instruction-by-instruction execution log
3. **Waveform Viewer**: Signal timing visualization
4. **Simulation Speed Control**: Adjustable run speed

### Configuration Persistence
- Save custom cycle counts to localStorage
- Remember memory segment customizations
- Persist editor layout preferences

---

## Version History

| Version | Changes |
|---------|---------|
| 1.0 | Initial implementation: Assembler, simulator, editor |
| 1.1 | `.eqv` comma fix, base address removal |
| 1.2 | `parseMemOp` label support, separate `.mem` dumps |
| 1.3 | `.dword` directive rendering, in-place memory editing |
| 2.0 | **UI Improvements**: Undo/Redo (Ctrl+Z/Y), fixed column alignment, 8-byte memory view, Pause button, 100M cycle limit, invalid breakpoint handling, mobile scrolling fixes, removed dump buttons |
| 2.1 | **Peripherals Tab**: Single-row LED display (8-bit + clock LED + PC[8:2] with dividers), single-row scrollable DIP switches (16), 2-row grid push buttons (BTNL/BTNC/BTNR/BTND) with click-to-toggle interaction, SVG-based 7-segment display (hex a-f rendering on 22x40 SVGs) |

---

## v2.0 UI Improvements

### Editor Enhancements
- **Undo/Redo System**: Full history management with up to 100 states
  - `Ctrl+Z` to undo
  - `Ctrl+Y` or `Ctrl+Shift+Z` to redo
  - Automatic state tracking on every edit
  - Duplicate state prevention

### Display Improvements
- **Fixed Column Alignment**: `table-layout: fixed` ensures consistent column widths in disassembly view
- **8-byte Memory View**: Memory viewer now displays 8 bytes per row instead of 16 for better readability
- **Mobile Responsive**: Fixed scrolling issues on mobile devices with proper overflow handling

### Execution Controls
- **Pause Button**: Appears during execution to allow stopping long-running programs
- **Increased Cycle Limit**: Maximum cycles increased from 100,000 to 100,000,000
- **Breakpoint Validation**: Invalid breakpoint line numbers are now detected and reported

### Removed Features
- **Dump Buttons**: Removed "Dump txt", "Dump data", and "Dump all" buttons (functionality not directly useful for export)

---


## v2.1 Peripherals Tab

### LEDs
- Single-row LED display with 8 LEDs (bit 7 to bit 0)
- Clock LED (blinks at divided clock rate)
- PC[8:2] bits (7 LEDs showing upper PC bits)
- Dividers between sections for visual clarity
- CSS: `.led`, `.led-pc`, `.led-clock`, `.led-divider`, `.led-label`

### DIP Switches
- 16 DIP switches in a single row with horizontal scrolling
- Click to toggle on/off
- CSS: `.dip-container`, `.dip-switch`

### Push Buttons
- 2-row grid layout (BTNU above RST, BTND below C):
  - Row 1: BTNL | BTNC | BTNU | BTNR
  - Row 2: (hidden) | BTND | RST | (hidden)
- Click-to-toggle interaction (replaces "hold" behavior)
- CSS: `.pb-container`, `.pb-btn`, `.pause-btn`, `.reset-btn`, `.pressed`

### 7-Segment Display
- SVG-based rendering (22x40 viewBox per digit)
- Full hex support (0-F) with custom segment paths
- 7 segments: a(top), b(top-right), c(bottom-right), d(bottom), e(bottom-left), f(top-left), g(middle)
- CSS: `.sevseg-container`, `.sevseg-digit`, `.sevseg-segment` (lit/unlit)

---


## Author Notes

- The simulator uses **MIPS-style system calls** (a7 for function code)
- All addresses are **word-aligned** (address & ~3)
- Memory dumps use **Verilog `$readmemh`** format for FPGA simulation compatibility
- The code/data memory separation is configurable but **must maintain order** (code before data)
- The assembler is **case-insensitive** for mnemonics but **case-sensitive** for labels (with lowercased lookup)
