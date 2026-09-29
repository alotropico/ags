---
description: Searching the workspace or performing a pure file move, rename, or copy.
---

# Workspace operations

- For a pure filesystem move, rename, or copy, use the operating system's native operation instead of recreating the content. Verify the result and update affected references.
- Prefer `rg --files` for file listing and `rg` for text search when available. Otherwise use the next suitable tool without changing the task.
- Choose commands for the current operating system and installed tools. Do not assume Unix utilities on Windows or install a navigation tool for an ordinary task.
- Optional navigation or indexing tools may accelerate a task, but their output is evidence to verify, not a finding or authorization to widen scope.
