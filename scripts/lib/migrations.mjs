import { compareVersions, VERSION_PATTERN } from "./catalog.mjs";
import { AgsError } from "./util.mjs";

function major(version) {
  return Number(String(version).split(".")[0]);
}

export function migrationChain(agsRoot, installed, target) {
  void agsRoot;
  if (!VERSION_PATTERN.test(installed) || !VERSION_PATTERN.test(target)) throw new AgsError(`Migration versions must be X.Y.Z: ${installed}, ${target}`);
  if (compareVersions(target, installed) < 0) throw new AgsError(`Downgrades are refused: the host is at ${installed}, the target is ${target}.`);
  if (major(target) === major(installed)) return [];
  throw new AgsError(`Updating from ${installed} to ${target} crosses major versions, which this checkout does not support.`);
}
