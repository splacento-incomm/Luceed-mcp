import { createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import express, { type Request, type Response, type Router } from "express";
import { rateLimit } from "express-rate-limit";
import type { OAuthRegisteredClientsStore } from "@modelcontextprotocol/sdk/server/auth/clients.js";
import { InvalidGrantError, InvalidTokenError } from "@modelcontextprotocol/sdk/server/auth/errors.js";
import type {
  AuthorizationParams,
  OAuthServerProvider,
} from "@modelcontextprotocol/sdk/server/auth/provider.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type {
  OAuthClientInformationFull,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";

const ACCESS_TTL_S = 60 * 60;
const REFRESH_TTL_S = 90 * 24 * 60 * 60;
const CODE_TTL_MS = 5 * 60 * 1000;
const PENDING_TTL_MS = 15 * 60 * 1000;

export const LOGIN_PATH = "/oauth/login";

type TokenKind = "access" | "refresh";

interface TokenPayload {
  k: TokenKind;
  cid: string;
  sc: string[];
  res?: string;
  exp: number;
  n: string;
}

interface CodeRecord {
  clientId: string;
  challenge: string;
  redirectUri: string;
  scopes: string[];
  resource?: string;
  expiresAt: number;
}

interface PendingRecord {
  clientId: string;
  clientName: string;
  params: AuthorizationParams;
  expiresAt: number;
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

class FileClientsStore implements OAuthRegisteredClientsStore {
  private clients = new Map<string, OAuthClientInformationFull>();

  constructor(private readonly file: string) {
    if (existsSync(file)) {
      const list = JSON.parse(readFileSync(file, "utf8")) as OAuthClientInformationFull[];
      for (const c of list) this.clients.set(c.client_id, c);
    }
  }

  getClient(clientId: string) {
    return this.clients.get(clientId);
  }

  registerClient(client: Omit<OAuthClientInformationFull, "client_id" | "client_id_issued_at">) {
    const full = client as OAuthClientInformationFull;
    this.clients.set(full.client_id, full);
    mkdirSync(dirname(this.file), { recursive: true });
    writeFileSync(this.file, JSON.stringify([...this.clients.values()], null, 2), { mode: 0o600 });
    return full;
  }
}

export interface OAuthOptions {
  password: string;
  signingSecret: string;
  stateFile: string;
  staticToken: string | null;
}

export class LuceedOAuthProvider implements OAuthServerProvider {
  readonly clientsStore: FileClientsStore;
  private codes = new Map<string, CodeRecord>();
  private pending = new Map<string, PendingRecord>();

  constructor(private readonly opts: OAuthOptions) {
    this.clientsStore = new FileClientsStore(opts.stateFile);
  }

  private sign(payload: TokenPayload): string {
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const mac = createHmac("sha256", this.opts.signingSecret).update(body).digest("base64url");
    return `${body}.${mac}`;
  }

  private verify(token: string, kind: TokenKind): TokenPayload {
    const [body, mac] = token.split(".");
    if (!body || !mac) throw new InvalidTokenError("Malformed token");
    const expected = createHmac("sha256", this.opts.signingSecret).update(body).digest("base64url");
    if (!safeEqual(mac, expected)) throw new InvalidTokenError("Invalid token signature");
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as TokenPayload;
    if (payload.k !== kind) throw new InvalidTokenError("Wrong token type");
    if (payload.exp < Date.now() / 1000) throw new InvalidTokenError("Token has expired");
    return payload;
  }

  private issueTokens(clientId: string, scopes: string[], resource?: string): OAuthTokens {
    const now = Math.floor(Date.now() / 1000);
    const nonce = () => randomBytes(8).toString("base64url");
    return {
      access_token: this.sign({ k: "access", cid: clientId, sc: scopes, res: resource, exp: now + ACCESS_TTL_S, n: nonce() }),
      refresh_token: this.sign({ k: "refresh", cid: clientId, sc: scopes, res: resource, exp: now + REFRESH_TTL_S, n: nonce() }),
      token_type: "bearer",
      expires_in: ACCESS_TTL_S,
      scope: scopes.join(" ") || undefined,
    };
  }

  private prune(): void {
    const now = Date.now();
    for (const [k, v] of this.codes) if (v.expiresAt < now) this.codes.delete(k);
    for (const [k, v] of this.pending) if (v.expiresAt < now) this.pending.delete(k);
  }

  async authorize(client: OAuthClientInformationFull, params: AuthorizationParams, res: Response): Promise<void> {
    this.prune();
    const id = randomUUID();
    const clientName = client.client_name || client.client_id;
    this.pending.set(id, { clientId: client.client_id, clientName, params, expiresAt: Date.now() + PENDING_TTL_MS });
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(loginPage(id, clientName));
  }

  async challengeForAuthorizationCode(client: OAuthClientInformationFull, code: string): Promise<string> {
    const rec = this.codes.get(code);
    if (!rec || rec.clientId !== client.client_id || rec.expiresAt < Date.now()) {
      throw new InvalidGrantError("Invalid or expired authorization code");
    }
    return rec.challenge;
  }

  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    code: string,
    _verifier?: string,
    redirectUri?: string,
  ): Promise<OAuthTokens> {
    const rec = this.codes.get(code);
    this.codes.delete(code);
    if (!rec || rec.clientId !== client.client_id || rec.expiresAt < Date.now()) {
      throw new InvalidGrantError("Invalid or expired authorization code");
    }
    if (redirectUri && redirectUri !== rec.redirectUri) {
      throw new InvalidGrantError("redirect_uri mismatch");
    }
    return this.issueTokens(client.client_id, rec.scopes, rec.resource);
  }

  async exchangeRefreshToken(client: OAuthClientInformationFull, refreshToken: string): Promise<OAuthTokens> {
    let payload: TokenPayload;
    try {
      payload = this.verify(refreshToken, "refresh");
    } catch {
      throw new InvalidGrantError("Invalid refresh token");
    }
    if (payload.cid !== client.client_id) throw new InvalidGrantError("Refresh token was issued to another client");
    return this.issueTokens(client.client_id, payload.sc, payload.res);
  }

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    if (this.opts.staticToken && safeEqual(token, this.opts.staticToken)) {
      return { token, clientId: "static-token", scopes: [], expiresAt: Math.floor(Date.now() / 1000) + ACCESS_TTL_S };
    }
    const p = this.verify(token, "access");
    return { token, clientId: p.cid, scopes: p.sc, expiresAt: p.exp, resource: p.res ? new URL(p.res) : undefined };
  }

  loginRouter(): Router {
    const router = express.Router();
    router.use(express.urlencoded({ extended: false }));
    router.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false }));
    router.post("/", (req: Request, res: Response) => {
      res.setHeader("Cache-Control", "no-store");
      const id = String(req.body?.request_id ?? "");
      const password = String(req.body?.password ?? "");
      const pending = this.pending.get(id);
      if (!pending || pending.expiresAt < Date.now()) {
        res.status(400).type("html").send(messagePage("This login link expired. Start the connection again from ChatGPT / Claude."));
        return;
      }
      if (!safeEqual(password, this.opts.password)) {
        res.status(401).type("html").send(loginPage(id, pending.clientName, "Wrong password."));
        return;
      }
      this.pending.delete(id);
      const code = randomBytes(32).toString("base64url");
      const { params } = pending;
      this.codes.set(code, {
        clientId: pending.clientId,
        challenge: params.codeChallenge,
        redirectUri: params.redirectUri,
        scopes: params.scopes ?? [],
        resource: params.resource?.href,
        expiresAt: Date.now() + CODE_TTL_MS,
      });
      const target = new URL(params.redirectUri);
      target.searchParams.set("code", code);
      if (params.state) target.searchParams.set("state", params.state);
      res.redirect(302, target.href);
    });
    return router;
  }
}

function shell(body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Luceed MCP</title><style>
body{font-family:system-ui,sans-serif;background:#f4f5f7;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}
.card{background:#fff;padding:2rem;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.08);width:min(360px,90vw)}
h1{font-size:1.25rem;margin:0 0 .5rem}p{color:#555;font-size:.9rem}
input{width:100%;box-sizing:border-box;padding:.7rem;margin:.75rem 0;border:1px solid #ccc;border-radius:8px;font-size:1rem}
button{width:100%;padding:.7rem;border:0;border-radius:8px;background:#1f6feb;color:#fff;font-size:1rem;cursor:pointer}
.err{color:#c62828}</style></head><body><div class="card">${body}</div></body></html>`;
}

function loginPage(requestId: string, clientName: string, error?: string): string {
  return shell(`<h1>Luceed MCP</h1>
<p><strong>${escapeHtml(clientName)}</strong> wants read-only access to Luceed.</p>
${error ? `<p class="err">${escapeHtml(error)}</p>` : ""}
<form method="post" action="${LOGIN_PATH}">
<input type="hidden" name="request_id" value="${escapeHtml(requestId)}">
<input type="password" name="password" placeholder="Access password" autofocus required>
<button type="submit">Allow access</button></form>`);
}

function messagePage(message: string): string {
  return shell(`<h1>Luceed MCP</h1><p>${escapeHtml(message)}</p>`);
}
