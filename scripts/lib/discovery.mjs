export const DISCOVERY_ROOTS = [
  {
    path: ".agents/skills",
    state: "supported",
    reason: "Host-local skill copies are reconciled from this directory.",
  },
  {
    path: ".cursor/skills",
    state: "unresolved",
    reason: "Not verified as a repository-local skill root for this AGS version.",
  },
  {
    path: ".claude/skills",
    state: "unresolved",
    reason: "Not verified as a repository-local skill root for this AGS version.",
  },
];

export function supportedDiscoveryRoots() {
  return DISCOVERY_ROOTS.filter((item) => item.state === "supported").map((item) => item.path);
}
