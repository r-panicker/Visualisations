# Bit Reversal Visualizer — Reproduction Prompts

Two prompts to reproduce the interactive bit reversal visualizer. Use the simple one if you want to iterate on the design yourself; use the detailed one if you want a close match to the original on the first try.

---

## Simple prompt

> Build me an interactive HTML/CSS/JavaScript visualization that teaches the classic 8-bit reversal algorithm (swap nibbles, then crumbs, then bits). Show the bits as cells, break each stage into separate micro-steps for AND, shift, and OR so students can see each operator in isolation, animate the shift so bits visibly slide to their new positions, and highlight the corresponding sub-expression in the source code as each step runs. Include a text input for the byte (accepting `0b...`, `0x...`, or decimal) with a sensible default and a few presets. Dark theme, responsive on phone and desktop. Support keyboard controls in addition to click: Space to play/pause, arrow keys to step forward/back, R to reset, +/− for speed. The code being visualized:
>
> ```c
> // swap nibbles - 4 bit groups
> toswap = (toswap & 0b11110000)>>4 | (toswap & 0b00001111)<<4;
>
> // swap crumbs - 2 bit groups
> toswap = (toswap & 0b11001100)>>2 | (toswap & 0b00110011)<<2;
>
> // swap bits
> swapped = (toswap & 0b10101010)>>1 | (toswap & 0b01010101)<<1;
> ```

---

## Detailed prompt

> Build an interactive HTML/CSS/JavaScript visualization that teaches the 8-bit reversal algorithm below, aimed at students who may not be fluent with bitwise AND, shift, and OR. Everything should live in a single file, render inline, and look good on both phone and desktop with a dark theme.
>
> **Algorithm to visualize:**
>
> ```c
> char swapped;
>
> // swap nibbles - 4 bit groups
> toswap = (toswap & 0b11110000)>>4 | (toswap & 0b00001111)<<4;
>
> // swap crumbs - 2 bit groups (note: crumbs is not a popular usage)
> toswap = (toswap & 0b11001100)>>2 | (toswap & 0b00110011)<<2;
>
> // swap bits
> swapped = (toswap & 0b10101010)>>1 | (toswap & 0b01010101)<<1;
> ```
>
> **Layout.** Input panel on top (full width). Below it, a two-column grid on viewports ≥780px that collapses to a single column on mobile. Left column: the working bits area, numeric readout, stage indicator, phase bar, status line, and controls. Right column: the source code with per-stage highlighting and a short legend explaining the four micro-steps. Use rounded card surfaces (`border-radius: 12px`) with a dark card background against a slightly darker page background. Render 8 bit cells as monospace boxes, roughly 28×34px, with a position index (7..0) above each cell. Use one accent color for `1` bits and a muted color for `0` bits.
>
> **Input.** A text field accepting `0b` binary, `0x` hex, or plain decimal (0–255). Default value: `0b11010010`. Provide four preset buttons (`0b11010010`, `0xFF`, `0x01`, `0xA5`) plus a "Random" button. Invalid input should show an error in the status line without breaking state.
>
> **Granularity — most important part.** Do NOT collapse a stage into one animation. Each of the three stages breaks into exactly 4 micro-steps (12 total beats, plus a final "done" state):
>
> 1. **AND with mask A.** Show an operand stack: `toswap` on top, `mask A` below with an amber `&` symbol between them, a horizontal divider, then `= left` showing the result. The mask's `1` positions should highlight the bits they select in `toswap` above. The result row shows only the surviving left-half bits, with zeros dimmed. This beat teaches AND as a filter: bit passes through where mask is 1, zeroed where mask is 0.
> 2. **AND with mask B.** Same stack layout, different mask, rose-colored `&`. The result is the right half. Include a small footnote reminding the student that the left half from the previous step still exists ("left half from step N: 0b...").
> 3. **Shift — must be animated.** Show two rows: the left half labeled `left >>N` and the right half labeled `right <<N`. Use the FLIP technique (First-Last-Invert-Play): render the final post-shift positions in the DOM, measure real cell stride, apply an inverse `translateX` transform so bits appear in their pre-shift positions, then on the next animation frame remove the transform and let CSS transition them (~750ms ease) into their final positions. Use the same DOM nodes throughout so there's no snap at the end. Only animate cells whose bit value is `1`. A hint line above indicates direction in words.
> 4. **OR combine.** Operand stack again: the shifted left half on top, shifted right half below with a blue `|` symbol between them, divider, `= combined` below. Colors reinforce that each position has exactly one non-zero operand, so OR merges cleanly. Commit the combined value as the new `toswap` for the next stage.
>
> **Code panel with sub-expression highlighting.** This matters a lot. Each line in the code panel is split into five tagged sub-expressions: `andA` (the `(toswap & maskA)` group), `shiftA` (the `>>N` that follows it), `orOp` (the `|`), `andB` (the right-half AND group), and `shiftB` (the `<<N`). For each beat, highlight precisely the relevant sub-expressions with outline + background:
>
> - Beat 1 → highlight `andA` only, amber.
> - Beat 2 → highlight `andB` only, rose.
> - Beat 3 → highlight `andA` + `shiftA` together (amber) AND `andB` + `shiftB` together (rose).
> - Beat 4 → highlight all four AND/shift tokens plus `orOp` in blue.
>
> Comments should render separately on their own line above each statement in a dimmed italic color, not inline. Use a left-border accent on the active line. Dim completed lines to ~45% opacity.
>
> **Controls and keyboard.** Four buttons: Prev, Play/Pause, Next, Reset. A speed slider for autoplay (800–2600ms, default 1600ms). Full keyboard support when focus isn't in the text input: Space toggles play/pause, Right-arrow or N steps forward, Left-arrow or P steps back, R resets, `+`/`−` adjusts autoplay speed. Display the shortcuts as a row of `<kbd>` chips below the controls. When the user presses a control while focus is in the text input, the shortcut must not fire (so typing `+` in the field works).
>
> **Step-back correctness.** Stepping back must always produce the correct state. Implement it by decrementing the beat counter, resetting the byte to the original input, and replaying full stages up to (but not including) the target stage. This avoids any state drift from partial animations.
>
> **Progress indicators.** Three pills labeled Nibbles / Crumbs / Bits showing which stage is active (with completed stages dimmed). Below the pills, a 12-dot phase bar (four dots per stage with a small gap between stages) showing the current beat within the whole algorithm. Both update on every step.
>
> **Status line.** One-line plain-language description of what just happened, with inline `<code>` for binary/hex literals. E.g. for beat 1: "Step 1/12 — AND with mask A. Where mask A is `1`, the bit passes through. Where it's `0`, the result is `0`. This keeps only the left half." Keep status text educational but concise — enough to narrate aloud without re-reading.
>
> **Numeric readout.** Below the working bits, show the current byte as `bin 0b... hex 0x.. dec NNN` in monospace. Updates live as the algorithm progresses (shows the pre-combine value during beats 1–3 of a stage, then the new committed value after beat 4).
>
> **Palette.** Amber (`#EF9F27`) for the left half throughout, rose (`#D4537E`) for the right half, blue (the accent used for `1` bits generally) for OR and the combined result. These three colors should be used consistently across bits, mask outlines, code highlights, and operator symbols so students can visually connect a color across the UI.
>
> **Accessibility.** Respect `prefers-reduced-motion` by disabling the shift transition. Give the bits area `aria-live="polite"` so screen readers announce beat transitions. Every control should have a meaningful `aria-label` when the visual text is an icon. Color should never be the only channel — each bit cell shows its `0`/`1` digit plainly.
>
> **Mobile behavior.** Below ~420px viewport, shrink the bit cells slightly (26×32px) and reduce the operand-row label column width so the full stack fits without horizontal scroll.
>
> **Don't.** Don't use localStorage or sessionStorage. Don't split into multiple files. Don't add audio or hover-only affordances. Don't use emoji for status icons (use CSS or simple ASCII glyphs like `▶ ❚❚ ‹ ›`). Don't render the comments inline with the code — they should be on their own dim italic line above each statement.
