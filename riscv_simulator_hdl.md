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
| Registers panel | Live | Read out of your register file by hierarchical reference |
| Memory panel | Live | Driven by the Wrapper's actual DMEM writes |
| LEDs / 7-seg / OLED / UART | Live | Driven by your hardware's pins |
| Unwritten registers | Shown as `0` | Shown as `xxxxxxxx` — the hardware truth |
| Speed | Millions of instr/sec | ~40k-200k cycles/sec |

---

## Using it

1. **Switch to HDL** — the `JS | HDL` pill in the toolbar. The HDL panel opens and the
   engine (~2.7 MB of WASM) begins loading.
2. **Load your Verilog** — drag `.v` files onto the HDL panel, or use *browse...*.
   Include `Wrapper.v`, `RV.v` and **every** submodule (`ALU.v`, `Decoder.v`,
   `Extend.v`, `PC_Logic.v`, `ProgramCounter.v`, `RegFile.v`, `Shifter.v`).
   The file holding `module Wrapper` is tagged in the list.
3. **Assemble a program** as usual (any example, or your own).
4. **Run**, then **Step** / **Back** to move through what the hardware did.

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

### Memory images

`IROM_DEPTH_BITS` and `DMEM_DEPTH_BITS` are read out of *your* Wrapper, so a design
with an enlarged IROM gets a correspondingly sized image. If the program needs more
instruction words than your IROM holds, the panel says so rather than letting the
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

### The budget grows on its own

*Cycles* is how much to record. Stepping past the end simply records more — the budget
quadruples and the run repeats — so the number rarely needs tuning. If the PC has
stopped advancing (a halt, or a tight self-loop) the panel says so instead.

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
  32-bit regs needs its path typed in by hand.
- **Long runs are slow**: roughly 40k-200k cycles/sec. A program that needs millions of
  cycles is better run in JS mode.
- **First run downloads ~2.7 MB** of WASM (cached afterwards).
- Requires a browser context that allows cross-origin `import()` — serve over `http://`
  rather than opening the file with `file://`, or host the engine locally.

---

## Tests

`riscv_simulator_tests/test_hdl_mode.js` — 70 assertions. It loads the page, assembles
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

```bash
node riscv_simulator_tests/test_hdl_mode.js
```

The engine is expected at the path in `HDL_ENGINE_DIR` (defaults to a scratch copy);
point it at a folder holding the six engine files to run the full pipeline offline.
Node 20+ is required — the Emscripten modules are ES modules using `import.meta`.
