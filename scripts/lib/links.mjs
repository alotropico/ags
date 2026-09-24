import fs from "node:fs";
import path from "node:path";
import { relativeInside } from "./util.mjs";

const LINK = /\[[^\]]*\]\(([^)\s]+)\)/g;

function decodedHref(raw) {
  try {
    return decodeURI(raw);
  } catch {
    return raw;
  }
}

export function markdownHrefs(text) {
  const hrefs = [];
  for (const match of String(text).matchAll(LINK)) {
    const href = decodedHref(match[1]).split("#")[0].trim();
    if (!href || href.startsWith("#")) continue;
    hrefs.push(href);
  }
  return hrefs;
}

export function isExternalHref(href) {
  return /^(?:[a-z]+:)?\/\//i.test(href) || href.startsWith("mailto:");
}

export function crossSkillIds(canonicalRoot, fromDirectory, text) {
  const ids = [];
  for (const href of markdownHrefs(text)) {
    if (isExternalHref(href) || path.isAbsolute(href)) continue;
    const target = path.resolve(fromDirectory, href);
    let rel;
    try {
      rel = relativeInside(canonicalRoot, target);
    } catch {
      continue;
    }
    const match = rel.match(/^skills\/([a-z0-9][a-z0-9-]*)\/SKILL\.md$/);
    if (!match || ids.includes(match[1])) continue;
    ids.push(match[1]);
  }
  return ids;
}

export function relativeLinkErrors(root, fromDirectory, text) {
  const errors = [];
  for (const match of text.matchAll(LINK)) {
    const href = decodedHref(match[1]).split("#")[0].trim();
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
