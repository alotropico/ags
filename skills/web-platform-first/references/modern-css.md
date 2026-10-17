# CSS mechanisms

Choose a mechanism for a concrete constraint, within host CSS Modules/SCSS, token, selector and component conventions. Do not replace the styling system or weaken existing transition/token conventions.

- Container queries can express responsiveness to the containing component; media queries can express viewport/user conditions. Inspect containment and the exact query type's support.
- `:has()` can style a real relationship/state without duplicating state in JavaScript. Check selector support, scope and actual state ownership.
- Subgrid can align related nested tracks; preserve sensible intrinsic sizing and target support.
- Cascade layers and scope can express precedence/isolation, but existing unlayered styles and library output affect the result. Inspect the cascade before introducing a global layer order.
- Logical properties can accommodate writing direction; confirm the layout's intended axes and host conventions.
- Native states, color and motion mechanisms can reduce custom machinery when supported and useful. Preserve tokens, visible focus, contrast and reduced-motion behavior; verify actual transitions and recovery.

Consult [runtime support](browser-support.md) for the precise feature/subfeature. Avoid flag-only experimental defaults and elaborate compatibility machinery whose only purpose is adopting syntax. Measure performance claims; platform syntax alone does not prove accessibility or speed.
