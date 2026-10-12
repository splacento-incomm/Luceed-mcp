# Production deploy

Goal: **Claude / ChatGPT** reach the MCP over **public HTTPS**. Docker stays on localhost; a reverse proxy exposes only an **unguessable path**.

```
ChatGPT / Claude
      │  HTTPS + Bearer token
      ▼
TLS reverse proxy (Apache / nginx / Caddy)
      │  ProxyPass /mcp-<secret> → 127.0.0.1:8080
      ▼
Docker (OS user luceed-mcp)  ← .env in ~/Luceed-mcp
      │  optional auto SSH tunnel (SSH_ENABLED)
      ▼
Luceed datasnap/rest
```

Do **not** rely on a laptop SSH tunnel for clients. The MCP server must be reachable on the public internet (via the proxy).

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
  mkdir -p secrets && chmod 700 secrets
  cp .env.example .env && chmod 600 .env
'
```

Edit `.env`:

| Variable | Purpose |
|----------|---------|
| `LUCEED_BASE_URL` / `USERNAME` / `PASSWORD` | Luceed API |
| `MCP_HTTP_PATH` | Unguessable path, e.g. `/mcp-<64 hex chars>` |
| `MCP_AUTH_TOKEN` | Bearer / `X-Api-Key` secret (Claude, curl, Cursor; ChatGPT UI has no Bearer field — see [CONNECT.md](CONNECT.md)) |
| `MCP_ALLOWED_HOSTS` | Your public hostname(s), comma-separated |
| `SSH_*` | Auto tunnel if Luceed is IP-whitelisted (see below) |

## 3. Docker Compose

```bash
sudo -u luceed-mcp -H bash -lc '
  cd ~/Luceed-mcp
  docker compose pull || docker compose build
  docker compose up -d
  curl -s http://127.0.0.1:8080/healthz
'
```

Compose binds **`127.0.0.1:8080` only**. Image: `ghcr.io/splacento-incomm/luceed-mcp:latest`.

## 4. Reverse proxy (required for ChatGPT / Claude)

### Apache (TLS vhost)

```bash
a2enmod proxy proxy_http headers
```

Create `/etc/apache2/conf-available/luceed-mcp-proxy.conf` (path must match `.env`):

```apache
ProxyRequests Off
ProxyPreserveHost On
ProxyTimeout 600

<Location /mcp-YOUR_LONG_SECRET>
    ProxyPass http://127.0.0.1:8080/mcp-YOUR_LONG_SECRET
    ProxyPassReverse http://127.0.0.1:8080/mcp-YOUR_LONG_SECRET

    # If the vhost has site-wide Basic Auth, bypass it here
    AuthType None
    Require all granted

    RequestHeader set X-Forwarded-Proto "https"
</Location>
```

`Include` that file inside your **HTTPS** `<VirtualHost *:443>`, then:

```bash
apache2ctl configtest && systemctl reload apache2
```

### nginx (alternative)

```nginx
location /mcp-YOUR_LONG_SECRET {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header Authorization $http_authorization;
    proxy_read_timeout 600s;
    proxy_buffering off;
}
```

### Client URL

```text
https://mcp.example.com/mcp-YOUR_LONG_SECRET
Authorization: Bearer <MCP_AUTH_TOKEN>
```

---

## 5. Cloudflare / CDN / bot protection (common failure)

If the hostname is behind **Cloudflare** (or similar) with a **browser / managed challenge**, ChatGPT and Claude **cannot** complete the JS challenge. You will see HTML “Just a moment…” or HTTP **403** from the edge — even when Apache/Docker are fine.

**Fix (pick one):**

1. **Cloudflare Configuration Rule** (recommended)  
   - If URI Path starts with `/mcp-` (or equals your exact `MCP_HTTP_PATH`)  
   - Then: Security Level = Essentially Off, and skip Bot Fight / Browser Integrity / Managed Challenge for that path  
2. **WAF custom rule**: skip challenges for that path (optionally require a known header)  
3. **Separate hostname** for MCP with DNS-only (grey cloud), proxied only at your origin TLS

Verify **origin** works even when the edge is wrong:

```bash
# On the MCP host — hits Apache directly, not Cloudflare
curl -sk --resolve mcp.example.com:443:127.0.0.1 \
  https://mcp.example.com/mcp-YOUR_LONG_SECRET \
  -H 'content-type: application/json' \
  -H 'authorization: Bearer TOKEN' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"t","version":"0"}}}'
```

Expect HTTP **200** and a JSON-RPC `initialize` result.  
From the public internet after CF is fixed: same URL without `--resolve`.

---

## 6. Auto SSH tunnel to Luceed (no laptop tunnel)

If Luceed only allows one IP (e.g. a bastion), set in `.env`:

```env
SSH_ENABLED=true
SSH_HOST=bastion.example.com
SSH_USER=deploy
SSH_PRIVATE_KEY_PATH=/run/secrets/ssh_key
SSH_REMOTE_HOST=10.0.0.3
SSH_REMOTE_PORT=3767
SSH_LOCAL_PORT=18080
LUCEED_BASE_URL=http://127.0.0.1:18080/datasnap/rest/
```

Place the private key at `~/Luceed-mcp/secrets/ssh_key` (`chmod 600`), authorize the `.pub` on the bastion, then:

```bash
docker compose up -d --force-recreate
docker compose logs -f --tail=50
# look for: [ssh-tunnel] ready on 127.0.0.1:18080
```

The container keeps the tunnel up; operators do not run `ssh -N -L` by hand.

---

## 7. Troubleshooting

| Symptom | Check |
|---------|--------|
| Public URL returns Cloudflare HTML / 403 | Edge bot challenge — §5 above |
| Origin `--resolve` works, public fails | Same — CDN, not Docker |
| Origin returns 401 without Bearer | Expected — set `MCP_AUTH_TOKEN` in the client |
| Origin 404 | `MCP_HTTP_PATH` ≠ Apache `Location` / nginx `location` |
| Site Basic Auth login form on MCP path | Add `AuthType None` + `Require all granted` on that Location |
| `healthz` OK but tools fail | Luceed creds / `SSH_ENABLED` tunnel |
| Container restart loop + SSH key error | Key missing, or `SSH_ENABLED=true` without `secrets/ssh_key` |
| After editing `.env` | `docker compose up -d --force-recreate` |

Local backend only:

```bash
curl -s http://127.0.0.1:8080/healthz
```

---

## 8. Updates

```bash
sudo -u luceed-mcp -H bash -lc '
  cd ~/Luceed-mcp
  git pull
  docker compose pull || docker compose build
  docker compose up -d
'
```

If you change `MCP_HTTP_PATH`, update the Apache/nginx Location to match, then reload the proxy.

Never commit `.env` or `secrets/`.
