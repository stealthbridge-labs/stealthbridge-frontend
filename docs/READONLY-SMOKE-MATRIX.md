# Read-only staging acceptance matrix

This is an engineering acceptance checklist, not evidence that a deployment passed.

| Probe | Expected outcome | Failure classification |
| --- | --- | --- |
| GET / | 200 and StealthBridge identity | frontend deployment |
| GET /api/bridge/v1/network | 200, Testnet passphrase, recent ledger | RPC unavailable or proxy blocked |
| GET /api/bridge/v1/capabilities | 200, payments disabled | capability drift |
| GET /api/bridge/v1/contracts | 200, not-deployed and unverified | manifest drift |
| GET /api/bridge/v1/corridors | 200 array or explicit 503 | database unavailable |
| GET /api/bridge/ready | 200 or degraded 503, payments disabled | dependency degraded |
| POST /api/bridge/v1/network | 405 | write boundary regression |

Run `npm run smoke -- https://staging.example` only against an authorized staging URL. Do not put bypass tokens or credentials in logs or issue comments. Do not infer successful payments from a READY deployment, ABI equality, or a recent Testnet ledger.

Issue references: #12, #13.
