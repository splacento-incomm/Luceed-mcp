# Production deploy (dedicated OS user + Docker)

Recommended layout: a non-root system user owns the checkout and `.env`; Docker binds **localhost only**; Apache/nginx terminates TLS and proxies an unguessable path.

## 1. Create the OS user (as root)

```bash
adduser --disabled-password --gecos "Luceed MCP" luceed-mcp
# optional: usermod -aG docker luceed-mcp   # after Docker is installed
mkdir -p /home/luceed-mcp/Luceed-mcp/secrets
chown -R luceed-mcp:luceed-mcp /home/luceed-mcp
```

Install Docker Engine + Compose plugin (Ubuntu): see [Docker docs](https://docs.docker.com/engine/install/ubuntu/), then:

```bash
usermod -aG docker luceed-mcp
```

Log out/in (or `newgrp docker`) so group membership applies.

## 2. Checkout + `.env` in the user home

```bash
sudo -u luceed-mcp -H bash -lc '
  cd ~
  git clone https://github.com/splacento-incomm/Luceed-mcp.git
  cd Luceed-mcp
  mkdir -p secrets
  chmod 700 secrets
  cp .env.example .env
  chmod 600 .env
'
```

Edit `/home/luceed-mcp/Luceed-mcp/.env`:

- `LUCEED_BASE_URL`, `LUCEED_USERNAME`, `LUCEED_PASSWORD`
- `MCP_HTTP_PATH=/mcp-<long-random>`
- `MCP_AUTH_TOKEN=<long-random>`
- `SSH_*` if you need a tunnel (place key at `secrets/ssh_key`, mode `600`)

## 3. Run with Docker Compose

Pull the published image (GHCR) or build locally:

```bash
sudo -u luceed-mcp -H bash -lc '
  cd ~/Luceed-mcp
  # Published image (after CI has pushed):
  docker compose pull
  # Or build on the host:
  # docker compose build
  docker compose up -d
  curl -s http://127.0.0.1:8080/healthz
'
```

Image: `ghcr.io/splacento-incomm/luceed-mcp:latest`  
(Published on every push to `main` via GitHub Actions → GHCR.)

Compose binds `127.0.0.1:8080` only — not the public internet.

## 4. Reverse proxy (Apache example)

On the TLS vhost (e.g. `sendy.parilica.hr`), proxy only the secret path:

```apache
ProxyPreserveHost On
ProxyPass        /mcp-YOUR_SECRET_PATH http://127.0.0.1:8080/mcp-YOUR_SECRET_PATH
ProxyPassReverse /mcp-YOUR_SECRET_PATH http://127.0.0.1:8080/mcp-YOUR_SECRET_PATH
```

Enable modules: `a2enmod proxy proxy_http headers` then reload Apache.

Claude / ChatGPT URL:

`https://your-host/mcp-YOUR_SECRET_PATH`  
Header: `Authorization: Bearer <MCP_AUTH_TOKEN>`

## 5. Updates

```bash
sudo -u luceed-mcp -H bash -lc '
  cd ~/Luceed-mcp
  git pull
  docker compose pull   # or: docker compose build
  docker compose up -d
'
```

Never commit `.env` or `secrets/`.
