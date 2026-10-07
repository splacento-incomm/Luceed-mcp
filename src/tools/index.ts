import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { CATALOG, catalogStats, listAllActions } from "../catalog/endpoints.js";
import { buildPath } from "../catalog/build-path.js";
import type { LuceedClient } from "../luceed/client.js";
import { joinPath, toLuceedDate } from "../luceed/client.js";
import { errorResult, getUnwrapped, textResult } from "./helpers.js";

function zodForResource(actions: { action: string; params?: { name: string; description: string; required?: boolean }[] }[]) {
  const actionEnum = actions.map((a) => a.action) as [string, ...string[]];

  // Collect union of all param names across actions (all optional at schema level;
  // requiredness enforced per-action in buildPath).
  const paramNames = new Set<string>();
  const paramDesc = new Map<string, string>();
  for (const a of actions) {
    for (const p of a.params ?? []) {
      paramNames.add(p.name);
      if (!paramDesc.has(p.name)) paramDesc.set(p.name, p.description);
    }
  }

  const shape: Record<string, z.ZodType> = {
    action: z.enum(actionEnum).describe("Which endpoint action to call"),
  };

  for (const name of paramNames) {
    shape[name] = z
      .string()
      .optional()
      .describe(paramDesc.get(name) || name);
  }

  return shape;
}

export function registerTools(server: McpServer, client: LuceedClient): void {
  // ── Discovery ───────────────────────────────────────────────────────────

  server.registerTool(
    "luceed_catalog",
    {
      description:
        "List all mapped Luceed read-only resources/actions/paths. " +
        "Filter with resource id or magento_only=true for endpoints used by Magento Debuglabs/Luceed.",
      inputSchema: {
        resource: z
          .string()
          .optional()
          .describe("Optional resource id filter e.g. nalozi_prodaje"),
        magento_only: z
          .boolean()
          .optional()
          .describe("Only endpoints used by Magento integration"),
      },
    },
    async ({ resource, magento_only }) => {
      let rows = listAllActions();
      if (resource) {
        rows = rows.filter((r) => r.resource === resource);
      }
      if (magento_only) {
        rows = rows.filter((r) => r.usedByMagento);
      }
      return textResult({
        ...catalogStats(),
        note: "Write/POST endpoints (snimi, status change, etc.) are intentionally NOT mapped — read-only MCP.",
        resources: CATALOG.map((r) => ({
          tool: `luceed_${r.id}`,
          id: r.id,
          title: r.title,
          actions: r.actions.length,
        })),
        endpoints: rows,
      });
    },
  );

  server.registerTool(
    "luceed_ping",
    {
      description:
        "Health check: verify Luceed credentials/connectivity via skladista/lista.",
      inputSchema: {},
    },
    async () => {
      try {
        const result = await getUnwrapped(client, "skladista/lista");
        const count = Array.isArray(result.data) ? result.data.length : null;
        return textResult({
          ok: true,
          warehouses: count,
          catalog: catalogStats(),
          sample: Array.isArray(result.data)
            ? result.data.slice(0, 3)
            : result.data,
        });
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  // ── Catalog-backed resource tools ───────────────────────────────────────

  for (const resource of CATALOG) {
    const actionByKey = new Map(resource.actions.map((a) => [a.action, a]));
    const inputSchema = zodForResource(resource.actions);

    server.registerTool(
      `luceed_${resource.id}`,
      {
        description: `${resource.title}: ${resource.description} Actions: ${resource.actions.map((a) => a.action).join(", ")}.`,
        inputSchema,
      },
      async (args) => {
        try {
          const actionKey = String((args as { action?: string }).action || "");
          const action = actionByKey.get(actionKey);
          if (!action) {
            throw new Error(
              `Unknown action "${actionKey}". Valid: ${[...actionByKey.keys()].join(", ")}`,
            );
          }
          const path = buildPath(action, args as Record<string, unknown>);
          return textResult(await getUnwrapped(client, path));
        } catch (err) {
          return errorResult(err);
        }
      },
    );
  }

  // ── Convenience analytics (aliases with nicer summaries) ────────────────

  server.registerTool(
    "luceed_retail_sales_summary",
    {
      description:
        "Convenience: retail sales totals by payment type for a PJ + date range " +
        "(wraps mpobracun/placanja). Prefer this for 'how much sales'.",
      inputSchema: {
        pj_uid: z.string().describe("Business unit UID e.g. 4986-1"),
        from_date: z.string().describe("Start date YYYY-MM-DD or D.M.YYYY"),
        to_date: z.string().optional().describe("End date"),
      },
    },
    async ({ pj_uid, from_date, to_date }) => {
      try {
        const path = joinPath(
          "mpobracun",
          "placanja",
          pj_uid,
          toLuceedDate(from_date),
          to_date ? toLuceedDate(to_date) : undefined,
        );
        const result = await getUnwrapped(client, path);
        const rows = Array.isArray(result.data) ? result.data : [];
        const total = rows.reduce(
          (sum: number, row: Record<string, unknown>) =>
            sum + Number(row.iznos ?? 0),
          0,
        );
        return textResult({
          pj_uid,
          from_date: toLuceedDate(from_date),
          to_date: to_date ? toLuceedDate(to_date) : null,
          total_amount: total,
          by_payment_type: rows,
        });
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    "luceed_retail_sales_by_product",
    {
      description:
        "Convenience: retail sales by product (wraps mpobracun/artikli).",
      inputSchema: {
        pj_uid: z.string(),
        from_date: z.string(),
        to_date: z.string().optional(),
      },
    },
    async ({ pj_uid, from_date, to_date }) => {
      try {
        const path = joinPath(
          "mpobracun",
          "artikli",
          pj_uid,
          toLuceedDate(from_date),
          to_date ? toLuceedDate(to_date) : undefined,
        );
        const result = await getUnwrapped(client, path);
        const rows = Array.isArray(result.data) ? result.data : [];
        return textResult({
          pj_uid,
          total_amount: rows.reduce(
            (s: number, r: Record<string, unknown>) => s + Number(r.iznos ?? 0),
            0,
          ),
          total_qty: rows.reduce(
            (s: number, r: Record<string, unknown>) =>
              s + Number(r.kolicina ?? 0),
            0,
          ),
          products: rows,
        });
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  // ── Escape hatch ────────────────────────────────────────────────────────

  server.registerTool(
    "luceed_get",
    {
      description:
        "Raw read-only GET for any relative datasnap/rest path not covered " +
        "(or for ad-hoc exploration). Mutating paths blocked when LUCEED_READ_ONLY=true. " +
        "Prefer catalog tools when possible. Example: artikli/sifra/111",
      inputSchema: {
        path: z.string().describe("Relative path under /datasnap/rest/"),
      },
    },
    async ({ path }) => {
      try {
        return textResult(await getUnwrapped(client, path));
      } catch (err) {
        return errorResult(err);
      }
    },
  );
}
