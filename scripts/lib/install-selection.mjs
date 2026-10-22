import { parseFrontmatter, resolveSelection, rulePath, skillDir, textOf } from "./catalog.mjs";
import { detectEvidence, whenMatches } from "./packages.mjs";
import { nativeIntentState, officialOffers } from "./setup.mjs";
import { selectionHeading } from "./selection.mjs";

const SIGNAL_REASONS = {
  git: "Git repository detected", "git-remote": "Git remote configured", code: "Source code detected",
  javascript: "JavaScript / TypeScript project detected", typescript: "TypeScript detected", react: "React detected",
  "web-ui": "Web UI detected", stylesheets: "Stylesheets detected", checks: "Project check scripts detected",
};

function reason(entry, evidence) {
  if (entry.install === "always") return "Included by default";
  for (const clause of entry.when?.any || []) {
    if (!whenMatches({ any: [clause] }, evidence)) continue;
    if (clause.signal) return SIGNAL_REASONS[clause.signal];
    if (clause.capability) return `${clause.capability} executable available`;
    if (clause.package) return `Dependency detected: ${clause.package}`;
    if (clause.lockFile) return `Lock file detected: ${clause.lockFile}`;
    if (clause.repoName) return `Repository name: ${clause.repoName}`;
  }
  return "Optional";
}

// Compute companions from the user's direct choices, without re-adding defaults
// they have deselected in the first menu.
function companions(entries, ids) {
  const byId = new Map(entries.map(entry => [entry.id, entry]));
  const children = new Set();
  const visited = new Set();
  const walk = id => {
    if (visited.has(id)) return;
    visited.add(id);
    for (const child of byId.get(id)?.includes || []) { children.add(child); walk(child); }
  };
  ids.forEach(walk);
  return [...children];
}

async function menu(terminal, options) {
  if (!options.choices.length) {
    selectionHeading(options, terminal.columns ?? 80).forEach(line => terminal.log(line));
    terminal.log("No additional items. [Enter] Next");
    const answer = String(await terminal.question("[Enter] Next / [S] Stop: ")).trim().toLowerCase();
    return ["s", "stop"].includes(answer) ? null : [];
  }
  if (terminal.selectMany) return terminal.selectMany(options);
  let selected = [...options.initial];
  for (;;) {
    selectionHeading(options, terminal.columns ?? 80).forEach(line => terminal.log(line));
    terminal.log("  Select All: all");
    terminal.log("  Select None: none");
    const included = new Set(options.included(selected));
    options.choices.forEach((choice, index) => terminal.log(`  ${index + 1}. [${selected.includes(choice.value) || included.has(choice.value) || choice.locked ? "X" : " "}] ${choice.label} - ${choice.summary || choice.description}${choice.locked ? " (required)" : ""}`));
    const answer = String(await terminal.question("Selection: numbers or ids; all / none; [Enter] Next; [S] Stop: ")).trim();
    if (["s", "stop"].includes(answer.toLowerCase())) return null;
    if (!answer) return selected;
    if (answer.toLowerCase() === "all") selected = options.choices.map(choice => choice.value);
    else if (answer.toLowerCase() === "none") selected = options.choices.filter(choice => choice.locked).map(choice => choice.value);
    else {
      const ids = [...new Set(answer.split(",").map(value => value.trim()).filter(Boolean).map(value => /^\d+$/.test(value) ? options.choices[Number(value) - 1]?.value || value : value))];
      const unknown = ids.filter(id => !options.choices.some(choice => choice.value === id));
      if (unknown.length) { terminal.warn(`Unknown items: ${unknown.join(", ")}.`); continue; }
      selected = [...new Set([...ids, ...options.choices.filter(choice => choice.locked).map(choice => choice.value)])];
      return selected;
    }
  }
}

export async function chooseInstallSelection({ terminal, catalog, source, hostRoot, version, officialSkills, preferences = {} }) {
  const evidence = detectEvidence(hostRoot);
  const entries = [...catalog.rules, ...catalog.skills];
  const defaults = resolveSelection(catalog, {}, evidence);
  const defaultDirect = [...defaults.rules, ...defaults.direct];
  const defaultFull = new Set([...defaults.rules, ...defaults.skills]);
  const choices = entries.filter(entry => entry.id !== "ags-graphify" || evidence.capabilities.graphify).map(entry => {
    const rule = catalog.rules.includes(entry);
    const description = parseFrontmatter(textOf(source.readFile(rule ? rulePath(entry.id) : `${skillDir(entry.id)}/SKILL.md`))).data?.description || "Host settings, task scope, and verification.";
    return { value: entry.id, label: `${entry.id} (${rule ? "rule" : "skill"})`, description, summary: entry.summary || description.split(/\.\s/)[0], reason: defaultDirect.includes(entry.id) ? reason(entry, evidence) : defaultFull.has(entry.id) ? "Required companion of a recommended item" : "Optional", includes: entry.includes || [], locked: rule && entry.tier === "strong" };
  });
  const integrations = [];
  if (Number(version.split(".")[0]) >= 4 && officialSkills !== false && preferences.integrations?.officialSkills !== false) {
    const keys = { fallow: "fallow", "ast-grep": "astGrep", "mantine-form": "mantineForm" };
    for (const offer of officialOffers(hostRoot, preferences, evidence.capabilities)) integrations.push({ value: `integration:${keys[offer.skill]}`, key: keys[offer.skill], label: `${offer.skill} (external skill)`, summary: offer.library || `Install the skill for the available ${offer.skill} tool`, reason: "Compatible integration detected", description: `skills add ${offer.source} --skill ${offer.skill}` });
    const native = nativeIntentState(hostRoot, preferences, evidence.capabilities);
    if (native.intent) integrations.push({ value: "integration:tanstackSkills", key: "tanstackSkills", label: "TanStack (native skills)", summary: "Map skills from installed TanStack packages", reason: "Compatible packages and Intent detected", description: "intent install --map" });
  }
  const recommended = [...choices.filter(choice => defaultFull.has(choice.value)), ...integrations];
  const first = await menu(terminal, { heading: "Installing AGS", title: "1 of 2 - Recommended rules and skills for this host", choices: recommended, initial: [...defaultDirect, ...integrations.map(choice => choice.value)], included: ids => companions(entries, ids) });
  if (first == null) return null;
  const second = await menu(terminal, { heading: "Installing AGS", title: "2 of 2 - Optional rules and skills you can enable", choices: choices.filter(choice => !defaultFull.has(choice.value)), initial: [], included: ids => companions(entries, [...first, ...ids]) });
  if (second == null) return null;
  const ids = [...first, ...second].filter(id => !id.startsWith("integration:"));
  const full = new Set([...ids, ...companions(entries, ids)]);
  return {
    enable: ids.filter(id => !defaultDirect.includes(id)),
    disable: defaultDirect.filter(id => !full.has(id)),
    sets: integrations.map(choice => `integrations.${choice.key}=${first.includes(choice.value)}`),
  };
}
