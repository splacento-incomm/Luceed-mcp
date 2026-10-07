import { spawn, type ChildProcess } from "node:child_process";
import { writeFileSync, mkdirSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createConnection } from "node:net";
import type { AppConfig } from "./config.js";

let sshProcess: ChildProcess | null = null;

function log(msg: string): void {
  // stderr so stdio MCP transport stays clean
  console.error(`[ssh-tunnel] ${msg}`);
}

async function waitForPort(port: number, host = "127.0.0.1", timeoutMs = 30_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ok = await new Promise<boolean>((resolve) => {
      const socket = createConnection({ port, host }, () => {
        socket.end();
        resolve(true);
      });
      socket.on("error", () => resolve(false));
    });
    if (ok) return;
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`SSH tunnel did not open local port ${host}:${port} within ${timeoutMs}ms`);
}

function materializeKey(config: AppConfig): string {
  if (config.ssh.privateKeyPath) {
    return config.ssh.privateKeyPath;
  }

  const dir = join(tmpdir(), "luceed-mcp-ssh");
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const keyPath = join(dir, "id_key");
  const key = (config.ssh.privateKey || "").replace(/\\n/g, "\n");
  if (!key.endsWith("\n")) {
    writeFileSync(keyPath, key + "\n", { mode: 0o600 });
  } else {
    writeFileSync(keyPath, key, { mode: 0o600 });
  }
  chmodSync(keyPath, 0o600);
  return keyPath;
}

/**
 * Open an SSH local port-forward so Luceed (IP-whitelisted) is reachable
 * via localhost:SSH_LOCAL_PORT → SSH_REMOTE_HOST:SSH_REMOTE_PORT through the bastion.
 */
export async function ensureSshTunnel(config: AppConfig): Promise<void> {
  if (!config.ssh.enabled) return;

  if (!config.ssh.host || !config.ssh.user) {
    throw new Error("SSH_ENABLED requires SSH_HOST and SSH_USER");
  }

  const keyPath = materializeKey(config);
  const forward = `${config.ssh.localPort}:${config.ssh.remoteHost}:${config.ssh.remotePort}`;

  const args = [
    "-N",
    "-L",
    forward,
    "-p",
    String(config.ssh.port),
    "-i",
    keyPath,
    "-o",
    "ExitOnForwardFailure=yes",
    "-o",
    "ServerAliveInterval=30",
    "-o",
    "ServerAliveCountMax=3",
    "-o",
    `StrictHostKeyChecking=${config.ssh.strictHostKeyChecking ? "yes" : "no"}`,
  ];

  if (config.ssh.knownHostsPath) {
    args.push("-o", `UserKnownHostsFile=${config.ssh.knownHostsPath}`);
  } else if (!config.ssh.strictHostKeyChecking) {
    args.push("-o", "UserKnownHostsFile=/dev/null");
  }

  args.push(`${config.ssh.user}@${config.ssh.host}`);

  log(`starting: ssh ${args.join(" ")}`);

  sshProcess = spawn("ssh", args, {
    stdio: ["ignore", "ignore", "pipe"],
  });

  sshProcess.stderr?.on("data", (buf: Buffer) => {
    const line = buf.toString("utf8").trim();
    if (line) log(line);
  });

  sshProcess.on("exit", (code, signal) => {
    log(`exited code=${code} signal=${signal}`);
    sshProcess = null;
  });

  await waitForPort(config.ssh.localPort);
  log(`ready on 127.0.0.1:${config.ssh.localPort}`);
}

export function stopSshTunnel(): void {
  if (sshProcess && !sshProcess.killed) {
    sshProcess.kill("SIGTERM");
    sshProcess = null;
  }
}
