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
        │  HTTPS + Bearer (public URL)
        ▼
   TLS reverse proxy (Apache / nginx)
        │  /mcp-<secret> → 127.0.0.1:8080
        ▼
   Docker (user: luceed-mcp)  ← .env in ~/Luceed-mcp
        │  optional auto SSH tunnel to Luceed
        ▼
   Luceed datasnap/rest  (HTTP Basic, GET only)
```

Deploy + proxy + CDN troubleshooting: **[docs/DEPLOY.md](docs/DEPLOY.md)**  
Connect ChatGPT / Claude: **[docs/CONNECT.md](docs/CONNECT.md)**

## Docker image (GHCR)

Every push to `main` publishes:

```text
ghcr.io/splacento-incomm/luceed-mcp:latest
```

```bash
docker pull ghcr.io/splacento-incomm/luceed-mcp:latest
```

## Production deploy (ChatGPT / Claude)

1. Dedicated OS user `luceed-mcp` + Docker on **`127.0.0.1:8080`**
2. `.env` with `MCP_HTTP_PATH` (unguessable) + `MCP_AUTH_TOKEN`
3. **Apache/nginx TLS proxy** for that path (required — clients use public HTTPS)
4. If the hostname is behind Cloudflare/bot challenge, **disable challenges for the MCP path** or ChatGPT/Claude will get HTML 403s
5. Optional: `SSH_ENABLED=true` so the container keeps a Luceed tunnel up (no laptop `ssh -L`)

Full steps + troubleshooting: **[docs/DEPLOY.md](docs/DEPLOY.md)**

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
