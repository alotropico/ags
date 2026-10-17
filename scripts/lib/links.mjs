import fs from "node:fs";
import path from "node:path";
import { relativeInside } from "./util.mjs";

const LINK = /\[[^\]]*\]\(\s*(?:<([^>]+)>|([^\s)]+))(?:\s+["'][^\n]*?["'])?\s*\)/g;

function decodedHref(raw) {
  try {
    return decodeURI(raw);
  } catch {
    return raw;
  }
}

export function markdownHrefs(text) {
  text = String(text);
  const hrefs = [];
  const add = (raw) => {
    const href = decodedHref(raw).split("#")[0].trim();
    if (href) hrefs.push(href);
  };
  for (const match of text.matchAll(LINK)) add(match[1] ?? match[2]);
  const definitions = new Map();
  const normalize = (value) => value.trim().replace(/\s+/g, " ").toLowerCase();
  for (const match of text.matchAll(/^ {0,3}\[([^\]]+)\]:\s*(?:<([^>]+)>|([^\s]+))/gm)) definitions.set(normalize(match[1]), match[2] ?? match[3]);
  for (const match of text.matchAll(/\[([^\]\n]+)\](?:\[([^\]\n]*)\])?/g)) {
    const after = text.slice(match.index + match[0].length);
    if (after.startsWith("(") || after.startsWith(":")) continue;
    const raw = definitions.get(normalize(match[2] || match[1]));
    if (raw) add(raw);
  }
  return hrefs;
}

export function isExternalHref(href) {
  return /^(?:[a-z]+:)?\/\//i.test(href) || href.startsWith("mailto:");
}

export function hostLinkTargets(fromHostRel, text) {
  const out = [];
  for (const href of markdownHrefs(text)) {
    if (isExternalHref(href)) continue;
    if (path.isAbsolute(href) || /^[a-zA-Z]:/.test(href) || href.startsWith("/") || href.startsWith("\\")) {
      out.push({ href, target: null });
      continue;
    }
    const joined = path.posix.normalize(path.posix.join(path.posix.dirname(fromHostRel), href.replaceAll("\\", "/")));
    out.push({ href, target: joined === ".." || joined.startsWith("../") ? null : joined });
  }
  return out;
}

export function relativeLinkErrors(root, fromDirectory, text) {
  const errors = [];
  for (const href of markdownHrefs(text)) {
    if (!href || href.startsWith("#") || /^(?:[a-z]+:)?\/\//i.test(href) || href.startsWith("mailto:")) continue;
    if (path.isAbsolute(href)) {
      errors.push(href);
      continue;
    }
    const target = path.resolve(fromDirectory, href);
    try {
      relativeInside(root, target);
    } catch {
      errors.push(href);
      continue;
    }
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) errors.push(href);
  }
  return errors;
}
