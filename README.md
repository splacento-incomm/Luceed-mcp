# Luceed MCP

Read-only [Model Context Protocol](https://modelcontextprotocol.io/) bridge to [Tomsoft Luceed](https://www.tomsoft.hr/) ERP web services (`datasnap/rest`).

Connect **Claude**, **ChatGPT**, **Cursor**, or any MCP client and ask things like *“How much retail sales did we have last week?”*

**Coverage:** 39 resources / **149 GET actions** from Luceed Web Services 2.206. Write APIs (`*/snimi`, status mutations, etc.) are intentionally excluded.

## Built by Debug Labs

Maintained by **[Debug Labs d.o.o.](https://debug-labs.hr)** — a Croatia-based software company specializing in **Luceed ERP integrations**, Magento / e‑commerce sync, and custom B2B automation around Tomsoft Luceed.

If you need help wiring Luceed to your webshop, marketplace, BI tools, or AI assistants (this MCP included), get in touch:

- Website: [https://debug-labs.hr](https://debug-labs.hr)
- GitHub: [splacento-incomm/Luceed-mcp](https://github.com/splacento-incomm/Luceed-mcp)
- Container: [`ghcr.io/splacento-incomm/luceed-mcp`](https://github.com/splacento-incomm/Luceed-mcp/pkgs/container/luceed-mcp)

> This open-source MCP adapter is independent of Tomsoft. Luceed® is a product of Tomsoft d.o.o.

## Official Luceed API docs

Luceed exposes a RESTful JSON API with **HTTP Basic** authentication. Access is granted per customer — contact the Luceed instance owner for credentials and allowed methods.

- Documentation hub: **[Luceed API | Tomsoft Docs](https://docs.tomsoft.hr/luceedapi/luceed-api)**
- Spec PDFs (HR / EN, v2.206) are linked from that page

This MCP maps the documented GET surface into discoverable tools (`luceed_catalog`). Official field-level docs stay with Tomsoft and are not redistributed here.

## Architecture

```
Claude / ChatGPT / Cursor
        │  MCP (Streamable HTTP or stdio)
        ▼
   Docker (user: luceed-mcp)  ← .env in ~/Luceed-mcp
        │  127.0.0.1:8080 + optional SSH tunnel
        ▼
   Luceed datasnap/rest  (HTTP Basic, GET only)
```

## Docker image (GHCR)

Every push to `main` publishes:

```text
ghcr.io/splacento-incomm/luceed-mcp:latest
```

```bash
docker pull ghcr.io/splacento-incomm/luceed-mcp:latest
```

## Production deploy (dedicated user)

**Do not run as root.** Use a dedicated OS user with a home directory; keep `.env` only there; bind Docker to localhost; reverse-proxy an unguessable path over TLS.

Full steps: **[docs/DEPLOY.md](docs/DEPLOY.md)**

Short version (as root once):

```bash
adduser --disabled-password --gecos "Luceed MCP" luceed-mcp
# install Docker, then:
usermod -aG docker luceed-mcp

sudo -u luceed-mcp -H bash -lc '
  cd ~ && git clone https://github.com/splacento-incomm/Luceed-mcp.git
  cd Luceed-mcp && mkdir -p secrets && chmod 700 secrets
  cp .env.example .env && chmod 600 .env
  # edit .env — LUCEED_*, MCP_HTTP_PATH, MCP_AUTH_TOKEN
  docker compose pull || docker compose build
  docker compose up -d
'
```

Compose reads `/home/luceed-mcp/Luceed-mcp/.env` and listens on **`127.0.0.1:8080` only**.

Point Claude / ChatGPT at:

`https://your-domain/mcp-<secret-from-env>`  
`Authorization: Bearer <MCP_AUTH_TOKEN>`

## Quick start (local / stdio)

```bash
git clone https://github.com/splacento-incomm/Luceed-mcp.git
cd Luceed-mcp
cp .env.example .env   # set LUCEED_* credentials
npm install && npm run build
npm run start:stdio
```

### Cursor / Claude Desktop

```json
{
  "mcpServers": {
    "luceed": {
      "command": "node",
      "args": ["/absolute/path/to/Luceed-mcp/dist/index.js"],
      "env": {
        "MCP_TRANSPORT": "stdio",
        "LUCEED_BASE_URL": "http://127.0.0.1:18080/datasnap/rest/",
        "LUCEED_USERNAME": "readonly_user",
        "LUCEED_PASSWORD": "secret"
      }
    }
  }
}
```

## Tools

| Tool | Role |
|------|------|
| `luceed_catalog` | List all resources/actions/paths |
| `luceed_ping` | Auth / connectivity check |
| `luceed_<resource>` | One tool per resource; pass `action` + params |
| `luceed_retail_sales_summary` | Sales totals by payment type |
| `luceed_retail_sales_by_product` | Sales by product |
| `luceed_get` | Raw relative GET escape hatch |

Ask the model to call `luceed_catalog` first.

### Resources

`artikli`, `artikli_popusti`, `bundle`, `skladista`, `stanje_zalihe`, `stanje_zalihe_dobavljaci`, `stanje_zalihe_serijski`, `cijene`, `cjenik`, `cjenik_partner`, `akcije`, `prodajne_akcije`, `prodajni_uvjeti`, `partneri`, `users`, `mjesta`, `vrste_placanja`, `grupe_artikala`, `robne_marke`, `sifrarnici`, `statusi`, `prijevodi`, `varijante`, `bodovi`, `tecajna_lista`, `crm_razlozi`, `predmeti`, `mpracuni`, `mpobracun`, `nalozi_prodaje`, `vpracuni`, `racuni_predujma`, `narudzbe`, `nalozi_povrata`, `nalozi_proizvodnje`, `radni_nalozi`, `skladisni_dokumenti`, `hotel`, `poklon_bonovi`

## Config

| Variable | Required | Notes |
|----------|----------|--------|
| `LUCEED_BASE_URL` | yes | Must include `/datasnap/rest/` |
| `LUCEED_USERNAME` / `LUCEED_PASSWORD` | yes | HTTP Basic |
| `MCP_TRANSPORT` | | `stdio` or `http` |
| `MCP_AUTH_TOKEN` | for HTTP | Bearer / `X-API-Key` |
| `MCP_HTTP_PATH` | | Unguessable path e.g. `/mcp-a8f3…` |
| `LUCEED_MCP_IMAGE` | | Override GHCR image tag |
| `SSH_ENABLED` | | Local forward for IP-whitelisted Luceed |

See [.env.example](.env.example), [docs/SETUP.md](docs/SETUP.md), [docs/DEPLOY.md](docs/DEPLOY.md).

## Need a Luceed integration?

Debug Labs builds production Luceed connectors for e‑commerce, logistics, and reporting — Magento product/stock/order sync, B2B portals, and AI tooling like this MCP.

**[debug-labs.hr](https://debug-labs.hr)** · open an issue on this repo for MCP-specific questions.

## License

[MIT](LICENSE) — © Debug Labs d.o.o. / contributors

Luceed® / Tomsoft® names are trademarks of their respective owners. Official web-service documentation remains Tomsoft’s intellectual property and is **not** redistributed in this repository. See [docs.tomsoft.hr/luceedapi](https://docs.tomsoft.hr/luceedapi/luceed-api).
