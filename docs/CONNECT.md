# Connect Claude / ChatGPT / Cursor

The MCP speaks **Streamable HTTP** on your public HTTPS URL (production) or **stdio** (local).

## What you need (remote HTTP)

1. Public URL: `https://<your-host><MCP_HTTP_PATH>`  
   Example shape: `https://mcp.example.com/mcp-a1b2c3…`
2. Auth for **clients that support headers**:  
   `Authorization: Bearer <MCP_AUTH_TOKEN>` or `X-Api-Key: <MCP_AUTH_TOKEN>`

Both values live in the server `.env` (`MCP_HTTP_PATH`, `MCP_AUTH_TOKEN`).

If the hostname is behind Cloudflare (or similar) bot challenges, allow the MCP path through **before** testing clients — see [DEPLOY.md](DEPLOY.md) §5.

---

## ChatGPT

ChatGPT lists remote MCP connections under **Servers** (after you add one). The **Plugins** screen is related (Add → **Add MCP server**); the connector also appears when you type **`@`** in chat if it is enabled.

### Add the server

1. Open **[chatgpt.com/plugins](https://chatgpt.com/plugins)** (or **Settings → Apps & connectors**).
2. If you do not see custom MCP options: **Advanced settings → Developer mode** (wording may vary).
3. **Add → Add MCP server** (not **Create plugin** — that is a different feature).
4. On **Connect to a custom MCP**:
   - **Name:** e.g. `Luceed`
   - **Type:** **Streamable HTTP** (required for your deployed Docker URL)
   - **Server URL:** full HTTPS URL including the secret path, e.g.  
     `https://your-host.example/mcp-<secret>`  
     (must match `MCP_HTTP_PATH` on the server; no placeholder hostnames)
5. **Authentication** (if shown): ChatGPT typically offers **OAuth** or **No authentication** only — there is **no field for a static Bearer token**.

### Use in chat

1. **Settings → Servers** (or Plugins): ensure **Luceed** is **on**.
2. Start a **new chat**.
3. Type **`@`** and select **Luceed**, then ask (e.g. *“Call luceed_ping”* or *“Show luceed_catalog”*).

### ChatGPT + Bearer auth (important)

This MCP expects `MCP_AUTH_TOKEN` on HTTP requests when the token is set in `.env`. ChatGPT’s **Add MCP server** UI does **not** send Bearer/`X-Api-Key` unless you implement **OAuth** on the MCP side or change deployment auth (e.g. optional query token — not enabled by default).

| Symptom | Likely cause |
|--------|----------------|
| HTML / “Just a moment…” | CDN bot challenge — fix Cloudflare (or similar) for the MCP path |
| Connected but tools fail / 401 | Token required; ChatGPT not sending Bearer |
| Works from server `curl`, fails from laptop | Same as above, or DNS/proxy mismatch |

**Claude** (custom connector with Bearer) and **Cursor** (HTTP MCP config with headers) match the default server auth without OAuth.

### Local-only alternative (STDIO)

On **Connect to a custom MCP**, **STDIO** runs Node on **your computer** (not `https://…`). Use only for dev: build the repo, set `MCP_TRANSPORT=stdio` and `LUCEED_*` env vars, command `node`, args `…/dist/index.js`. Production ChatGPT access should use **Streamable HTTP** on the public URL.

---

## Claude

1. Add a **custom MCP connector** / remote MCP server.
2. **Server URL** = HTTPS URL above (path included).
3. **Authentication** = Bearer token from `MCP_AUTH_TOKEN` (Claude supports this in the connector UI).

---

## Cursor (remote HTTP)

Use MCP settings that point at the HTTPS URL and send the Bearer header (or `X-Api-Key`). For local stdio, see the root [README](../README.md).

---

## Quick verify

```bash
curl -sS -X POST 'https://mcp.example.com/mcp-YOUR_SECRET' \
  -H 'content-type: application/json' \
  -H 'authorization: Bearer YOUR_TOKEN' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"t","version":"0"}}}'
```

You want a JSON-RPC result with `"serverInfo":{"name":"luceed-mcp",...}`.

If you get an HTML challenge page, fix CDN/bot protection for that path — see [DEPLOY.md](DEPLOY.md) §5.
