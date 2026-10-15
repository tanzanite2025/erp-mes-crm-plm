# Security Postman Collections

This folder stores Postman collections for security regression checks.

## Collections

| File | Purpose |
| --- | --- |
| `p0-1-ai-proxy-security.postman_collection.json` | P0-1 AI proxy security tests covering whitelist, HTTPS-only, loopback/private-network rejection, metadata IP rejection, malformed host cases, method validation, oversized body handling, header injection, streaming, and missing JWT behavior. |

## Usage

1. Import the collection into Postman.
2. Set collection variables before running:
   - `baseUrl`: backend base URL, defaulting to `http://127.0.0.1:18020` for local DEV. If `DEV_BACKEND_PORT` is overridden in `server/.env.dev` or the shell, use the API URL printed by the DEV launcher.
   - `jwt`: a valid test JWT for authenticated requests.
   - `vendorAuth`: vendor API authorization header used by positive proxy cases.
   - `geminiKey`: Gemini API key used by the Gemini positive case, if applicable.
   - `veryLargeText`: payload text used by the oversized body test.
3. Run the collection against a non-production environment first.

See [DEV service ports and login](../../../README.md#dev-service-ports) for the current local service addresses and browser credential behavior after port changes.

## Safety Notes

- Do not commit real JWTs, vendor API keys, or environment exports.
- Keep secrets in a local Postman environment, not in the collection JSON.
- Treat failed rejection cases as security regressions until verified otherwise.
