import type { AppConfig } from "../config.js";

export class LuceedError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: string,
    public readonly url: string,
  ) {
    super(message);
    this.name = "LuceedError";
  }
}

/**
 * Minimal HTTP Basic client for Luceed datasnap/rest endpoints.
 * Read-only by default — only GET is exposed.
 */
export class LuceedClient {
  private readonly baseUrl: string;
  private readonly authHeader: string;
  private readonly timeoutMs: number;
  private readonly readOnly: boolean;

  constructor(config: AppConfig) {
    this.baseUrl = config.luceed.baseUrl;
    this.authHeader =
      "Basic " +
      Buffer.from(
        `${config.luceed.username}:${config.luceed.password}`,
        "utf8",
      ).toString("base64");
    this.timeoutMs = config.luceed.timeoutMs;
    this.readOnly = config.readOnly;
  }

  /**
   * GET a relative path under LUCEED_BASE_URL.
   * Example path: `mpracuni/lista/4986-1/1.1.2024/31.1.2024`
   */
  async get(path: string): Promise<unknown> {
    const clean = path.replace(/^\/+/, "");
    this.assertReadOnlyPath(clean);

    const url = new URL(clean, this.baseUrl).toString();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: this.authHeader,
        },
        signal: controller.signal,
      });

      const body = await res.text();
      if (!res.ok) {
        throw new LuceedError(
          `Luceed HTTP ${res.status}: ${body.slice(0, 500)}`,
          res.status,
          body,
          url,
        );
      }

      if (!body.trim()) {
        return null;
      }

      try {
        return JSON.parse(body) as unknown;
      } catch {
        // Some endpoints (e.g. PDF) may return non-JSON; surface raw text.
        return { raw: body };
      }
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Unwrap the common Luceed envelope: `{ result: [ { key: [...] } ] }`
   * Returns the first nested array/object found, or the whole payload.
   */
  unwrap(payload: unknown): unknown {
    if (!payload || typeof payload !== "object") return payload;
    const root = payload as Record<string, unknown>;
    if (!Array.isArray(root.result) || root.result.length === 0) {
      return payload;
    }

    const first = root.result[0];
    if (!first || typeof first !== "object") return first;

    const obj = first as Record<string, unknown>;
    for (const value of Object.values(obj)) {
      if (Array.isArray(value)) return value;
    }
    return first;
  }

  private assertReadOnlyPath(path: string): void {
    if (!this.readOnly) return;

    // Block obvious write-style path segments even on GET misconfiguration.
    const lower = path.toLowerCase();
    const blocked = [
      "/snimi",
      "/spremi",
      "/update",
      "/delete",
      "/create",
      "/insert",
      "/statuschange",
      "/izmjenastatusa",
    ];
    for (const b of blocked) {
      if (lower.includes(b)) {
        throw new Error(
          `Blocked potentially mutating Luceed path in read-only mode: ${path}`,
        );
      }
    }
  }
}

/** Format a Date (or ISO/yyyy-mm-dd string) as Luceed `d.M.yyyy`. */
export function toLuceedDate(input: string | Date): string {
  const d =
    typeof input === "string"
      ? parseFlexibleDate(input)
      : input instanceof Date
        ? input
        : null;

  if (!d || Number.isNaN(d.getTime())) {
    // Already looks like Luceed format — pass through.
    if (typeof input === "string" && /^\d{1,2}\.\d{1,2}\.\d{4}\.?$/.test(input)) {
      return input.replace(/\.$/, "");
    }
    throw new Error(
      `Invalid date "${String(input)}". Use YYYY-MM-DD or D.M.YYYY`,
    );
  }

  return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
}

function parseFlexibleDate(input: string): Date {
  const trimmed = input.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return new Date(trimmed);
  }
  const m = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\.?$/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    const year = Number(m[3]);
    return new Date(year, month - 1, day);
  }
  return new Date(trimmed);
}

export function encodePathSegment(value: string): string {
  // Luceed uses raw brackets in paths e.g. [0,100] — don't over-encode those.
  if (/^\[[\d,\s]+\]$/.test(value)) {
    return value.replace(/\s+/g, "");
  }
  return encodeURIComponent(value);
}

export function joinPath(...parts: Array<string | number | undefined | null>): string {
  return parts
    .filter((p) => p !== undefined && p !== null && String(p).length > 0)
    .map((p) => encodePathSegment(String(p)))
    .join("/");
}
