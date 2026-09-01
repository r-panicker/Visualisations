# RISC-V Simulator — HDL Simulation Mode

**File:** [`riscv_simulator_hdl.html`](riscv_simulator_hdl.html)

A variant of [`riscv_simulator.html`](riscv_simulator.html) that adds a **second
execution engine**: instead of the built-in JavaScript functional model, it can run
**your own Verilog processor**, compiled and simulated in the browser with
**Icarus Verilog built to WebAssembly**.

The original `riscv_simulator.html` is untouched — this is a separate file.

---

## What it does

Switch the toolbar pill from **JS** to **HDL** and Run, Step and Back stop executing the
JavaScript model and start executing *your RTL*. The assembled program is handed to
your design exactly the way Vivado does it — as `AA_IROM.mem` / `AA_DMEM.mem` read by
your Wrapper's own `$readmemh` — and everything your hardware does (LEDs, 7-segment,
OLED, UART, register writes, memory writes, the PC) is fed back into the simulator's
existing panels.

| | Functional (JS) | HDL (Verilog) |
|---|---|---|
| Executes | Built-in RV32GC interpreter | Your uploaded `.v` sources |
| Stepping | Live, instruction at a time | Through a recording — forwards *and* backwards |
| Run / Resume / breakpoints | Yes | Yes — Resume seeks the recording to the next breakpoint |
| Registers panel | Live | Read out of your register file by hierarchical reference |
| Memory panel | Live | Driven by the Wrapper's actual DMEM writes |
| LEDs / 7-seg / OLED / UART | Live | Driven by your hardware's pins |
| Unwritten registers | Shown as `0` | Shown as `xxxxxxxx` — the hardware truth |
| Speed | Millions of instr/sec | ~40k-200k cycles/sec |

---

## Using it

1. **Switch to HDL** — the `JS | HDL` pill in the toolbar. The engine (~2.7 MB of
   WASM) begins loading, and with no sources yet loaded the **🔌 HDL Simulation**
   settings tab opens by itself, because nothing else can happen until it has them.
2. **Load your Verilog** — drop `.v` files **anywhere on the page**, open them with
   **📂 Open**, or use *browse…* on that tab. Include `Wrapper.v`, `RV.v` and **every**
   submodule (`ALU.v`, `Decoder.v`, `Extend.v`, `PC_Logic.v`, `ProgramCounter.v`,
   `RegFile.v`, `Shifter.v`). The file holding `module Wrapper` is tagged in the list,
   and a chip next to the `JS | HDL` pill shows the count — turning amber if there is
   no Wrapper among them.
3. **Assemble a program** as usual (any example, or your own).
4. **Run**, then **Step** / **Back** to move through what the hardware did.
   **Run** becomes **Resume** once there is a recording; **Reset** (⟲) is how you
   ask for a fresh one.

Switching between **JS** and **HDL** does not throw anything away. The recording
survives the trip, and each switch lands on the instruction the other engine had
reached — so you can step through the RTL, hop to the functional model to get
somewhere quickly, and come back to the hardware at the same instruction. Only one
engine ever executes: switching away from a running functional simulation pauses it
first, and the engine toggle is locked while an HDL run is in flight.

### There is no HDL panel

Everything the hardware engine needs is done **once per session**, so it lives in
**⚙ Settings** rather than holding a panel open for the whole run. The panel layout is
the same four panels it has always been — Registers, Memory, Peripherals, Disassembly.

| Where | What |
|---|---|
| ⚙ → **🔌 HDL Simulation** | sources · cycle budget · Trace · Verilog standard · VCD · cross-check · register-file path · *Save testbench* |
| ⚙ → **⏱ JS Simulation** | Max Instructions Per Run · the per-instruction cycle table |

Each tab is named for the engine it configures. **Statement Stepping** applies to both,
so it sits at the top of both — one setting with two controls, kept in step.
| **Toolbar** | Run / Resume · Step · Back · Reset · the source chip · **⭳ VCD** once a run has produced one |
| **Console** (under the editor) | the engine's output, tagged `[HDL]`, next to the assembler's |
| **Status bar** | what the engine is doing right now |

On the JS Simulation tab, the settings are **dimmed, not hidden** while the HDL engine
is the one running — a setting you can still find, that tells you why it is doing
nothing.

The console is **resizable**: drag the bar above it, double-click to reset. A Verilog
compile error can run to many lines, and the height is remembered.

Two readouts worth naming, because they look identical and are not: the toolbar's
**Cycles** is tagged `est` in JS mode (an estimate from the per-instruction table) and
`hw` in HDL mode (real clock edges counted by your simulation). The cycles table
affects only the first.

Nothing is bundled: the Verilog is always yours, uploaded per session.

### The Wrapper is never modified

The simulator only ever *instantiates* your `Wrapper`; it does not read, rewrite or
patch it. Everything it needs, it generates around it as a **testbench** — the same
thing you would write by hand in Vivado. Use **Save testbench** to get that exact file
for offline use with Vivado or `iverilog`.

---

## The testbench is generic

The generated testbench contains **no assembled code, no switch settings and no input
data**. Every one of those is supplied at *run* time:

| Setting | How it arrives |
|---|---|
| Cycle budget, trace level | `+CYCLES=`, `+TRACE=` plusargs |
| DIP, buttons, accelerometer at reset | `+DIP=`, `+PB=`, `+ACCEL=`, `+ADRDY=` plusargs |
| Waveform dump | `+VCD` plusarg |
| Timed input changes | `stim.mem` — `<cycle> <code> <value>` triples |
| UART input | `uart_rx.mem` — `<cycle> <byte>` pairs |
| The program itself | `AA_IROM.mem` / `AA_DMEM.mem`, via your Wrapper's `$readmemh` |

Two consequences worth knowing:

* **It compiles once.** The binary is cached against a hash of your sources, so a
  re-run, a step or an input change skips `ivlpp` and `ivl` entirely — a few hundred
  milliseconds instead of a few seconds.
* **The saved testbench stands alone.** Every plusarg has a working default, so
  `iverilog -o sim *.v cg3207_hdl_tb.v && vvp sim` runs it with no arguments at all.
  Nothing about it is specific to the program you happened to have loaded.

`TRACE` levels: `0` silent, `1` peripherals only, `2` (default) adds the architectural
trace. Your own `$display` output passes through to the HDL console untouched.

### Which clock edge, and why it matters

A timestamp in `stim.mem` or `uart_rx.mem` means **in force during that cycle**, so
an input stamped at cycle *C* is already settled when the instruction of cycle *C*
reads it. The testbench therefore drives it one edge earlier, at the edge that
*starts* cycle *C* — these are nonblocking assignments, and driving them at the edge
that ends *C* would let the instruction read the previous value.

The same reasoning runs the other way. `LED_OUT`, `SEVENSEGHEX`, `UART_TX_valid`,
`OLED_Write` and `UART_RX_ack` are all `output reg` in the Wrapper: the write made by
the instruction of cycle *C* lands at the edge that ends *C* and is only readable
during *C+1*. They are sampled on the **falling** edge, where the new value is
visible but the trace still sits inside step *C* — so the effect is attributed to the
instruction that caused it rather than to the one after it. `MemWrite_out` is
combinational and stays on the rising edge, alongside the instruction record.

Get either of these wrong and everything looks one instruction late: change a DIP
switch while paused on the load that reads it and the old value comes back; write the
LED register and the display updates one Step behind. Section 11 of the test suite pins
both directions down.

### Reading the register file

Register values come from a hierarchical reference into your design. Two tiers, by how
much they can be trusted:

* **Guaranteed** — the Wrapper is fixed, so `dut.PC`, `dut.Instr`, `dut.MemWrite_out`,
  `dut.ALUResult` and `dut.WriteData_out` always exist. The PC, the instruction stream
  and every memory write come from these, and work for *any* core behind that Wrapper.
* **Discovered** — the register bank lives in code you can change. The page looks for a
  32-entry array of 32-bit regs reachable under the Wrapper's core instance, and reports
  what it found under the *Register file* field; type a path there to override it.

Writes are detected by comparing the array against a shadow copy on the falling clock
edge, so **only the array is ever named** — renaming your register file's ports, or the
module itself, cannot break the trace. If the path cannot be resolved at all, the run
falls back to a Wrapper-only testbench: you lose the register view, not the simulation.

### The UART console follows the hardware

`UART_RX_ack` is reported as its own event, so the console's RX FIFO drains exactly
when your hardware takes a byte — `RX_VALID` falls back to 0 on the instruction that
reads `0xFFFF0004`, and comes back if you step *back* over it. Nothing about the
console is guessed from the program.

A **buffered** send has no drip feed here (nothing steps the functional engine's
instruction counter), so the whole sequence is queued at once, spaced by the same
instruction gap you asked for, and delivered on that schedule inside the recording.

### Memory images

`IROM_DEPTH_BITS` and `DMEM_DEPTH_BITS` are read out of *your* Wrapper, so a design
with an enlarged IROM gets a correspondingly sized image. If the program needs more
instruction words than your IROM holds, the console says so rather than letting the
Wrapper quietly fetch NOPs past the end.

Images are built from the assembled memory image, so gaps inside a segment keep their
addresses. Words past the end of the program are left uninitialised (`X`), matching
what Vivado does with a short `$readmemh` file — the resulting "Not enough words"
notice is expected and is filtered from the console.

---

## Execution model: record, then scrub

`vvp` runs to `$finish` and cannot be paused mid-flight, so **stepping does not drive
the simulator at all**. A run records the whole simulation once — one record per PC
change, plus register writes, memory writes and peripheral activity — and Step and Back
move through that recording.

This is better than live stepping on every axis that matters here:

* stepping is instant, because nothing is re-simulated;
* **Back works**, which no real Verilog simulator offers;
* the recording keys on *PC changes*, not on cycles, so it stays correct if you make
  your core multi-cycle or pipelined (`WE_PC` is hardwired to 1 in the single-cycle
  template, but need not be).

Untick **Trace** to record peripheral activity only. That is slightly faster, and
disables Step.

### Run, Resume and breakpoints

Breakpoints work exactly as they do in the functional engine — they are source lines,
and the recording is searched by mapping each recorded PC back to its line.

* **Run** (no recording yet) simulates, then stops at the first breakpoint, or at the
  end of the budget if none is hit.
* **Resume** continues from wherever you are to the next breakpoint. With no
  breakpoints it runs to the end of what has been recorded.
* **Resume at the end of the recording** records another *Cycles* worth and carries
  on — that is the "run for another N cycles" button.
* **Reset** (⟲) discards the recording, so the next Run starts the hardware from
  reset again.

**Statement Stepping** applies here too. With it on, one **Step** covers every machine
instruction the current source line expands to — a `la` pseudo-op, or a C statement —
by seeking that far through the recording, and **Back** covers exactly the same
distance in reverse.

*Cycles* keeps one meaning throughout: how much a fresh Run records, and how much each
Resume adds. It is never rewritten behind your back. Stepping past the end of the
recording also extends it, geometrically rather than by one increment, so a long
program does not re-simulate on every step. If the PC has stopped advancing (a halt,
or a tight self-loop) the console says so instead.

### Changing an input while paused

Because the simulation is deterministic, a change made mid-run does not have to break
the illusion. Flip a DIP switch, press a button, move the accelerometer or type into the
UART console while paused, and the change is **timestamped at the current cycle** and
the run replayed. Everything before that point comes out bit-identical, so you land
exactly where you were with the change now in effect. It costs one re-simulation —
typically a few hundred milliseconds, since the compile is cached.

This is what `stim.mem` and `uart_rx.mem` are for: the timeline of inputs is data the
testbench reads, not something baked into it.

### Cross-checking against the functional model

Tick **Cross-check vs JS model** and each run is followed by a replay of the same
program on the JavaScript interpreter, comparing the PC sequence and every register
write. It reports the *first* instruction where the two disagree, with the cycle, PC,
instruction word and both values — which is usually exactly where an RTL bug is.

Off by default: it costs a second execution of the whole program.

One expected false alarm: if the program reads UART input, the two engines deliver it
on different schedules and will diverge there legitimately.

---

## Where the engine comes from

Three Emscripten modules, tried in order:

1. `https://cdn.jsdelivr.net/gh/senolgulgonul/verisim@main/`
2. `https://senolgulgonul.github.io/verisim/`
3. `verisim/` next to this file — **drop the six files there for offline use**
   (`ivlpp.js/.wasm`, `ivl.js/.wasm`, `vvp.js/.wasm`)

The pipeline mirrors what the `iverilog` driver does natively:

| Stage | Module | In -> out |
|---|---|---|
| Preprocess | `ivlpp` | all `.v` sources -> one expanded source (shared macro table) |
| Compile | `ivl` | expanded source -> `.vvp` bytecode |
| Run | `vvp` | `.vvp` + plusargs + input files -> stdout + optional VCD |

Files move between stages through each module's in-memory filesystem; nothing touches
your disk.

> **Licensing.** These WASM modules are builds of **Icarus Verilog** and are derivative
> works under the **GPL**. They are *loaded at runtime from an external URL*, not
> bundled into this file. If you plan to redistribute a copy with the binaries
> alongside it, check that this is compatible with your own licensing terms first.

---

## Limitations

- **A step is a recording, not a live simulation.** Editing a register value by hand,
  or setting a breakpoint the hardware does not know about, has no effect on the RTL —
  the recording is what the hardware actually did.
- **Registers depend on discovery.** A register file that is not a 32-entry array of
  32-bit regs needs its path typed in by hand. When it cannot be reached at all the
  Registers panel says so in place of the values, rather than showing zeros that were
  never read from your hardware — the PC, instructions, memory and peripherals all
  come from the fixed Wrapper and keep working.
- **Long runs are slow**: roughly 40k-200k cycles/sec. A program that needs millions of
  cycles is better run in JS mode.
- **First run downloads ~2.7 MB** of WASM (cached afterwards).
- Requires a browser context that allows cross-origin `import()` — serve over `http://`
  rather than opening the file with `file://`, or host the engine locally.

---

## Tests

`riscv_simulator_tests/test_hdl_mode.js` — 120 assertions. It loads the page, assembles
through the normal assembler, has the page generate the `.mem` images, the testbench
and the stimulus files, then runs the **real** Icarus pipeline over the unmodified
`RV/*.v` sources:

- **Discovery** finds `dut.RV1.RegFile1.RegBank`, and still finds it after the module,
  the instance and the array are all renamed.
- **The testbench is program-independent**: byte-identical Verilog for two different
  programs with different switch settings, and no DIP value anywhere in it.
- **One compile, many runs**: the same binary gives `LED=0xad` for `+DIP=bead` and
  `LED=0x72` for `+DIP=0072`, and runs standalone with no plusargs at all.
- **The trace** starts at the reset vector, never reports a write to `x0`, captures the
  DIP value landing in a register and the store to the LED MMIO address.
- **Stepping** reaches the right state either side of the instruction that reads the
  DIP switches, and **stepping back undoes the register write**.
- **A mid-run input change** takes effect (`0xad` -> `0xff`) while the history before it
  stays bit-identical — the property the whole interaction model rests on.
- **`HelloWorld`**: `'A'` + CR delivered through `uart_rx.mem` produces the echo *and*
  the greeting stored in DMEM, exercising `UART_RX`/`valid`/`ack` and `UART_TX`/`valid`.
- **MMIO timing, both directions**: an input changed while paused is read by the very
  next instruction (not the one after it), the recording before that point is
  unchanged, and the LED shows its new value as soon as the storing instruction
  completes.
- **Breakpoints**: Resume stops on the breakpoint line, resumes to the next time that
  line is reached, and runs to the end of the recording when there are none.
- **RX_VALID**: both bytes are acknowledged, the FIFO empties on the instruction that
  reads each one, and stepping back puts the byte back.
- **Settings placement**: there is no HDL panel and no HDL panel chip, the dock is
  back to four panels, every HDL setting is on the HDL Simulation tab, the toolbar carries the
  source chip and the VCD download, the console is resizable, 📂 Open accepts `.v`,
  and switching to HDL with no sources loaded opens the tab that asks for them.
- **Statement Stepping on both tabs**: ticking it on either turns it on for both, and
  clearing it on either clears both — it is one setting, not two.
- **Statement Stepping in HDL**: with it off a Step is one machine instruction; with
  it on a Step covers the whole source line and Back undoes exactly that.

```bash
node riscv_simulator_tests/test_hdl_mode.js
```

The engine is expected at the path in `HDL_ENGINE_DIR` (defaults to a scratch copy);
point it at a folder holding the six engine files to run the full pipeline offline.
Node 20+ is required — the Emscripten modules are ES modules using `import.meta`.
