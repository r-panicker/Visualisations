### **Specification: RISC-V Compact Interrupt Simulator (`demo_irq.html`)**

**1. Overall Purpose**
This HTML file implements a visual, interactive simulator for a simplified RISC-V processor core, specifically designed to demonstrate the concepts of interrupt handling, including both **Vectored** and **Non-Vectored** interrupt modes. The simulation allows users to step through the execution flow, trigger interrupts, and observe the state changes in registers and code execution.

**2. Visual Design & Styling (CSS)**
*   **Theme:** Dark mode (`#1e1e2e` background, `#cdd6f4` text).
*   **Layout:** Uses a two-panel layout (`.row-layout`):
    *   **Left Panel (Processor Core & I/O):** Displays CPU registers (PC, EPC, IRQ ID) and interactive Peripherals (A and B) that can trigger interrupts.
    *   **Right Panel (Code & Memory):** Displays the main program code, Interrupt Service Routines (ISRs), and the Vector Table.
*   **Instruction Highlighting:** Code blocks support dynamic highlighting:
    *   `.highlight`: Current instruction being executed.
    *   `.interrupt-target`: An instruction that is the target of an interrupt.
    *   `.active-vector`: Used in the Vector Table display when a context switch is occurring.
    *   `.active-vector`: Used in the Vector Table display when a context switch is occurring.

**3. User Interface Components (HTML Structure)**
*   **Header Controls:** Contains mode selection radio buttons (`Vectored` / `Non-Vectored`) and control buttons (`Reset`, `Step Back`, `Next Step`).
*   **State Display:** A dedicated area showing the current operational state of the simulator (e.g., `MAIN_RUNNING`, `INTERRUPT_PENDING`).
*   **Registers Panel:** Displays key CPU state variables:
    *   `PC` (Program Counter)
    *   `EPC` (Exception Program Counter)
    *   `IRQ ID` (Current Interrupt ID)
*   **Interrupt Controller:** Contains interactive peripheral elements (Peripheral A/B). Clicking these elements triggers an interrupt if the system is in `MAIN_RUNNING` mode.
*   **Code Visualization:**
    *   **Main Program:** Contains the primary execution loop (e.g., `0x0000` to `0x000C`).
    *   **ISR Containers:** Separate sections for Vectored ISRs (ISR A, ISR B) and the General ISR (for Non-Vectored mode).
    *   **Handler Functions:** Code blocks showing the routines called during interrupt handling (e.g., `handle_irq1`, `handle_irq2`).
    *   **Vector Table:** Displays the starting addresses for each interrupt vector (e.g., IRQ 1 maps to `0x8000`).
    *   **Polling Indicators:** Visual indicators (`📋`, `🔍`, `✅`) used exclusively in Non-Vectored mode to show the polling sequence progress.

**4. Core Functionality (JavaScript State Machine)**
The simulation operates based on a state machine managed by the `systemState` object and advanced by the `nextStep()` function.

*   **State Transitions:**
    *   `MAIN_RUNNING` $\rightarrow$ `INTERRUPT_PENDING` (If an interrupt is triggered).
    *   `INTERRUPT_PENDING` $\rightarrow$ `CONTEXT_SWITCH` (If in Vectored mode).
    *   `INTERRUPT_PENDING` $\rightarrow$ `ISR_RUNNING` (If in Non-Vectored mode, jumps to `0x9000`).
    *   `CONTEXT_SWITCH` $\rightarrow$ `ISR_RUNNING` (Jumps to the appropriate ISR address based on `Interrupt_ID`).
    *   `ISR_RUNNING` $\rightarrow$ `INTERRUPT_RETURN` (When an `eret` instruction is encountered).
    *   `INTERRUPT_RETURN` $\rightarrow$ `MAIN_RUNNING` (Restores PC from EPC).

*   **Mode-Specific Logic:**
    *   **Vectored Mode:** Uses a direct lookup from the `Interrupt_ID` to the ISR starting address (e.g., ID 1 $\rightarrow$ `0x8000`).
    *   **Non-Vectored Mode:** Implements a polling sequence starting at `0x9000`. The execution flow explicitly checks the `Interrupt_ID` against the status register (`INT_STATUS`) to decide whether to call `handle_irq1` or `handle_irq2` via `jal` instructions.

**5. Control Flow Mechanics**
*   **Execution Advancement:** The `nextStep()` function advances the simulation by one instruction cycle, updating the `PC` based on the current state logic.
*   **History:** A `history` array stores snapshots of the `systemState` before each step, enabling the `stepBack()` functionality.
*   **Interrupt Acknowledgment:** In both modes, the interrupt is considered acknowledged (and the visual trigger cleared) when the corresponding acknowledgment instruction (`ack_int_1` or `ack_int_2`) is executed within the ISR.