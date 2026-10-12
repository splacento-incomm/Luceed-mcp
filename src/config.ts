import { config as loadDotenv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

loadDotenv();

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback = ""): string {
  return process.env[name]?.trim() || fallback;
}

function bool(name: string, fallback = false): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (raw === undefined || raw === "") return fallback;
  return ["1", "true", "yes", "on"].includes(raw);
}

function int(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n)) {
    throw new Error(`Environment variable ${name} must be an integer`);
  }
  return n;
}

export type TransportMode = "stdio" | "http";

export interface AppConfig {
  luceed: {
    baseUrl: string;
    username: string;
    password: string;
    timeoutMs: number;
  };
  transport: TransportMode;
  http: {
    host: string;
    port: number;
    path: string;
    authToken: string | null;
    allowedHosts: string[] | undefined;
    trustProxy: number;
  };
  oauth: {
    publicUrl: string;
    password: string;
    signingSecret: string;
    stateFile: string;
  } | null;
  ssh: {
    enabled: boolean;
    host: string;
    port: number;
    user: string;
    privateKeyPath: string | null;
    privateKey: string | null;
    knownHostsPath: string | null;
    remoteHost: string;
    remotePort: number;
    localPort: number;
    strictHostKeyChecking: boolean;
  };
  readOnly: boolean;
}

function normalizeBaseUrl(url: string): string {
  const trimmed = url.replace(/\/+$/, "");
  // Accept either .../datasnap/rest or full host; ensure trailing slash for path join.
  return `${trimmed}/`;
}

function loadOAuthConfig(): AppConfig["oauth"] {
  const publicUrl = optional("MCP_PUBLIC_URL").replace(/\/+$/, "");
  if (!publicUrl) return null;
  const password = optional("MCP_OAUTH_PASSWORD");
  if (!password) {
    throw new Error("MCP_PUBLIC_URL enables OAuth and requires MCP_OAUTH_PASSWORD");
  }
  const signingSecret = optional("MCP_OAUTH_SECRET");
  if (signingSecret.length < 32) {
    throw new Error("MCP_OAUTH_SECRET must be at least 32 characters");
  }
  return {
    publicUrl,
    password,
    signingSecret,
    stateFile: optional("MCP_OAUTH_STATE_FILE", "./data/oauth-clients.json"),
  };
}

export function loadConfig(): AppConfig {
  const sshEnabled = bool("SSH_ENABLED", false);

  const privateKeyPath = optional("SSH_PRIVATE_KEY_PATH");
  const privateKey = optional("SSH_PRIVATE_KEY");

  if (sshEnabled) {
    if (!privateKeyPath && !privateKey) {
      throw new Error(
        "SSH_ENABLED=true requires SSH_PRIVATE_KEY_PATH or SSH_PRIVATE_KEY",
      );
    }
    if (privateKeyPath && !existsSync(resolve(privateKeyPath))) {
      throw new Error(`SSH private key not found at: ${privateKeyPath}`);
    }
  }

  const transport = (optional("MCP_TRANSPORT", "stdio").toLowerCase() ||
    "stdio") as TransportMode;
  if (transport !== "stdio" && transport !== "http") {
    throw new Error('MCP_TRANSPORT must be "stdio" or "http"');
  }

  return {
    luceed: {
      baseUrl: normalizeBaseUrl(required("LUCEED_BASE_URL")),
      username: required("LUCEED_USERNAME"),
      password: required("LUCEED_PASSWORD"),
      timeoutMs: int("LUCEED_TIMEOUT_MS", 60_000),
    },
    transport,
    http: {
      host: optional("MCP_HTTP_HOST", "0.0.0.0"),
      port: int("MCP_HTTP_PORT", 8080),
      path: optional("MCP_HTTP_PATH", "/mcp"),
      authToken: optional("MCP_AUTH_TOKEN") || null,
      allowedHosts: optional("MCP_ALLOWED_HOSTS")
        ? optional("MCP_ALLOWED_HOSTS")
            .split(",")
            .map((h) => h.trim())
            .filter(Boolean)
        : undefined,
      trustProxy: int("MCP_TRUST_PROXY", 1),
    },
    oauth: loadOAuthConfig(),
    ssh: {
      enabled: sshEnabled,
      host: optional("SSH_HOST"),
      port: int("SSH_PORT", 22),
      user: optional("SSH_USER"),
      privateKeyPath: privateKeyPath || null,
      privateKey: privateKey || null,
      knownHostsPath: optional("SSH_KNOWN_HOSTS_PATH") || null,
      remoteHost: optional("SSH_REMOTE_HOST", "127.0.0.1"),
      remotePort: int("SSH_REMOTE_PORT", 80),
      localPort: int("SSH_LOCAL_PORT", 18080),
      strictHostKeyChecking: bool("SSH_STRICT_HOST_KEY_CHECKING", false),
    },
    readOnly: bool("LUCEED_READ_ONLY", true),
  };
}
