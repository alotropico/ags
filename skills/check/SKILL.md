---
name: check
description: Run the verified host's configured type, lint, and Prettier checks.
---

# Check

**Trigger:** Verification should run the host's configured type, lint, or Prettier checks.

Read `.agents/ags.yaml` from the verified host. The keys `checks.type`, `checks.lint`, and `checks.prettier` are package script names, not shell commands. Use `ags check --route <host>` so AGS runs those scripts through the host's detected package manager.

- Run every configured check the user requested. Collect each result even when an earlier check fails, unless continuing would be unsafe.
- A missing key is not configured. A script name that is no longer in `package.json` is stale configuration. Do not invent a command, package manager, or script name.
- The package manager comes from `packageManager` when it starts with `pnpm@`, `yarn@`, or `npm@`, otherwise from exactly one supported lockfile. If those signals conflict, stop. If no manager is identified, checks are unavailable.
- For each check, report the category, manager, script, exit status, and the script's stdout and stderr.
- Prettier runs in check mode only. Refuse a package script that obviously rewrites files, such as `prettier --write` or `prettier -w`.
- Never run canonical AGS scripts as a stand-in for the host.
