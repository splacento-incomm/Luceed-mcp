import type { LuceedClient } from "../luceed/client.js";

export function textResult(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text:
          typeof data === "string"
            ? data
            : JSON.stringify(data, null, 2),
      },
    ],
  };
}

export function errorResult(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return {
    content: [{ type: "text" as const, text: `Error: ${message}` }],
    isError: true as const,
  };
}

export async function getUnwrapped(client: LuceedClient, path: string) {
  const raw = await client.get(path);
  return {
    path,
    data: client.unwrap(raw),
    raw,
  };
}
