# Runtime support

Read declared host targets first: browserslist, package/build configuration, product support policy, Electron/WebView versions and existing fallbacks. A pinned desktop runtime may embed an older engine; current Chrome support does not establish Electron support.

Identify the exact API, selector, value or subfeature. Use current primary documentation/compatibility data, record retrieval date and applicable versions, and inspect known limitations. MDN Baseline is a browser compatibility summary, not evidence for an embedded runtime, assistive technology, usability or performance.

If targets are absent, use current stable Chrome, Firefox and Safari only as an explicitly provisional assumption. Do not replace a known host target with a generic version window. Prefer a supported simpler mechanism; add a scoped functional fallback or progressive enhancement when product behavior requires it. Feature detection should test the actual mechanism; syntactic acceptance alone may not prove usable behavior.

Verify the affected interaction in available target environments. Report inspection, rendered execution, unsupported targets and not-run checks separately. Keep changing feature-status tables out of installed guidance.
