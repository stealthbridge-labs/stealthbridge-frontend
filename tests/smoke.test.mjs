// Local HTTP fixture for the deployed-site smoke checker.
// No external API, wallet extension, ledger writes, credentials or seeded production corridors.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";

const flags = {
  payments_enabled: false,
  confidential_token_verified: false,
  private_payments_verified: false,
  fiat_payouts_enabled: false,
};

async function simulate({ healthy, requireDatabase, stale = false }) {
  const server = createServer((request, response) => {
    const path = new URL(request.url, "http://localhost").pathname;
    const send = (status, json) => {
      response.writeHead(status, { "content-type": "application/json" });
      response.end(JSON.stringify(json));
    };
    if (["/", "/business", "/send"].includes(path)) {
      response.writeHead(200, { "content-type": "text/html" });
      response.end("<main>StealthBridge</main>");
    } else if (path === "/api/bridge/v1/network") {
      send(200, {
        network: "testnet",
        passphrase: "Test SDF Network ; September 2015",
        protocol_version: 23,
        ledger_sequence: 321,
        ledger_hash: "ab".repeat(32),
        ledger_closed_at_unix: String(Math.floor(Date.now()/1000) - (stale ? 400 : 5)),
      });
    } else if (path === "/api/bridge/v1/corridors") {
      send(healthy ? 200 : 503, healthy ? [] : { error: { code: "DATABASE_UNAVAILABLE" } });
    } else if (path === "/api/bridge/v1/capabilities") {
      send(200, flags);
    } else if (path === "/api/bridge/v1/contracts") {
      send(200, { network: "testnet", on_chain_verified: false,
        payment_execution_enabled: false,
        manifest: { status: "not-deployed", contractAddresses: {} } });
    } else if (path === "/api/bridge/ready") {
      const details = { status: healthy ? "ready" : "degraded",
        payments: "disabled", stellar_rpc: "connected",
        database: healthy ? "connected" : "not-configured" };
      send(healthy ? 200 : 503, healthy ? details : {
        error: { code: "DEPENDENCY_UNAVAILABLE" }, details,
      });
    } else if (path === "/api/bridge/v1/settlements" && request.method === "POST") {
      send(405, { error: { code: "METHOD_NOT_ALLOWED" } });
    } else {
      send(404, { error: { code: "NOT_FOUND" } });
    }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const base = "http://127.0.0.1:" + address.port;
  try {
    return await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ["scripts/smoke.mjs", base], {
        env: { ...process.env, STEALTHBRIDGE_REQUIRE_DATABASE: requireDatabase ? "1" : "0" },
      });
      let output = "";
      child.stdout.on("data", chunk => output += chunk.toString());
      child.stderr.on("data", chunk => output += chunk.toString());
      child.once("error", reject);
      child.once("exit", code => resolve({ code, output }));
    });
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

test("degraded database is classified rather than treated as malformed readiness", async () => {
  const result = await simulate({ healthy: false, requireDatabase: false });
  assert.equal(result.code, 0, result.output);
  assert.match(result.output, /NOTICE corridor catalog unavailable/);
});

test("strict live integration gate rejects disconnected PostgreSQL", async () => {
  const result = await simulate({ healthy: false, requireDatabase: true });
  assert.notEqual(result.code, 0);
  assert.match(result.output, /PostgreSQL must be reachable/);
});

test("strict live integration gate accepts a connected empty catalog", async () => {
  const result = await simulate({ healthy: true, requireDatabase: true });
  assert.equal(result.code, 0, result.output);
  assert.match(result.output, /PASS backend dependency readiness/);
});

test("stale ledgers never pass either smoke mode", async () => {
  const result = await simulate({ healthy: true, requireDatabase: true, stale: true });
  assert.notEqual(result.code, 0);
  assert.match(result.output, /stale or future-dated/);
});
