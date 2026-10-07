# Luceed MCP

Read-only [Model Context Protocol](https://modelcontextprotocol.io/) bridge to [Tomsoft Luceed](https://www.tomsoft.hr/) ERP web services (`datasnap/rest`).

Connect **Claude**, **ChatGPT**, **Cursor**, or any MCP client and ask things like *“How much retail sales did we have last week?”*

**Coverage:** 39 resources / **149 GET actions** from Luceed Web Services 2.206. Write APIs (`*/snimi`, status mutations, etc.) are intentionally excluded.

> Luceed is a product of Tomsoft d.o.o. This project is an independent open-source MCP adapter. Official API docs are available from Tomsoft to licensed customers.

## Architecture

```
Claude / ChatGPT / Cursor
        │  MCP (stdio or Streamable HTTP)
        ▼
   luceed-mcp  (Node.js)
        │  optional SSH -L tunnel (IP whitelist)
        ▼
   Luceed datasnap/rest  (HTTP Basic, GET only)
```

## Requirements

- Node.js **20+**
- Luceed API user (prefer **read-only**) + base URL
- Optional: SSH bastion if Luceed whitelists a single IP

## Quick start (local / stdio)

```bash
git clone https://github.com/splacento-incomm/Luceed-mcp.git
cd Luceed-mcp
cp .env.example .env   # set LUCEED_* credentials
npm install
npm run build
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

## Remote deploy (Docker) — Claude + ChatGPT

Use **HTTP** transport behind a reverse proxy. Put the MCP on an **unguessable path** and require `MCP_AUTH_TOKEN`.

```bash
git clone https://github.com/splacento-incomm/Luceed-mcp.git
cd Luceed-mcp
cp .env.example .env
# MCP_TRANSPORT=http
# MCP_HTTP_PATH=/mcp-<long-random-token>
# MCP_AUTH_TOKEN=<another-long-secret>
# LUCEED_* (+ SSH_* if needed)

docker compose up --build -d
curl -s http://127.0.0.1:8080/healthz
```

Point Claude / ChatGPT custom MCP connectors at:

`https://your-domain.example/mcp-<long-random-token>`

with header `Authorization: Bearer <MCP_AUTH_TOKEN>`.

Full server notes: [docs/SETUP.md](docs/SETUP.md).

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

Example — `luceed_nalozi_prodaje`:

```json
{
  "action": "statusi",
  "statusi": "01,02",
  "od_datuma": "2024-01-01",
  "do_datuma": "2024-01-31"
}
```

→ `NaloziProdaje/statusi/[01,02]/1.1.2024/31.1.2024`

## Config

| Variable | Required | Notes |
|----------|----------|--------|
| `LUCEED_BASE_URL` | yes | Must include `/datasnap/rest/` |
| `LUCEED_USERNAME` / `LUCEED_PASSWORD` | yes | HTTP Basic |
| `MCP_TRANSPORT` | | `stdio` (default) or `http` |
| `MCP_AUTH_TOKEN` | for HTTP | Bearer / `X-API-Key` |
| `MCP_HTTP_PATH` | | e.g. `/mcp-a8f3…` unguessable path |
| `SSH_ENABLED` | | Open local forward for IP-whitelisted Luceed |

See [.env.example](.env.example) and [docs/SETUP.md](docs/SETUP.md).

## Why Node (not PHP)?

Luceed itself is HTTP Basic REST — language-agnostic. MCP’s official SDK and Streamable HTTP transport (what Claude/ChatGPT remote connectors expect) are mature in **TypeScript/Node**. A PHP app on the same host (e.g. Sendy) can coexist; run this MCP as a **Docker** service and reverse-proxy an unguessable URL to it.

## License

[MIT](LICENSE)

Luceed® / Tomsoft® names are trademarks of their respective owners. Official web-service documentation remains Tomsoft’s intellectual property and is **not** redistributed in this repository.
