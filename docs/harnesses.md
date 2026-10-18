# Harnesses

[Index](README.md) · [Host contract](host-contract.md) · [Integrations](integrations.md)

Verify loading in the harness and version you actually use. A file under `.agents/skills/` does not, by itself, mean Claude is discovering it through `.claude/skills/`.

AGS writes the shared instructions to `AGENTS.md`, rules to `.agents/rules/`, and skills to `.agents/skills/`. That is the layout the catalog is written against, and it is the layout Cursor loads. Installation and activation are separate pieces of evidence.

AGS adds no root instruction file, import, or link of its own, no precedence mode, and no user-setting workaround. Existing prepare and install handling of a root `CLAUDE.md`, including `.bak` backups, is unchanged.

## Compact Claude skill discovery

`integrations.claudeSkills` is an optional boolean. Absent means false. Preview it, then apply the reviewed digest:

```powershell
ags host update --host <id> --set integrations.claudeSkills=true --dry-run
```

`--set` accepts this boolean along with catalog-declared settings. Other integration preferences stay hand-edited. See [Configuration](configuration.md).

When the preference is true, each selected installed AGS skill gets `.claude/skills/<id>` pointing at the same host's `.agents/skills/<id>`. Native symlinks use the relative target `../../.agents/skills/<id>`.

On Windows, AGS prefers symlinks, probes whether they can be created, and then permits native directory junctions. Junction discovery and reference reading were observed with Claude Code 2.1.288 in fixtures. Native symlinks were denied in that environment. Aliases point at that host's `.agents/skills/<id>` only: no source-checkout target, no global target, no second copy of the skill, no elevation, and no Developer Mode or Git configuration change. If linking is unsupported, the lifecycle command fails before it writes.

Plans bind link descriptors, and parent and target identity, to the existing digest, locks, and recovery flow. `hosts/<id>.json` records ownership. Backups and host snapshots save descriptors and do not traverse alias trees.

A collision with a file, a directory, the wrong kind of link, a dangling link, or an unexpected parent is refused before writes. An unrecorded link that already points at the exact target can be adopted, and only as an explicit reviewed plan item.

Setting the preference false, or deselecting a skill, removes only recorded matching link entries. Targets stay. Unrelated `.claude` material stays host-owned. A missing managed alias has a reviewed repair path. Unregister drops records and leaves host files under the same contract as every other host file.

### Git exclude region

Git for Windows reads a junction as a directory. Each managed alias is therefore excluded locally. A separate `# AGS:CLAUDE-ALIASES:BEGIN` / `END` region in `.git/info/exclude` lists one `/.claude/skills/<id>` line per managed alias, without a trailing slash, so both symlinks and junctions match. Third-party `.claude/skills/` entries stay visible to Git.

The region follows the final alias set in the same reviewed plan. It is written before links are created, and removed when none remain. An edited region is restored, with a backup. Doctor reports a missing, edited, or stale region.

### What has been observed

Official [Claude skill documentation](https://code.claude.com/docs/en/skills) describes directory symlinks and target deduplication. [Instruction loading](https://code.claude.com/docs/en/memory) separately describes direct `AGENTS.md` support from Claude Code 2.1.277, with session and configuration limitations.

Windows Claude Code 2.1.288 junction discovery, reference reading, and a separate tools-disabled root startup phrase were observed in fixtures. Native symlinks were denied there.

Cursor also loads `.claude/skills/`, so a skill may appear twice in Cursor. Deduplication there is unverified. Native macOS linking, and root loading in other hosts and sessions, need their own evidence.

External automatic task-loading probes were blocked by approval review. A local review does not establish activation. A working skill alias is not evidence that instruction loading matches.

After moving a host on Windows, delete the `.claude/skills/<id>` junctions and rerun `ags host update`. Delete the junctions only. The targets under `.agents/skills/` stay.

── ◈ ──

[Index](README.md)
