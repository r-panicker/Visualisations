# UI/design conventions for this repo

Distilled from work on `riscv_simulator.html`; apply the same instincts to the other visualization pages here.

- **Reuse existing patterns instead of inventing new ones.** A new panel/control should look and behave like its closest sibling already in the page (e.g. a new value column gets the same signed/unsigned toggle Registers and Memory already use) rather than a bespoke widget.
- **Show a value in more than one form when its format is ambiguous** — hex alongside signed/unsigned decimal, not just one. Make it toggleable rather than picking one and hiding the rest.
- **Design for mobile alongside desktop, not after.** These pages get used on narrow viewports; a feature that only makes sense at desktop width still needs a deliberate mobile behavior (a collapsed panel, a different toggle placement), not an afterthought fix.
- **Prefer copy that stays true automatically over copy that enumerates specifics.** A message naming exact items (panel names, counts) goes stale the next time something is added; phrase it generically unless the specifics are the point.
- **Never show a value before it's meaningful.** If something reads from state that isn't valid yet (a register before its prologue runs, a result before a compile finishes), show a clear "not ready yet" state instead of whatever garbage happens to be there.
- **Debuggability is a first-class feature here.** Surfacing what the simulator is actually doing (memory layout, variable locations, live values) is consistently the kind of addition that's wanted — lean toward more visibility, not less.
