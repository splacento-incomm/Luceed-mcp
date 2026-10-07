# Setup & configuration

## 1. Luceed API user

Ask Tomsoft / your Luceed admin for:

1. Web service base URL, typically:
   `http://<host>/datasnap/rest/`
2. A dedicated **read-only** username + password (HTTP Basic Auth).
3. Confirmation which GET methods the user may call (retail invoices, `mpobracun`, stock, etc.).
4. The **whitelisted source IP** for the API.

Never reuse a Magento sync write user for MCP.

## 2. Environment variables

Copy `.env.example` → `.env`.

### Required

| Variable | Example | Notes |
|----------|---------|--------|
| `LUCEED_BASE_URL` | `http://127.0.0.1:18080/datasnap/rest/` | Must include `/datasnap/rest` |
| `LUCEED_USERNAME` | `mcp_ro` | Basic auth user |
| `LUCEED_PASSWORD` | `***` | Basic auth password |

### Transport

| Variable | Default | Notes |
|----------|---------|--------|
| `MCP_TRANSPORT` | `stdio` | `stdio` or `http` |
| `MCP_HTTP_HOST` | `0.0.0.0` | Bind address (HTTP mode) |
| `MCP_HTTP_PORT` | `8080` | Listen port |
| `MCP_HTTP_PATH` | `/mcp` | MCP POST path |
| `MCP_AUTH_TOKEN` | _(empty)_ | **Set this** for remote HTTP |

### SSH tunnel

| Variable | Default | Notes |
|----------|---------|--------|
| `SSH_ENABLED` | `false` | Open local forward before serving |
| `SSH_HOST` | | Bastion / jump host |
| `SSH_PORT` | `22` | |
| `SSH_USER` | | SSH user |
| `SSH_PRIVATE_KEY_PATH` | | Path inside container/host |
| `SSH_PRIVATE_KEY` | | PEM body (use `\n` for newlines) |
| `SSH_REMOTE_HOST` | `127.0.0.1` | Host as seen **from the bastion** (often Luceed on localhost of bastion) |
| `SSH_REMOTE_PORT` | `80` | Luceed HTTP port on remote side |
| `SSH_LOCAL_PORT` | `18080` | Local listen port; must match `LUCEED_BASE_URL` |
| `SSH_STRICT_HOST_KEY_CHECKING` | `false` | Set `true` in production with known_hosts |
| `SSH_KNOWN_HOSTS_PATH` | | Optional known_hosts file |

### Safety

| Variable | Default | Notes |
|----------|---------|--------|
| `LUCEED_READ_ONLY` | `true` | Only GET; blocks write-looking path segments |
| `LUCEED_TIMEOUT_MS` | `60000` | Per-request timeout |

## 3. SSH tunnel patterns

### Pattern A — MCP opens the tunnel (recommended)

```
MCP host  --ssh -L 18080:127.0.0.1:80-->  bastion (whitelisted IP)
                                            |
                                         Luceed :80
```

```env
SSH_ENABLED=true
SSH_HOST=bastion.customer.hr
SSH_USER=tunnel
SSH_PRIVATE_KEY_PATH=/run/secrets/ssh_key
SSH_REMOTE_HOST=127.0.0.1
SSH_REMOTE_PORT=80
SSH_LOCAL_PORT=18080
LUCEED_BASE_URL=http://127.0.0.1:18080/datasnap/rest/
```

### Pattern B — external tunnel / sidecar

Run `ssh -N -L 18080:...` yourself (or a Compose sidecar), set `SSH_ENABLED=false`, and still point `LUCEED_BASE_URL` at `127.0.0.1:18080`.

### Pattern C — MCP runs on the whitelisted IP

No SSH. Point `LUCEED_BASE_URL` directly at Luceed.

## 4. Docker deploy

```bash
mkdir -p secrets && chmod 700 secrets
# put private key at secrets/id_rsa (chmod 600)
cp .env.example .env
# edit .env

# uncomment key volume in docker-compose.yml
docker compose up --build -d
docker compose logs -f
```

Place a reverse proxy (Caddy/nginx/Traefik) with TLS in front of `:8080` for internet-facing use.

### Health

`GET /healthz` → `{ "ok": true, "service": "luceed-mcp" }`

## 5. Connecting clients

### Cursor (stdio)

See root `README.md` — `mcpServers` JSON with `command` + `env`.

### Remote HTTP (Claude / ChatGPT / others)

1. Deploy Docker with `MCP_TRANSPORT=http` and `MCP_AUTH_TOKEN`.
2. Register custom MCP server URL: `https://your-host/mcp`
3. Send `Authorization: Bearer <MCP_AUTH_TOKEN>`

Exact UI steps vary by product; the transport is **Streamable HTTP** (MCP 2025-era).

## 6. Full coverage model

All **GET** endpoints from Luceed Web Services 2.206 are registered in `src/catalog/endpoints.ts` (~149 actions / 39 resources).

- Call **`luceed_catalog`** to list them at runtime.
- Call **`luceed_<resource>`** with an `action` + params.
- Use **`luceed_get`** only for ad-hoc paths.

**Not mapped (by design — read-only):** `*/snimi`, document upload/delete, status mutations, `Isporuka`/`Prijem`/`Predprijem`, `ura/*` writes, CRM create, GDPR create, bundle component mutate, points/promo assign, etc.

Magento `Debuglabs/Luceed` write calls (`partneri/snimi`, `NaloziProdaje/snimi`) stay out of MCP.

## 7. First queries to try

1. `luceed_ping`
2. `luceed_catalog` with `magento_only: true`
3. `luceed_list_warehouses` → use `luceed_skladista` / `action=lista` — note `pj_uid`
4. `luceed_retail_sales_summary` with that `pj_uid`

## 8. Troubleshooting

| Symptom | Check |
|---------|--------|
| `Missing required environment variable` | `.env` / Compose `env_file` |
| `SSH tunnel did not open local port` | Key perms (`600`), bastion, `SSH_REMOTE_*` |
| HTTP 401 from Luceed | Username/password; WS user enabled |
| HTTP 403 / timeout | IP whitelist / tunnel |
| Empty sales | Wrong `pj_uid` or dates |
| MCP client 401 | `MCP_AUTH_TOKEN` |
| Unknown action | `luceed_catalog` for that resource |

## 9. Extending

Add an `ActionDef` under the right resource in `src/catalog/endpoints.ts`. Tools regenerate on restart. Keep writes out.

## 10. Public GitHub + server pull

```bash
git clone https://github.com/splacento-incomm/Luceed-mcp.git
cd Luceed-mcp
cp .env.example .env   # never commit .env
docker compose up --build -d
```

Tomsoft’s official Web Services PDF is **not** in this repo (proprietary). Keep your licensed copy locally if you need field-level reference.
