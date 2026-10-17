import fs from "node:fs";
import path from "node:path";
import { detectCapabilities, installedPackage, nativeTanStackPackages, executeTool } from "./capabilities.mjs";
import { configText, readConfig } from "./config.mjs";
import { skillAdd, discoverSkillNames } from "./skills.mjs";
import { planItem, runOperation } from "./operation.mjs";
import { operationLocks } from "./reports.mjs";
import { backupFiles, createBackupFolder, writeManifest } from "./backup.mjs";
import { analyzeBlock } from "./render.mjs";
import { AgsError, contentHash, gitRoot, samePath, writeAtomic } from "./util.mjs";

export function officialOffers(root, config = {}, capabilities = detectCapabilities(root)) {
  if (config.integrations?.officialSkills === false) return [];
  const existing = new Set(discoverSkillNames(root));
  const offers = [];
  // This upstream skill explicitly declares mantine-9 in its description.
  const mantine = installedPackage(root, "@mantine/form");
  if (capabilities.skills && /^9\./.test(mantine?.json.version ?? "") && !existing.has("mantine-form")) offers.push({ skill: "mantine-form", source: "https://github.com/mantinedev/skills/tree/222191c6b15d1ae2c02051a285f47230777be513", library: `@mantine/form@${mantine.json.version}` });
  if (capabilities.skills && capabilities.fallow && config.integrations?.fallow !== false && !existing.has("fallow")) offers.push({ skill: "fallow", source: "fallow-rs/fallow-skills" });
  if (capabilities.skills && capabilities["ast-grep"] && config.integrations?.astGrep !== false && !existing.has("ast-grep")) offers.push({ skill: "ast-grep", source: "ast-grep/agent-skill" });
  return offers;
}

export function nativeIntentState(root, config = {}, capabilities = detectCapabilities(root)) {
  const native = config.integrations?.officialSkills === false ? [] : nativeTanStackPackages(root);
  const packageFile = path.join(root, "package.json");
  const packageCurrent = fs.existsSync(packageFile) ? fs.readFileSync(packageFile, "utf8") : null;
  const packageJson = packageCurrent && native.length ? JSON.parse(packageCurrent) : {};
  const intent = Boolean(native.length && capabilities.intent);
  const packageNext = intent && packageJson.intent?.skills == null ? `${JSON.stringify({ ...packageJson, intent: { ...packageJson.intent, skills: native } }, null, 2)}\n` : packageCurrent;
  const agentsCurrent = fs.existsSync(path.join(root, "AGENTS.md")) ? fs.readFileSync(path.join(root, "AGENTS.md"), "utf8") : null;
  return { native, intent, executable: capabilities.intent, packageFile, packageCurrent, packageNext, agentsHash: contentHash(agentsCurrent), packageHash: contentHash(packageCurrent) };
}

export function nativeIntentItems(state) {
  return [
    ...(state.packageNext !== state.packageCurrent ? [planItem({ path: "package.json", kind: "native skill permissions", action: `allow ${state.native.join(", ")}`, hashes: { H: state.packageHash, S: contentHash(state.packageNext) } })] : []),
    ...(state.intent ? [planItem({ path: "AGENTS.md (Intent)", kind: "native skills", action: "intent install --map", hashes: { H: state.agentsHash } })] : []),
  ];
}

export function applyNativeIntent(root, state, ctx) {
  if (!state.intent) return;
  const executable = detectCapabilities(root).intent;
  if (!executable || executable !== state.executable) throw new AgsError("Intent executable changed; rerun setup.");
  if (state.packageNext !== state.packageCurrent) { writeAtomic(state.packageFile, state.packageNext); ctx.done("package.json"); }
  const agents = path.join(root, "AGENTS.md");
  const block = analyzeBlock(fs.existsSync(agents) ? fs.readFileSync(agents, "utf8") : null);
  if (executeTool(executable, ["install", "--map"], { cwd: root, terminal: ctx.terminal })) throw new AgsError("Intent installation failed.");
  const after = analyzeBlock(fs.existsSync(agents) ? fs.readFileSync(agents, "utf8") : null);
  if (block.body != null && after.body !== block.body) throw new AgsError("Intent changed the AGS block; recover AGENTS.md from the operation backup.");
  ctx.done("AGENTS.md (Intent)");
}

export function setupOperation({ agsRoot, route, officialSkills, rerunArgs }) {
  const root = gitRoot(route);
  const machine = samePath(root, agsRoot);
  return {
    name: "setup", command: "setup", rerunArgs,
    inspect() {
      const config = machine ? null : readConfig(root);
      const capabilities = detectCapabilities(root);
      const capabilityFile = path.join(root, ".tmp", "ags", "capabilities.json");
      const capabilityNext = `${JSON.stringify({ schemaVersion: 1, capabilities }, null, 2)}\n`;
      const capabilityCurrent = fs.existsSync(capabilityFile) ? fs.readFileSync(capabilityFile, "utf8") : null;
      const data = config?.data ?? {};
      if (officialSkills != null && config) config.doc.setIn(["integrations", "officialSkills"], officialSkills);
      const next = config ? configText(config.doc) : null;
      const offers = machine ? [] : officialOffers(root, config?.doc.toJS() ?? data, capabilities);
      const native = machine ? { native: [], intent: false } : nativeIntentState(root, config?.doc.toJS() ?? data, capabilities);
      return { capabilities, capabilityFile, capabilityNext, capabilityCurrent, config, next, offers, ...native };
    },
    plan(state) {
      const items = [];
      if (state.capabilityCurrent !== state.capabilityNext) items.push(planItem({ path: ".tmp/ags/capabilities.json", kind: "capabilities", action: "refresh", hashes: { H: contentHash(state.capabilityCurrent), S: contentHash(state.capabilityNext) } }));
      if (state.config && state.next !== state.config.text) items.push(planItem({ path: ".agents/ags.yaml", kind: "settings", action: "save official skill preference", hashes: { H: contentHash(state.config.text), S: contentHash(state.next) } }));
      for (const offer of state.offers) items.push(planItem({ path: `.agents/skills/${offer.skill}`, kind: "official skill", action: `skills add ${offer.source} --skill ${offer.skill}`, detail: offer.library }));
      items.push(...nativeIntentItems(state));
      return { header: { title: `ags setup: ${root}`, capabilities: state.capabilities, notes: Object.entries(state.capabilities).map(([name, file]) => `${name}: ${file ?? "unavailable"}`).concat(state.native.length && !state.intent ? ["TanStack native skills detected. Configure package.json intent.skills and install Intent to enable its native mechanism."] : []) }, items };
    },
    locks: () => operationLocks({ agsRoot, hostRoot: machine ? null : root }),
    async apply(ctx) {
      const { state } = ctx;
      const overwritten = [
        ...(state.config && state.next !== state.config.text ? [".agents/ags.yaml"] : []),
        ...(state.packageNext !== state.packageCurrent ? ["package.json"] : []),
        ...(state.intent && fs.existsSync(path.join(root, "AGENTS.md")) ? ["AGENTS.md"] : []),
      ];
      if (overwritten.length) {
        const folder = createBackupFolder(root, "setup");
        writeManifest(folder, { operation: "setup", digest: ctx.digest, files: backupFiles(root, folder, overwritten) });
      }
      if (state.capabilityCurrent !== state.capabilityNext) { writeAtomic(state.capabilityFile, state.capabilityNext); ctx.done(".tmp/ags/capabilities.json"); }
      if (state.config && state.next !== state.config.text) { writeAtomic(path.join(root, ".agents", "ags.yaml"), state.next); ctx.done(".agents/ags.yaml"); }
      for (const offer of state.offers) {
        const code = await skillAdd({ route: root, ...offer, terminal: ctx.terminal });
        if (code) throw new AgsError(`Official skill backend failed with exit ${code}.`);
        ctx.done(`.agents/skills/${offer.skill}`);
      }
      applyNativeIntent(root, state, ctx);
      return ["Setup complete."];
    },
  };
}

export async function setup(args) { return runOperation(setupOperation(args), { terminal: args.terminal, ...args.options }); }
