# CSS linting

Read only when selecting or assessing a lint command for CSS or SCSS.

Before running lint for CSS or SCSS, inspect what the existing script actually checks and whether it writes files. A general lint script may cover only JavaScript or TypeScript. Use an existing read-only CSS-specific script or the tool's documented file-selection mechanism through the established package manager. If that invocation cannot be expressed by the configured helper, run it directly and report its actual scope; do not change settings or claim it was the configured `ags check` run.

`ags check --only lint` selects a category, not files or directories. It is CSS-only only when the configured script supplies that scope. If CSS-only execution is unsupported, report the gap without silently running a broader check, adding a script or setting, or installing a linter. Preserve warnings, errors, and exit codes; do not enable autofix for a lint-only request. Lint success does not establish selector non-use or authorize CSS cleanup.
