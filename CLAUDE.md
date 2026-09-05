# Working in this repo

## Workflow
- Sole contributor, single branch. Commit straight to `main` — no feature branches, no PRs.
- Only commit/push when explicitly asked. Multiple small, honestly-scoped commits are preferred over one large one.
- Before any risky git operation, check `git status` first; investigate unexpected working-tree state (e.g. files missing without a matching commit) rather than assuming it was intentional.

## Testing
- These are hand-built HTML/JS pages with their own test suites (see `riscv_simulator_tests/`) — run the *full* suite after a change, not just the area touched, and treat any new failure as a regression to root-cause, not a magic-number to update blindly.
- A test that only checks "did it compile / how many instructions" is not enough — verify the actual rendered/simulated output (pixel counts, UART text, register values) matches what a human would call correct.
- For UI changes, actually drive the page (a live browser check, not just unit tests) before calling it done.

## Code comments
- Comments explain non-obvious *current* behavior — a hidden constraint, why the less-obvious approach was chosen. They are never a changelog: don't narrate what a bug used to do or why a line was removed. That history belongs in the commit message and, for this project, `riscv_simulator_specs.md`'s version-history table.
- Don't add comments to justify a change that's simple enough to read on its own.

## Scope
- Ideate before implementing anything structural or UX-shaped: present options and a recommendation, wait for direction, rather than building first.
- When a fix reveals the same latent pattern elsewhere, flag it and ask before touching more files than asked — the user is often already tracking it and will confirm scope explicitly.
