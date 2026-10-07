import { toLuceedDate } from "../luceed/client.js";
import type { ActionDef, ParamDef } from "./endpoints.js";

const DATE_PARAM = /(_datuma|datum|timestamp|modified|od_datuma|do_datuma)$/i;

function looksLikeDateParam(name: string): boolean {
  return DATE_PARAM.test(name) || name === "timestamp" || name === "modified";
}

function formatList(value: string): string {
  const parts = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return "[]";
  if (parts.length === 1 && value.trim().startsWith("[")) {
    return value.trim().replace(/\s+/g, "");
  }
  return `[${parts.join(",")}]`;
}

function formatValue(param: ParamDef, raw: unknown): string {
  let value = String(raw ?? "").trim();
  if (!value) return "";

  if (param.list) {
    return formatList(value);
  }

  if (looksLikeDateParam(param.name)) {
    // Keep timestamps with time as-is if they already look Luceed-ish
    if (/^\d{1,2}\.\d{1,2}\.\d{4}/.test(value)) {
      return value;
    }
    try {
      return toLuceedDate(value);
    } catch {
      return value;
    }
  }

  return value;
}

/**
 * Build a relative Luceed path from a template like:
 *   NaloziProdaje/statusi/{statusi}/{od_datuma?}/{do_datuma?}
 */
export function buildPath(
  action: ActionDef,
  args: Record<string, unknown>,
): string {
  const params = action.params ?? [];
  const byName = new Map(params.map((p) => [p.name, p]));

  // Validate required
  for (const param of params) {
    if (param.required === false) continue;
    const v = args[param.name];
    if (v === undefined || v === null || String(v).trim() === "") {
      throw new Error(`Missing required parameter: ${param.name}`);
    }
  }

  let path = action.path;

  // Replace {name?} optional then {name} required
  path = path.replace(/\{([a-zA-Z0-9_]+)\?\}/g, (_m, name: string) => {
    const def = byName.get(name);
    const raw = args[name];
    if (raw === undefined || raw === null || String(raw).trim() === "") {
      return "";
    }
    return formatValue(def ?? { name, description: name }, raw);
  });

  path = path.replace(/\{([a-zA-Z0-9_]+)\}/g, (_m, name: string) => {
    const def = byName.get(name);
    const raw = args[name];
    if (raw === undefined || raw === null || String(raw).trim() === "") {
      throw new Error(`Missing path parameter: ${name}`);
    }
    return formatValue(def ?? { name, description: name }, raw);
  });

  // Clean double slashes and trailing slash (except root)
  path = path
    .replace(/\/{2,}/g, "/")
    .replace(/\/+$/, "");

  // Encode each segment but preserve [lists]
  return path
    .split("/")
    .map((seg) => {
      if (!seg) return seg;
      if (/^\[[\w.,\-:]+\]$/i.test(seg)) return seg;
      // Don't encode dots in dates / already-safe tokens
      if (/^[\w.\-:]+$/i.test(seg)) return seg;
      return encodeURIComponent(seg);
    })
    .join("/");
}
