import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Request, Response, NextFunction } from "express";
import type { AppConfig } from "./config.js";
import { createServer } from "./server.js";

function authMiddleware(token: string | null) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!token) {
      next();
      return;
    }
    const header = req.header("authorization") || "";
    const bearer = header.match(/^Bearer\s+(.+)$/i)?.[1];
    const alt = req.header("x-api-key");
    if (bearer === token || alt === token) {
      next();
      return;
    }
    res.status(401).json({
      jsonrpc: "2.0",
      error: { code: -32001, message: "Unauthorized" },
      id: null,
    });
  };
}

export async function startHttpServer(config: AppConfig): Promise<void> {
  const app = createMcpExpressApp({
    host: config.http.host,
    allowedHosts: config.http.allowedHosts,
  });

  app.get("/healthz", (_req, res) => {
    res.json({ ok: true, service: "luceed-mcp" });
  });

  const mcpPath = config.http.path.startsWith("/")
    ? config.http.path
    : `/${config.http.path}`;

  app.use(mcpPath, authMiddleware(config.http.authToken));

  app.post(mcpPath, async (req, res) => {
    const server = createServer(config);
    try {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      res.on("close", () => {
        void transport.close();
        void server.close();
      });
    } catch (error) {
      console.error("MCP HTTP error:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  });

  app.get(mcpPath, (_req, res) => {
    res.writeHead(405).end(
      JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Method not allowed." },
        id: null,
      }),
    );
  });

  app.delete(mcpPath, (_req, res) => {
    res.writeHead(405).end(
      JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Method not allowed." },
        id: null,
      }),
    );
  });

  await new Promise<void>((resolve) => {
    app.listen(config.http.port, config.http.host, () => {
      console.error(
        `luceed-mcp HTTP listening on http://${config.http.host}:${config.http.port}${mcpPath}`,
      );
      if (config.http.authToken) {
        console.error("MCP auth: Bearer / X-API-Key required");
      } else {
        console.error("WARNING: MCP_AUTH_TOKEN is not set — endpoint is open");
      }
      resolve();
    });
  });
}
