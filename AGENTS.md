# AGS

The canonical root is the directory that contains this file. These files are live. There is no compile step and no copied runtime. Host install records that path. Run `node scripts/install-global.mjs` again after this directory moves.

## Load order

1. The host adapter and `.agents/AGS.md`.
2. Confirm this canonical root is readable and writable.
3. This file and `rules/core.md`.
4. Selected optional rules listed by the host entry.
5. Relevant host guidance under `.agents/local/`.
6. A selected skill's `SKILL.md` only when the request matches its description.

Do not read every selected skill on every task. Load only selected, applicable material.

## Material

- **Core** is the always-on file `rules/core.md`.
- **Rules** are short optional guidance selected in the host settings.
- **Skills** are on-demand procedures. Canonical custom and third-party skills live under `skills/`.
- **Host-local** files under `.agents/local/` belong to that host. A skill may also live at the exact host path listed in `.agents/AGS.md` only when it is a registered `requires-host-location` exception.

Do not copy a canonical skill into a host as an exception. Do not copy canonical skills or shared rules into a host.

## Changes

Canonical edits affect every host. After changing a canonical file, report it:

```powershell
ags report changes --route <host> --file <canonical-relative-path> --note "<what changed>"
```

## Deterministic commands

Use `ags` for host install, update, sync, repair, skill install, skill reconcile, reporting, snapshot, and diff. Do not invoke files under `scripts/` by path.
