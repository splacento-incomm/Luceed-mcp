# Connect Claude / ChatGPT / Cursor

The MCP speaks **Streamable HTTP** on your public HTTPS URL (production) or **stdio** (local).

## What you need (remote HTTP)

1. Public URL: `https://<your-host><MCP_HTTP_PATH>`  
   Example shape: `https://mcp.example.com/mcp-a1b2c3…`
2. Auth:
   - **ChatGPT / Claude (web connectors):** **OAuth** (built-in when `MCP_PUBLIC_URL` is set) — see below
   - **Cursor / curl / scripts:** `Authorization: Bearer <MCP_AUTH_TOKEN>` or `X-Api-Key: <MCP_AUTH_TOKEN>`

Values live in the server `.env` (`MCP_HTTP_PATH`, `MCP_AUTH_TOKEN`, `MCP_PUBLIC_URL`, `MCP_OAUTH_*`).

If the hostname is behind Cloudflare (or similar) bot challenges, either skip challenges for MCP + OAuth paths or use a **DNS-only / non-proxied** hostname — see [DEPLOY.md](DEPLOY.md) §5.

---

## ChatGPT (OAuth)

ChatGPT’s custom MCP UI offers **OAuth**, **No authentication**, and **Mixed** — there is **no static Bearer field**. Use **OAuth**.

The server implements OAuth 2.1 + PKCE + dynamic client registration, with an RFC 9207 `iss` on the authorize redirect (required by ChatGPT; without it you get **“Invalid oauth data”** and tools never load).

### Prerequisites on the server

In `.env` (see [DEPLOY.md](DEPLOY.md)):

```env
MCP_PUBLIC_URL=https://mcp.example.com
MCP_OAUTH_PASSWORD=long-random-password
MCP_OAUTH_SECRET=64-hex-chars-from-openssl-rand-hex-32
MCP_AUTH_TOKEN=still-useful-for-curl-and-cursor
```

Proxy must expose `/mcp-…` **and** OAuth routes: `/.well-known/…`, `/authorize`, `/token`, `/register`, `/oauth/`.

### Add the server

1. Open **[chatgpt.com/plugins](https://chatgpt.com/plugins)** (or **Settings → Apps & connectors**).
2. Enable **Developer mode** if custom MCP is hidden.
3. **Add → Add MCP server** (not **Create plugin**).
4. **Connect to a custom MCP**:
   - **Name:** e.g. `Luceed`
   - **Type:** **Streamable HTTP**
   - **Server URL:** full HTTPS URL including the secret path  
     `https://mcp.example.com/mcp-<secret>`
   - **Authentication:** **OAuth**
5. Complete the risk confirmation → create / save.
6. Browser opens the Luceed login page → enter **`MCP_OAUTH_PASSWORD`** → Allow access.
7. Ensure the connector is **on** under **Servers** / **Plugins**.
8. **New chat** → type **`@`** → select **Luceed**.

Smoke test: *“Call luceed_ping”* or *“List Luceed tools”*.

### Troubleshooting ChatGPT

| Symptom | Likely cause |
|--------|----------------|
| **Invalid oauth data** | Old connector before `iss` fix — **delete and re-add**; ensure current image is deployed |
| HTML / “Just a moment…” | CDN bot challenge — [DEPLOY.md](DEPLOY.md) §5 |
| Plugin listed but no tools | OAuth incomplete / 401 — re-auth or check Apache OAuth proxy paths |
| Tools work, Luceed errors | SSH tunnel / Luceed creds — [DEPLOY.md](DEPLOY.md) §6 |
| STDIO form shown | Wrong type — choose **Streamable HTTP** |

---

## Claude

1. Add a **custom MCP connector** / remote MCP server.
2. **Server URL** = same HTTPS URL (path included).
3. Prefer **OAuth** (same login password as ChatGPT) if the UI offers it; otherwise Bearer `MCP_AUTH_TOKEN` works when the connector supports headers.

---

## Cursor

**Remote HTTP:** MCP config with the HTTPS URL + `Authorization: Bearer <MCP_AUTH_TOKEN>` (or `X-Api-Key`).

**Local stdio:** see root [README](../README.md).

---

## Quick verify (Bearer / Cursor)

```bash
curl -sS -X POST 'https://mcp.example.com/mcp-YOUR_SECRET' \
  -H 'content-type: application/json' \
  -H 'authorization: Bearer YOUR_TOKEN' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"t","version":"0"}}}'
```

Expect JSON-RPC with `"serverInfo":{"name":"luceed-mcp",...}`.

OAuth discovery check:

```bash
curl -sS 'https://mcp.example.com/.well-known/oauth-authorization-server'
# should include authorization_response_iss_parameter_supported: true
```
