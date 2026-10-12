# Production deploy

Goal: **Claude / ChatGPT** reach the MCP over **public HTTPS**. Docker stays on localhost; a reverse proxy exposes the MCP path and OAuth endpoints.

```
ChatGPT / Claude
      │  HTTPS + OAuth (or Bearer for Cursor/curl)
      ▼
TLS reverse proxy (Apache / nginx / Caddy)
      │  /mcp-<secret>, /.well-known/*, /authorize, /token, /register, /oauth/*
      ▼
Docker (OS user luceed-mcp)  ← .env in ~/Luceed-mcp
      │  optional auto SSH tunnel (SSH_ENABLED)
      ▼
Luceed datasnap/rest
```

Do **not** rely on a laptop SSH tunnel for ChatGPT/Claude. The MCP **HTTP** endpoint must be reachable on the public internet. The optional SSH tunnel is only for the container → Luceed hop.

---

## 1. Dedicated OS user (as root)

```bash
adduser --disabled-password --gecos "Luceed MCP" luceed-mcp
# install Docker Engine + Compose plugin, then:
usermod -aG docker luceed-mcp
```

## 2. Checkout + `.env`

```bash
sudo -u luceed-mcp -H bash -lc '
  cd ~
  git clone https://github.com/splacento-incomm/Luceed-mcp.git
  cd Luceed-mcp
  mkdir -p secrets
  # directory must be traversable by container uid 10001 (mcp)
  chmod 755 secrets
  cp .env.example .env && chmod 600 .env
'
```

Edit `.env`:

| Variable | Purpose |
|----------|---------|
| `LUCEED_BASE_URL` / `USERNAME` / `PASSWORD` | Luceed API (use `http://127.0.0.1:18080/datasnap/rest/` when tunneling) |
| `MCP_HTTP_PATH` | Unguessable path, e.g. `/mcp-<64 hex chars>` |
| `MCP_AUTH_TOKEN` | Bearer / `X-Api-Key` for Cursor, curl, Claude-with-headers |
| `MCP_PUBLIC_URL` | Public **origin only** (no path), e.g. `https://mcp.example.com` — **enables OAuth** |
| `MCP_OAUTH_PASSWORD` | Password on the ChatGPT/Claude login page |
| `MCP_OAUTH_SECRET` | HMAC key (`openssl rand -hex 32`, ≥32 chars) |
| `MCP_ALLOWED_HOSTS` | Public hostname(s), comma-separated (include every Host used) |
| `MCP_TRUST_PROXY` | Usually `1` behind Apache/nginx |
| `SSH_*` | Auto tunnel if Luceed is only reachable via a bastion (see §6) |

## 3. Docker Compose

```bash
sudo -u luceed-mcp -H bash -lc '
  cd ~/Luceed-mcp
  docker compose pull || docker compose build
  docker compose up -d
'
# health (Host header must be allowed if MCP_ALLOWED_HOSTS is set)
curl -sS -H 'Host: mcp.example.com' http://127.0.0.1:8080/healthz
```

Compose binds **`127.0.0.1:8080` only**. Image: `ghcr.io/splacento-incomm/luceed-mcp:latest`.

Logs should show OAuth when `MCP_PUBLIC_URL` is set:

```text
MCP auth: OAuth (issuer https://mcp.example.com) + static token
```

## 4. Reverse proxy (required for ChatGPT / Claude)

Expose:

- `MCP_HTTP_PATH` (Streamable HTTP)
- OAuth: `/.well-known/`, `/authorize`, `/token`, `/register`, `/oauth/`
- Optional health: `/mcp-healthz` → `/healthz`

### Apache (TLS vhost)

```bash
a2enmod proxy proxy_http headers
```

Example `/etc/apache2/conf-available/luceed-mcp-proxy.conf` (adapt path + include from the HTTPS vhost):

```apache
ProxyRequests Off
ProxyPreserveHost On
ProxyTimeout 600

<Location /mcp-YOUR_LONG_SECRET>
    ProxyPass http://127.0.0.1:8080/mcp-YOUR_LONG_SECRET
    ProxyPassReverse http://127.0.0.1:8080/mcp-YOUR_LONG_SECRET
    AuthType None
    Require all granted
    RequestHeader set X-Forwarded-Proto "https"
</Location>

<Location /.well-known/>
    ProxyPass http://127.0.0.1:8080/.well-known/
    ProxyPassReverse http://127.0.0.1:8080/.well-known/
    AuthType None
    Require all granted
    RequestHeader set X-Forwarded-Proto "https"
</Location>

<Location /authorize>
    ProxyPass http://127.0.0.1:8080/authorize
    ProxyPassReverse http://127.0.0.1:8080/authorize
    AuthType None
    Require all granted
    RequestHeader set X-Forwarded-Proto "https"
</Location>

<Location /token>
    ProxyPass http://127.0.0.1:8080/token
    ProxyPassReverse http://127.0.0.1:8080/token
    AuthType None
    Require all granted
    RequestHeader set X-Forwarded-Proto "https"
</Location>

<Location /register>
    ProxyPass http://127.0.0.1:8080/register
    ProxyPassReverse http://127.0.0.1:8080/register
    AuthType None
    Require all granted
    RequestHeader set X-Forwarded-Proto "https"
</Location>

<Location /oauth/>
    ProxyPass http://127.0.0.1:8080/oauth/
    ProxyPassReverse http://127.0.0.1:8080/oauth/
    AuthType None
    Require all granted
    RequestHeader set X-Forwarded-Proto "https"
</Location>
```

```bash
a2enconf luceed-mcp-proxy
apache2ctl configtest && systemctl reload apache2
```

### Client URL

```text
https://mcp.example.com/mcp-YOUR_LONG_SECRET
```

ChatGPT/Claude: **OAuth** + `MCP_OAUTH_PASSWORD`.  
Cursor/curl: `Authorization: Bearer <MCP_AUTH_TOKEN>`.

---

## 5. Cloudflare / CDN / bot protection (common failure)

If the hostname is behind **Cloudflare** (or similar) with a **browser / managed challenge**, ChatGPT and Claude **cannot** complete the JS challenge. You will see HTML “Just a moment…” or HTTP **403** from the edge — even when Apache/Docker are fine.

**Fix (pick one):**

1. **Cloudflare Configuration / WAF rule** — skip challenges for `/mcp-*`, `/.well-known/*`, `/authorize`, `/token`, `/register`, `/oauth/*`
2. **Separate hostname** for MCP with **DNS-only** (grey cloud) or a non-proxied name (e.g. IP-based `sslip.io` / dedicated A record) pointing at the origin TLS cert
3. Do **not** put ChatGPT behind a challenge page and expect OAuth to work

Verify **origin** works even when the edge is wrong:

```bash
curl -sk --resolve mcp.example.com:443:127.0.0.1 \
  https://mcp.example.com/mcp-YOUR_LONG_SECRET \
  -H 'content-type: application/json' \
  -H 'authorization: Bearer TOKEN' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"t","version":"0"}}}'
```

Expect HTTP **200** (or **401** without Bearer when OAuth/token required — not HTML).

---

## 6. Auto SSH tunnel to Luceed (no laptop tunnel)

Luceed is often reachable only from a **bastion** (VPN / private IP / whitelisted host). The container opens:

```text
ssh -N -L ${SSH_LOCAL_PORT}:${SSH_REMOTE_HOST}:${SSH_REMOTE_PORT} ${SSH_USER}@${SSH_HOST}
```

### Critical: do not confuse the two hosts

| Variable | Meaning |
|----------|---------|
| `SSH_HOST` | Machine the **MCP server can SSH to** (bastion). Often a **private IP** on the same VPN/network (e.g. `10.0.0.3`). **Not** a Cloudflare-proxied public hostname. |
| `SSH_REMOTE_HOST` | Luceed host **as seen from the bastion** after login (e.g. `luceedapi.example.com` or `127.0.0.1` if Luceed listens on the bastion). |

Wrong pattern (common mistake):

```env
# BAD — SSH_HOST is a CDN name; SSH_REMOTE_HOST is the bastion itself
SSH_HOST=shop.example.com
SSH_REMOTE_HOST=10.0.0.3
```

Correct pattern:

```env
SSH_ENABLED=true
SSH_HOST=10.0.0.3
SSH_USER=deploy
SSH_PRIVATE_KEY_PATH=/run/secrets/ssh_key
SSH_REMOTE_HOST=luceedapi.example.com
SSH_REMOTE_PORT=3767
SSH_LOCAL_PORT=18080
LUCEED_BASE_URL=http://127.0.0.1:18080/datasnap/rest/
```

### SSH key on the MCP host

Compose mounts `./secrets` → `/run/secrets` (read-only). Place the key at:

```text
~/Luceed-mcp/secrets/ssh_key
```

The container runs as **uid 10001** (`mcp`). The host directory must allow that user to enter and read the key:

```bash
chmod 755 ~/Luceed-mcp/secrets
chown 10001:10001 ~/Luceed-mcp/secrets/ssh_key
chmod 600 ~/Luceed-mcp/secrets/ssh_key
```

Authorize the matching `.pub` on the bastion (`deploy` user’s `authorized_keys`).

Test **from the MCP host** before enabling the container tunnel:

```bash
ssh -i ~/Luceed-mcp/secrets/ssh_key -o BatchMode=yes deploy@10.0.0.3 \
  'curl -sS -o /dev/null -w "%{http_code}\n" --max-time 8 http://luceedapi.example.com:3767/datasnap/rest/'
# expect 401 (auth required) — proves reachability
```

Then:

```bash
docker compose up -d --force-recreate
docker compose logs -f --tail=50
# look for: [ssh-tunnel] ready on 127.0.0.1:18080
```

Smoke-test tools (Bearer):

```bash
curl -sS -X POST 'http://127.0.0.1:8080/mcp-YOUR_SECRET' \
  -H 'Host: mcp.example.com' \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -H 'authorization: Bearer YOUR_TOKEN' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"luceed_ping","arguments":{}}}'
```

Expect `"ok": true` and warehouse data.

---

## 7. Troubleshooting

| Symptom | Check |
|---------|--------|
| Public URL returns Cloudflare HTML / 403 | Edge bot challenge — §5 |
| Origin `--resolve` works, public fails | CDN, not Docker |
| ChatGPT **Invalid oauth data** | Deploy image with RFC 9207 `iss`; delete/re-add connector — [CONNECT.md](CONNECT.md) |
| OAuth metadata 404 | Proxy missing `/.well-known/`, `/authorize`, `/token`, `/register`, `/oauth/` |
| MCP 401 / no tools after OAuth | Incomplete login; check Apache + `MCP_PUBLIC_URL` |
| `Invalid Host` on localhost curl | Add hostname to `MCP_ALLOWED_HOSTS` or send matching `Host` header |
| `SSH private key not found` in container | Key path + **uid 10001** perms on `secrets/` — §6 |
| SSH to public hostname times out | Use private bastion IP for `SSH_HOST`, not Cloudflare DNS |
| Tunnel up but Luceed fails | `SSH_REMOTE_HOST` must be Luceed **from bastion**, not the bastion IP |
| `healthz` OK but tools fail | Luceed creds / tunnel |
| After editing `.env` | `docker compose up -d --force-recreate` |

Local backend:

```bash
curl -sS -H 'Host: mcp.example.com' http://127.0.0.1:8080/healthz
```

---

## 8. Updates

```bash
sudo -u luceed-mcp -H bash -lc '
  cd ~/Luceed-mcp
  git pull
  docker compose pull || docker compose build
  docker compose up -d --force-recreate
'
```

If you change `MCP_HTTP_PATH`, update the Apache/nginx Location to match, then reload the proxy.

Never commit `.env` or `secrets/`.
