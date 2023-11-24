import { isAbsolute, transformUrl } from "./url";

const MATCH_CSS_URL = /url\(\s*(['"])?(.*?)\1\s*\)/g;
const MATCH_CHARSET_URL = /@charset\s+(['"])(.*?)\1\s*;?/g;
const MATCH_IMPORT_URL = /@import\s+(['"])(.*?)\1/g;

export function fixUrl(code: string, baseUrl: string) {
  if (typeof code !== "string") {
    return code;
  }

  return code
    .replace(MATCH_CHARSET_URL, "")
    .replace(MATCH_IMPORT_URL, "")
    .replace(MATCH_IMPORT_URL, function (k0, k1, k2) {
      return k2 ? `@import url(${k1}${k2}${k1})` : k0;
    })
    .replace(MATCH_CSS_URL, (k0, k1, k2) => {
      if (isAbsolute(k2)) return k0;
      return `url("${baseUrl ? transformUrl(baseUrl, k2) : k2}")`;
    })
}

export function addModuleScope(code: string) {
  if (typeof code !== "string") {
    return code;
  }
  return code;
}