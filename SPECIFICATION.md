# RISC-V Interrupt Simulator - Complete Specification

## 🎯 Project Goal

Create a single-file HTML/CSS/JavaScript simulator that accurately models RISC-V CPU behavior, specifically focusing on the transition from normal execution to interrupt handling (both vectored and non-vectored modes).

---

## 🖥️ I. Interface & UX Requirements

### 1. Compact Layout
- Entire simulation must be stacked vertically (`flex-direction: column`)
- Maximize vertical compactness while maintaining clarity
- All content should fit within a standard monitor viewport

### 2. Control Panel
- **Mode Selector**: Radio buttons for "Vectored" and "Non-Vectored" modes
  - Radio buttons must be stacked vertically (each in its own div container)
  - Use `flex-direction: column` for the mode-group to stack options
- **Reset Button**: Resets simulation to initial state (use simple Unicode symbol like ↻)
- **Step Back Button**: Allows undoing steps (disabled when history is empty, abbreviated as "Back")
- **Next Step Button**: Advances simulation by one step (abbreviated as "Step")
- **Button Icons**: Use plain Unicode symbols (↻, ⏪, ⏩) instead of emoji for consistent alignment
- **Spacing**: Minimal gap (8px) between buttons for compact layout

### 3. Mobile Responsive Design
- **Breakpoint**: 768px (apply responsive styles for screens narrower than this)
- **Control Panel on Mobile**:
  - Stack controls vertically using `flex-direction: column`
  - Mode selector and button group each take full width
  - Buttons share space evenly with `flex: 1`
  - Reduce button padding and font size for touch-friendly sizing
- **Layout on Mobile**:
  - Panels stack vertically instead of side-by-side
  - Peripherals stack vertically with max-width constraint (200px)
  - ISR containers stack vertically
- **Typography on Mobile**:
  - Reduce heading sizes (h1: 1.2em, h2: 1em, h3: 0.9em)
  - Reduce code font size (0.7em)
  - Reduce code block height (80px)
- **Spacing on Mobile**:
  - Reduce body padding (5px)
  - Reduce panel padding (6px)
  - Reduce register box padding and font size

### 3. Registers Display
- Show **PC** (Program Counter)
- Show **EPC** (Exception Program Counter)
- Show **IRQ ID** (Current Interrupt ID, or "N/A" if none)

### 4. State Display
- Prominently display current state (e.g., `MAIN_RUNNING (Vectored)`)

### 5. Code Highlighting
- Active instruction highlighted in green
- Vector table entry highlighted in blue during CONTEXT_SWITCH
- Vector table highlighting must clear after interrupt return

### 6. Peripherals
- Two peripherals: Peripheral A (ID 1) and Peripheral B (ID 2)
- Display side-by-side on the same line (no wrapping)
- Width: 160px each, margin: 2px
- Peripheral container: `justify-content: center`, `flex-wrap: nowrap`
- **Layout**: Text and IRQ indicator on same line (no separate "IRQ Line" label)
- **Mobile**: Peripherals stack vertically with max-width constraint (180px)
- **IRQ Indicator**: Small colored rectangle positioned to the right of peripheral text

### 7. Immediate Visual Feedback
- When user clicks a peripheral, the peripheral border glows (`asserted-trigger` class)
- IRQ line indicator lights up when interrupt is active
- Glow must clear when interrupt is acknowledged in ISR

---

## ⚙️ II. Core Simulation Logic & State Machine

### State Definitions
- `MAIN_RUNNING`: Normal program execution
- `INTERRUPT_PENDING`: Interrupt triggered, waiting to be processed
- `CONTEXT_SWITCH`: (Vectored mode only) Saving context and loading vector
- `ISR_RUNNING`: Executing interrupt service routine
- `INTERRUPT_RETURN`: Returning from interrupt to main program

### A. State Transitions & Timing

#### MAIN_RUNNING → INTERRUPT_PENDING
- Triggered when user clicks a peripheral while in MAIN_RUNNING state
- Set `Interrupt_Active = true`
- Set `Interrupt_ID` to the peripheral's ID (1 or 2)
- Add `asserted-trigger` class to clicked peripheral

#### INTERRUPT_PENDING → CONTEXT_SWITCH (Vectored) or ISR_RUNNING (Non-Vectored)
- **Vectored Mode**: Transition to CONTEXT_SWITCH
- **Non-Vectored Mode**: 
  - Save `EPC = PC` (CRITICAL: Must save before changing PC)
  - Set `PC = 0x9000` (single ISR entry point)
  - Transition to ISR_RUNNING

#### CONTEXT_SWITCH (Vectored Mode Only)
1. Save `EPC = PC` (CRITICAL: Before changing PC)
2. Look up vector address from Vector Table using Interrupt_ID:
   - ID 1 → 0x8000 (ISR A)
   - ID 2 → 0x8800 (ISR B)
3. Load vector address into PC
4. Transition to ISR_RUNNING

#### ISR_RUNNING → INTERRUPT_RETURN
- Transition when `eret` instruction is executed
- In vectored mode: at address 0x8008 or 0x8808
- In non-vectored mode: at address 0x9014

#### INTERRUPT_RETURN → MAIN_RUNNING
1. Restore `PC = EPC`
2. Clear `Interrupt_Active = false`
3. Clear `Interrupt_ID = null`
4. Clear `EPC = null`
5. Transition to MAIN_RUNNING

### B. Mode Handling

#### Vectored Mode
- Use Vector Table lookup to determine ISR address
- ISR A (ID 1) at 0x8000-0x8008
- ISR B (ID 2) at 0x8800-0x8808
- Clear peripheral glow when acknowledgment instruction executes:
  - ID 1: Clear at 0x8000
  - ID 2: Clear at 0x8800

#### Non-Vectored Mode
- All interrupts jump to single entry point at 0x9000
- ISR contains polling logic to determine which device caused interrupt
- Clear peripheral glow at first ISR instruction (0x9000)
- Show polling indicators to visualize the software polling sequence
- Vector table should be HIDDEN in non-vectored mode

### C. Peripheral Acknowledgment (Glow Fix)
- Peripheral glow (`asserted-trigger` class) must be cleared in ISR logic
- **Vectored Mode**: Clear when acknowledgment instruction executes
- **Non-Vectored Mode**: Clear at first ISR instruction (0x9000)
- Glow should fade automatically when `Interrupt_Active` is set to false

---

## 💾 III. Data Structures & Memory Layout

### A. RISC-V Instructions (PC increments by +4 bytes)

#### Main Program (0x0000-0x000C)
```
0x0000: loop_start: lw t0, 0(s0);    // Load from memory
0x0004: addi t0, t0, 1;              // increment
0x0008: sw t0, 0(s0);                // Store to memory
0x000C: bne t3, t4, loop_start;      // Branch to start
```

#### Vectored ISR A (0x8000-0x8008)
```
0x8000: ack_int_1;    // Acknowledge IRQ 1
0x8004: addi t1, t1, 10; // Process data
0x8008: eret;         // Exception Return
```

#### Vectored ISR B (0x8800-0x8808)
```
0x8800: ack_int_2;    // Acknowledge IRQ 2
0x8804: addi t2, t2, 20; // Process data
0x8808: eret;         // Exception Return
```

#### Non-Vectored ISR (0x9000-0x9014)
```
0x9000: lw t3, INT_STATUS;         // Read interrupt status
0x9004: bne t3, ID_1, check_id2;   // Branch if not ID 1
0x9008: jal ra, handle_irq1;       // Call handler 1
0x900C: check_id2: bne t3, ID_2, poll_end; // Branch if not ID 2
0x9010: jal ra, handle_irq2;       // Call handler 2
0x9014: poll_end: eret;            // Return
```

#### Handler Functions (Non-Vectored Mode)
```
handle_irq1:
0x9100: ack_int_1;    // Ack IRQ1
0x9104: addi t1, t1, 10; // Process
0x9108: ret;          // Return (to ra)

handle_irq2:
0x9200: ack_int_2;    // Ack IRQ2
0x9204: addi t2, t2, 20; // Process
0x9208: ret;          // Return (to ra)
```

### B. Vector Table
| IRQ | ID | Address |
|-----|----|---------|
| IRQ 1 | 1 | 0x8000 |
| IRQ 2 | 2 | 0x8800 |

### C. State History
- Implement `history[]` array for Step Back functionality
- Save state snapshot before each step
- Maximum 50 history entries (shift oldest when full)

### D. Defensive Coding
- Check for null/undefined before accessing EPC
- Check for null/undefined before accessing Interrupt_ID
- All state handlers must have defensive checks

---

## 🎨 IV. Visual Design Requirements

### Color Scheme
- Background: `#1e1e2e` (dark blue-gray)
- Panel background: `#29293e`
- Control panel: `#3c3c54`
- Text: `#cdd6f4` (light gray-blue)
- Headings: `#89b4fa` (light blue)
- Register values: `#f9e2af` (yellow)
- Highlighted instruction: `#444466` with `#a6e3a1` border
- Active vector: `#ffd598` with `#f9e2af` border
- Peripheral glow: `#f38ba8` (pink/red)
- Polling indicator active: `#f38ba8`
- Polling indicator handled: `#a6e3a1` (green)

### Typography
- Font: 'Consolas', monospace
- Code font size: 0.8em
- Heading font size: 0.95em
- Line height: 1.2

### Layout Dimensions
- Code block height: 100px
- Peripheral width: 140px
- Peripheral margin: 2px
- Panel padding: 8px
- Header controls padding: 8px 10px

---

## 🔧 V. Implementation Details

### HTML Structure
```
<body>
  <h1>🧠 RISC-V Interrupt Simulator</h1>
  
  <!-- Controls -->
  <div class="header-controls">
    <div class="controls-group mode-group">
      <!-- Mode radio buttons -->
    </div>
    <div class="controls-group button-group">
      <!-- Reset, Step Back, Next Step buttons -->
    </div>
  </div>
  
  <!-- State Display -->
  <div id="state-display">State: INITIALIZING</div>
  
  <!-- Main Container -->
  <div class="container">
    <!-- Left Panel: CPU & Peripherals -->
    <div class="panel">
      <!-- Registers -->
      <div id="registers">
        <!-- PC, EPC, IRQ ID -->
      </div>
      
      <!-- Peripherals -->
      <div id="interrupt-controller">
        <!-- Peripheral A, Peripheral B -->
      </div>
    </div>
    
    <!-- Right Panel: Code & Memory -->
    <div class="panel">
      <!-- Main Program Code -->
      <div id="main-program" class="code-block"></div>
      
      <!-- ISRs (Vectored) -->
      <div id="isr-vectored-container">
        <!-- ISR A, ISR B -->
      </div>
      
      <!-- ISR (Non-Vectored) -->
      <div id="isr-nonvectored-container">
        <!-- Polling ISR -->
        <!-- Polling Indicators -->
        <!-- Handler Functions -->
      </div>
      
      <!-- Vector Table -->
      <div id="vector-table-display">
        <!-- IRQ 1 → 0x8000, IRQ 2 → 0x8800 -->
      </div>
    </div>
  </div>
</body>
```

### CSS Classes
- `.container`: Flex column layout
- `.panel`: Card-style container
- `.code-block`: Scrollable code display
- `.instruction`: Individual instruction line
- `.instruction.highlight`: Active instruction (green)
- `.instruction.active-vector`: Vector lookup highlight (blue)
- `.peripheral`: Peripheral device box
- `.peripheral.asserted-trigger`: Glowing border
- `.peripheral-irq.asserted`: Lit IRQ line
- `.polling-indicator`: Status indicator
- `.polling-indicator.active`: Active (pink)
- `.polling-indicator.handled`: Completed (green)
- `.vector-entry.active-vector`: Active vector highlight

### JavaScript Functions

#### Core Functions
- `resetSimulation()`: Reset all state and UI
- `nextStep()`: Advance simulation by one step
- `stepBack()`: Undo last step
- `triggerInterrupt(id)`: Handle peripheral click
- `render()`: Update all UI elements

#### State Handlers
- `handleMainRunning()`: Main program execution
- `handleInterruptPending()`: Transition to ISR
- `handleContextSwitch()`: Vectored mode vector lookup
- `handleISRRunning()`: Vectored ISR execution
- `handleNonVectoredISR()`: Non-vectored polling & branching
- `handleInterruptReturn()`: Return from interrupt

#### Utility Functions
- `saveState()`: Save state to history
- `updateRegisters()`: Update PC, EPC, IRQ ID display
- `highlightCode(state)`: Highlight active instruction
- `updatePeripherals()`: Update IRQ line indicators
- `updateControls()`: Update button states
- `updateISRVisibility()`: Show/hide ISR sections based on mode
- `resetPollingIndicators()`: Clear polling indicators
- `setPollingIndicator(id, state)`: Set indicator state

#### Non-Vectored ISR Branching Logic
```javascript
// At 0x9004 (bne t3, ID_1, check_id2):
if (Interrupt_ID !== 1) {
    PC = 0x900C; // Branch to check_id2
} else {
    PC = 0x9008; // Fall through to jal
}

// At 0x9008 (jal ra, handle_irq1):
PC = 0x9100; // Jump to handler

// At 0x9108 (ret from handle_irq1):
PC = 0x900C; // Return to check_id2

// At 0x900C (bne t3, ID_2, poll_end):
if (Interrupt_ID !== 2) {
    PC = 0x9014; // Branch to poll_end
} else {
    PC = 0x9010; // Fall through to jal
}

// At 0x9010 (jal ra, handle_irq2):
PC = 0x9200; // Jump to handler

// At 0x9208 (ret from handle_irq2):
PC = 0x9014; // Return to poll_end
```

---

## ✅ VI. Key Fixes Required (From Original Implementation)

1. **EPC Timing**: EPC must be saved BEFORE PC is changed to vector/handler address
2. **Interrupt Clearing**: Interrupt_Active must be cleared within ISR handler (not just at return)
3. **Defensive Coding**: Check for null values for EPC and Interrupt_ID in all handlers
4. **Loop Logic**: Main program branch at 0x000C correctly jumps to 0x0000
5. **PC Increments**: All instructions increment PC by +4 (not +0x100)
6. **Case Sensitivity**: Instruction ID lookup must be case-insensitive (0x900C vs 0x900c)
7. **Vector Table**: IRQ 2 points to 0x8800 (not 0x9000)
8. **Peripheral Glow**: Must clear when interrupt is acknowledged, not just at return
9. **Mode Display**: ISR titles must reflect current mode
10. **Vector Table Visibility**: Hide vector table in non-vectored mode

---

## 📋 VII. Testing Checklist

- [ ] Vectored Mode - ID 1:
  - [ ] Click Peripheral A
  - [ ] PC jumps to 0x8000
  - [ ] Vector table highlights IRQ 1 → 0x8000
  - [ ] Peripheral glow clears at 0x8000
  - [ ] ISR executes and returns
  - [ ] PC restores to pre-interrupt value
  - [ ] Vector table highlight clears

- [ ] Vectored Mode - ID 2:
  - [ ] Click Peripheral B
  - [ ] PC jumps to 0x8800
  - [ ] Vector table highlights IRQ 2 → 0x8800
  - [ ] Peripheral glow clears at 0x8800
  - [ ] ISR executes and returns
  - [ ] PC restores correctly

- [ ] Non-Vectored Mode - ID 1:
  - [ ] Click Peripheral A
  - [ ] PC jumps to 0x9000
  - [ ] Polling indicators light up correctly
  - [ ] Branch at 0x9004 falls through to 0x9008
  - [ ] jal to handle_irq1 (0x9100)
  - [ ] ret returns to 0x900C (check_id2 highlighted!)
  - [ ] Branch at 0x900C jumps to 0x9014
  - [ ] eret returns to main program
  - [ ] "Check IRQ2" indicator stays gray (not visited)

- [ ] Non-Vectored Mode - ID 2:
  - [ ] Click Peripheral B
  - [ ] PC jumps to 0x9000
  - [ ] Branch at 0x9004 jumps to 0x900C
  - [ ] "Check IRQ2" indicator lights up
  - [ ] jal to handle_irq2 (0x9200)
  - [ ] ret returns to 0x9014
  - [ ] eret returns to main program

- [ ] Step Back:
  - [ ] Works correctly in all states
  - [ ] Disabled when history is empty

- [ ] Reset:
  - [ ] Clears all state
  - [ ] Resets to MAIN_RUNNING
  - [ ] Clears all highlights and indicators

---

This specification provides all the details needed to recreate the RISC-V Interrupt Simulator from scratch.
Please note that the above specs are an outline, make reasonable and suitable changes if need be without compromising the spirit, look and feel.
