# Integrations

[Index](README.md) · [Harnesses](harnesses.md) · [Configuration](configuration.md)

`ags setup` detects the skills CLI, Graphify, Fallow, and ast-grep. It prefers a project-local executable. Intent applies to TanStack packages that expose native skills. Detection is informational and is revalidated before use. A missing tool does not block unrelated work. Inside the AGS checkout itself, setup records capabilities only.

Reviewed setup and install plans offer the compatible integrations they can actually see:

- Pinned Mantine 9 form material. Older versions, and versions that cannot be verified, are skipped.
- Version-matched TanStack skills via Intent. Intent's required package allowlist is shown before any write.
- Fallow and ast-grep, when they are installed.

These offers follow the tools and packages on that project. They are optional. The catalog's authored guidance remains the TypeScript, React, CSS, and web set described in the [catalog](catalog.md).

## Preferences

Pass `--no-official-skills` on setup or install to save an opt-out, or edit the project configuration:

```yaml
integrations:
  officialSkills: false
  fallow: false
  astGrep: false
  claudeSkills: false
```

`claudeSkills` is the Claude alias switch. Behavior and evidence: [Harnesses](harnesses.md). `--set` accepts `integrations.claudeSkills` only. Edit the other three by hand.

## Third-party skills

```powershell
ags skill add <source> --skill <name>
```

The skills proxy delegates to `skills add`. Without a TTY it requires `--skill`. It targets `.agents/skills/` and refuses an existing destination. Output, status, lockfiles, and updates stay with that backend. Third-party skills are project-owned and sit outside the catalog.

## Graphify

The `ags-graphify` skill requires a Graphify executable. Use it for local deterministic cross-file dependency tracing when a graph materially helps. Automation stays on the machine. External models, hosted inference, and API-credit operations need an explicit request, and project restrictions still apply.

── ◈ ──

[Index](README.md)
