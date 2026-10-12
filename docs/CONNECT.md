# Connect Claude / ChatGPT

The MCP speaks **Streamable HTTP** on your public HTTPS URL.

## What you need

1. Public URL: `https://<your-host><MCP_HTTP_PATH>`  
   Example shape: `https://mcp.example.com/mcp-a1b2c3…`
2. Header: `Authorization: Bearer <MCP_AUTH_TOKEN>`

Both values live in the server `.env` (`MCP_HTTP_PATH`, `MCP_AUTH_TOKEN`).

## ChatGPT

1. Open ChatGPT → settings / connectors for **custom MCP** (UI label varies).
2. Server URL = the HTTPS URL above (path included).
3. Auth = Bearer token from `MCP_AUTH_TOKEN`.

## Claude

1. Add a **custom MCP connector** / remote MCP server.
2. Same HTTPS URL + Bearer token.

## Cursor (remote HTTP)

Use an MCP config that points at the HTTPS URL with the Bearer header (product-specific). For local stdio instead, see the root README.

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
