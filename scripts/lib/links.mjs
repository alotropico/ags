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
