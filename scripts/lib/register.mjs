import path from "node:path";
import { releaseVersions } from "./catalog.mjs";
import { readConfig, validateConfig } from "./config.mjs";
import { REGISTRY_KEY, registryState, releaseInputs } from "./host.mjs";
import { planItem, runOperation } from "./operation.mjs";
import { resolveHost } from "./prepare.mjs";
import { findHost, loadRegistry, registryPath, saveRegistry } from "./registry.mjs";
import { operationLocks } from "./reports.mjs";
import { AGS_ROOT, AgsError, contentHash, displayPath, readFileOrNull } from "./util.mjs";

export function registerOperation({ agsRoot = AGS_ROOT, route, name = null, rerunArgs }) {
  const hostRoot = resolveHost(route, { agsRoot, command: "ags host register" });
  if (name != null && (typeof name !== "string" || !name.trim())) throw new AgsError("Host name must not be empty.");
  return {
    name: "register",
    command: "host register",
    rerunArgs,
    inspect() {
      const config = readConfig(hostRoot);
      if (!config?.data.host || !config.data.agsVersion) throw new AgsError("No complete AGS installation with a host ID and version. Run ags host install first.");
      const { host: id, agsVersion: version } = config.data;
      if (!releaseVersions(agsRoot).includes(version)) throw new AgsError(`Installed release ${version} is unavailable in this AGS checkout. Obtain its annotated tag before registering.`);
      const { catalog } = releaseInputs(agsRoot, version);
      const errors = validateConfig(config.data, catalog, { hostRoot });
      if (errors.length) throw new AgsError(`Invalid .agents/ags.yaml:\n${errors.map((line) => `- ${line}`).join("\n")}`);
      const reg = registryState(agsRoot, hostRoot, id);
      const hostName = name ?? reg.entry?.name ?? path.basename(hostRoot);
      return {
        id, version, hostName,
        action: reg.action ?? (hostName !== reg.entry.name ? "name" : null),
        configHash: contentHash(config.text),
        registryHash: contentHash(readFileOrNull(registryPath(agsRoot))),
      };
    },
    plan(state) {
      return {
        header: {
          title: `ags host register: ${state.id}`,
          operation: "register", host: state.id, version: state.version,
          notes: [`Register ${state.hostName} at ${displayPath(hostRoot)} in ${displayPath(registryPath(agsRoot))}. Installed guidance and host files are unchanged.`],
        },
        items: state.action ? [planItem({
          path: REGISTRY_KEY, kind: "registry",
          action: state.action === "register" ? `add ${state.id} (${state.hostName})` : `update ${state.action} for ${state.id}`,
          hashes: { B: state.registryHash, H: state.configHash },
        })] : [],
      };
    },
    locks: () => operationLocks({ hostRoot, agsRoot }),
    async apply(ctx) {
      const registry = loadRegistry(agsRoot);
      const entry = findHost(registry, { id: ctx.state.id });
      if (entry) {
        entry.path = hostRoot;
        entry.name = ctx.state.hostName;
      } else {
        registry.hosts.push({ id: ctx.state.id, name: ctx.state.hostName, path: hostRoot, ignored: [], promoted: [] });
      }
      saveRegistry(agsRoot, registry);
      ctx.done(REGISTRY_KEY);
      return [`Registered ${ctx.state.id} in ${displayPath(registryPath(agsRoot))}. Host files are unchanged.`];
    },
  };
}

export async function hostRegister({ agsRoot = AGS_ROOT, route, name = null, rerunArgs, terminal, options }) {
  return runOperation(registerOperation({ agsRoot, route, name, rerunArgs }), { terminal, ...options });
}
