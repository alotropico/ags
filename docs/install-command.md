# Install the command

[Index](README.md) · [Install a host](install-host.md)

Requires **Node.js 20+**, **pnpm**, **Git**, and the AGS Git checkout with its release tags. Windows is supported and verified. Apple Silicon macOS support is experimental and untested. Linux and mobile are outside the supported contract.

The command runs working-tree code immediately. Installed guidance comes from release tags. `ags version` and `ags doctor` report state; they do not certify that the working tree matches a release. Host lifecycle requires Git history. A copied ZIP or package is not enough.

## Windows

From the AGS checkout in PowerShell:

```powershell
pnpm install
node .\scripts\install-global.mjs
ags doctor
```

The installer's bin directory must be on `PATH`. If needed, run `pnpm setup`, restart the terminal app, and rerun the installer. `pnpm setup` updates the user `PATH`. Restart the terminal so it drops a stale inherited value.

### Bin directory

Use `--bin <absolute-directory>` to choose a directory already on `PATH`:

```powershell
node .\scripts\install-global.mjs --bin "$env:USERPROFILE\bin"
```

Windows writes `ags.CMD`, `ags.ps1`, and `ags`. Default bin selection: `PNPM_HOME` itself, then `pnpm bin -g`, then `%LOCALAPPDATA%\pnpm`. No `bin` segment is appended to `PNPM_HOME`.

A shim pointing elsewhere, including a dangling link, stops installation. Use `--replace` or another bin. Reinstalling the same checkout is idempotent.

### After moving the checkout

```powershell
node .\scripts\install-global.mjs --replace
```

Run that from the new location. The global `ags` runs this working tree through shims.

### See which `ags` runs

Check resolution with `Get-Command ags -All` (PowerShell) or `where.exe ags` (CMD). Compare with the installer and `ags doctor` output. Node resolves from the active environment.

## macOS

The untested macOS implementation targets Apple Silicon, zsh or `/bin/sh`, and default or case-sensitive local filesystems. Intel needs separate validation.

From the Git checkout with its release history:

```sh
pnpm install --frozen-lockfile
node scripts/install-global.mjs --bin "$HOME/.local/bin"
export PATH="$HOME/.local/bin:$PATH"
ags doctor
```

The executable LF launcher uses `PNPM_HOME`, pnpm's reported global bin, or `$HOME/.local/bin`. Write failures stop with a `--bin` remedy. The installer does not use `sudo` and does not edit shell files. Persist `PATH` yourself if you need it in new terminals. Reinstall a moved checkout with `--replace`.

Check resolution with `command -v ags` or `type -a ags`.

`pnpm trial:macos` runs the full suite, temporary case-sensitive APFS checks, and a launcher smoke from a prepared checkout. It does not replace the global `ags`, and it does not release or adopt a host.

── ◈ ──

[Index](README.md)
