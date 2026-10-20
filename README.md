# Digital Management ERP / MES / CRM / PLM

A modern industrial operations platform for ERP, MES, CRM, PLM, and production resource optimization.

## Vision

This system bridges complex industrial workflows with cloud-native architecture, providing real-time, data-driven operations for engineering, production, warehouse, trading, finance, and administrative teams.

## Key Features

- Real-time persistence with Go (Gin) + PostgreSQL.
- Modular React + Vite frontend architecture.
- Product lifecycle, engineering BOM, manufacturing BOM, and MRP-oriented workflows.
- Backend domain transactions, approval requests, permissions, audit, and a durable account notification inbox.
- Full lifecycle tracking for molds and equipment.
- JWT-based auth and enterprise security controls.
- Atomic warehouse/inventory transaction flows.
- Organization and personnel management hub.

## Tech Stack

- Frontend: React 19, Vite, TanStack Router/Table, Shadcn UI, TailwindCSS.
- Backend: Go (Gin), GORM.
- Database: PostgreSQL (Dockerized).
- API: RESTful endpoints consumed via `apiFetch`.
- Package manager: pnpm 10.33.0 via Corepack.

## Repository Structure

```text
src/routes/          TanStack Router route entries; keep them thin and delegate page logic to features.
src/features/        Frontend business modules, normally split into components, hooks, services, data, and tabs.
src/components/      Cross-feature UI primitives and shared shells.
src/lib/             Cross-cutting frontend infrastructure: API client, logging, delta tracking, schema helpers.
src/locales/         Locale message catalogs and override rules.
server/routes/       Gin route registration.
server/handlers/     HTTP handlers, request/response DTO mapping, and validation boundaries.
server/services/     Backend business rules, transactions, integrations, and workflow orchestration.
server/models/       GORM persistence models.
server/modules/      Newer backend domain modules that bundle focused handlers/services/repositories.
docs/architecture/   Architecture decisions and current-state topology maps.
docs/analysis/       Durable audits, retrospectives, and migration analysis.
docs/frontend/       Frontend-specific implementation guidance.
docs/ops/            Deployment, monitoring, and operations checklists.
cutting-engine/      Rust/WASM cutting optimization engine.
```

For the current file responsibility and layering assessment, see `docs/architecture/project-structure-review.md`.

## Documentation Hygiene

- Keep durable source-of-truth docs under `README.md`, `GEMINI.md`, `DELTA_SYSTEM.md`, `docs/architecture/`, `docs/analysis/`, `docs/frontend/`, `docs/ops/`, or feature-local `README.md` files.
- Do not commit one-off repair notes, local cleanup scripts, generated completion reports, date-stamped local checklists, or docs that reference another upstream template project.
- When a checklist becomes permanent practice, move the durable rule into the nearest source-of-truth doc and delete the historical checklist.
- Prefer linking from this README to canonical docs instead of duplicating long instructions in multiple places.

Canonical development, messaging, and approval references:

- [Development boundaries](GEMINI.md) and [SDRTS implementation contract](DELTA_SYSTEM.md): frontend/backend responsibilities, version checks, and the boundary between editing deltas and semantic business transactions.

- [System notification inbox, cross-device synchronization, and delivery contract](docs/architecture/workflow/system-notification-inbox-cross-device-synchronization-and-delivery-contract.md): implemented account inbox, synchronized read/archive/resolution states, shared delivery queue, retention, cutover, and actual source coverage limits.
- [Quality standard approval transaction and notification delivery contract](docs/quality-standard-approval-transaction-and-notification-delivery-contract.md): quality approval transactions and their integration with the shared inbox and delivery queue. Production deployment requires separate verification.
- [Logistics record transaction and notification delivery contract](docs/logistics-record-transaction-and-notification-delivery-contract.md): actual logistics states, versioned writes, sales/purchase visibility, record links, and shared inbox integration.

## Type Safety and Validation

- Avoid explicit `any`; use `unknown` at trust boundaries and narrow before reading values.
- Keep Zod schemas and TypeScript domain types aligned, especially when using React Hook Form transformed output types.
- Versioned entities should carry `version` through form defaults, SDRTS deltas, and backend patch payloads.
- Frontend API calls belong in feature services; backend DTO validation and transaction rules belong in handlers/services/modules.

## Local Development

```bash
corepack enable
corepack prepare pnpm@10.33.0 --activate
pnpm install
```

`pnpm install` runs `scripts/setup-git-hooks.mjs`, which configures `.githooks` as the repository hook path.

Run `pnpm dev` to start Docker dependencies, generate route contracts, and launch the host Go API and Vite together. The launcher reads `server/.env.dev`, creating it from `server/.env.dev.example` when missing.

## Local Development Modes

Use one of these two modes and avoid mixing them on the same ports.

### Mode A: Production-Consistent Local Stack

This is the closest match to the VPS deployment model.

Run the full Docker business stack:

```bash
pnpm run dev:stack:full
```

Then run only the frontend against the local load balancer:

```bash
pnpm run dev:frontend
```

No root `.env.local` file is required. The launcher derives the frontend proxy from `DEV_BACKEND_PORT` in `server/.env.dev`.

Flow:

- `frontend:18010 -> nginx_lb:18020 -> app -> search-engine/db/redis`

Use this mode when you want behavior that matches production as closely as possible.

### Mode B: Host Go Hot-Debug Mode

This mode keeps Docker for core dependencies and runs the Go API on the host. It shares the local API port with Mode A, so stop the Docker load balancer before switching to this mode.

Start everything with `pnpm dev`, or use the separate entrypoints below in separate terminals.

Core services:

```powershell
powershell -ExecutionPolicy Bypass -File .\server\dev-up.ps1
```

Or via package script:

```bash
pnpm run dev:stack
```

Then start the host-side debug processes:

```bash
pnpm run dev:server:debug
pnpm run dev:frontend:debug
```

### DEV Service Ports

The local defaults use the 18xxx range because Windows may reserve the previous 8xxx range. Use the launcher's printed URLs when diagnosing DEV; old 8xxx addresses in earlier logs are obsolete.

| Service                          | Default Local Address    | Configuration in `server/.env.dev` |
| -------------------------------- | ------------------------ | ---------------------------------- |
| Frontend                         | `http://127.0.0.1:18010` | `DEV_FRONTEND_PORT`                |
| Host API or Docker load balancer | `http://127.0.0.1:18020` | `DEV_BACKEND_PORT`                 |
| Search engine                    | `http://127.0.0.1:18030` | `DEV_SEARCH_PORT`                  |
| Postgres                         | `127.0.0.1:18040`        | `DEV_POSTGRES_PORT`                |
| Redis                            | `127.0.0.1:18050`        | `DEV_REDIS_PORT`                   |

Flow:

- `frontend(vite):18010 -> host go api:18020 -> search-engine:18030/db/redis`

Override any `DEV_*_PORT` value in `server/.env.dev` or the current shell; shell overrides take precedence. To print the resolved port configuration without starting services, run `node scripts/local-development-environment-and-service-port-configuration.mjs --print-ports`.

The same values drive Docker host bindings, host API connections, frontend proxy, and CORS. Docker internal service ports stay unchanged. If Windows reserves a port range, check `netsh interface ipv4 show excludedportrange protocol=tcp` and choose ports outside it. An occupied frontend/API port produces an error without stopping its owner.

Check API health directly at `http://127.0.0.1:18020/api/v1/health` and through Vite at `http://127.0.0.1:18010/api/v1/health`. Both should report `status: up` with connected database and Redis. Backend compilation and schema migration finish before the API starts listening; Vite being ready alone does not mean the backend is ready.

Swagger UI is available at `http://127.0.0.1:18020/swagger/index.html` in DEV. Its API requests follow the address serving the documentation instead of a fixed host or port. Postman's collection `baseUrl` defaults to the local API address; update it when overriding `DEV_BACKEND_PORT`.

### DEV Login and Browser Credentials

The default local account is `admin`, with the development template password `xdfc_local_admin_password`. The password comes from `INITIAL_ADMIN_PASSWORD` in `server/.env.dev` when the admin account is first created. Changing that environment variable does not reset an existing account's password.

Use `http://127.0.0.1:18010` consistently. Changing the port or switching between `localhost` and `127.0.0.1` changes the browser origin: login sessions are separate, and the password manager may not offer the credentials saved for the previous address. Sign in at the new address and let the browser save the credentials there. Port changes do not delete ERP accounts or change their passwords.

These template credentials are for local development only. Keep local overrides in the ignored `server/.env.dev` file.

If the existing database uses different credentials, correct `server/.env.dev` to match it. `dev:stack:reset-db` deletes the local database and is only for intentionally discarding all local data.

Notes:

- `dev:server` and `dev:server:debug` use the same configured host environment; `dev:frontend` and `dev:frontend:debug` do likewise.
- `server/.env.dev` should stay production-consistent for Dockerized app routing.
- Host Go mode derives `PORT`, `DATABASE_URL`, `REDIS_URL`, `SEARCH_ENGINE_URL`, and `ALLOWED_ORIGIN` at runtime, preserving credentials and URL options.
- Go build cache cleanup is opt-in: `pnpm dev --clean-go-cache`.
- This flow is for local dev only and should never point to production database endpoints.
- Backend env has a single source of truth: `server/.env.dev`
- Root `.env.local` is frontend-only and should keep only `VITE_*` variables.
- For raw Vite/Postman use, update their proxy or base URL when overriding `DEV_BACKEND_PORT`. The package-script frontend entrypoints derive their proxy automatically.

## Quality Gates

Run the smallest relevant set while iterating, then run the broader checks before opening a PR:

```bash
pnpm exec tsc -b
pnpm run lint
pnpm run build
```

Targeted guards:

```bash
pnpm run verify:i18n
pnpm run verify:zh-cn-encoding
pnpm run verify:permissions
pnpm run verify:frontend-logging
```

## Pre-Deploy Check (Important)

Before pushing production changes, run:

```bash
pnpm run predeploy:check
```

This checks whether `package.json` and `pnpm-lock.yaml` are in sync and prevents the common deploy failure with `--frozen-lockfile`.
It also verifies that the image-based ERP stack, shared edge network, gateway, and container ingress remain aligned and that production services do not publish database or API ports.

If it fails:

```bash
pnpm install
git add package.json pnpm-lock.yaml
git commit -m "chore: sync pnpm lockfile"
```

## Production Deployment

Hostinger VPS deployment and Docker runbook: `docs/ops/hostinger-vps-docker-runbook.md`
Single-VPS deployment roadmap: `docs/ops/single-vps-deployment-roadmap.md`
Monitoring/alerting deploy checklist: `docs/ops/monitoring-deploy-checklist.md`

Production uses two independent Docker Compose projects:

- `deployment/gateway/compose.yml`: the shared Caddy gateway and the `tanzanite-edge` network; this is the only stack that publishes `80/443`.
- `compose.prod.yml`: the ERP application, data services, and the single `erp-web` edge endpoint; it publishes no host ports.

GitHub Actions publishes immutable `sha-*` images to GHCR. Hostinger Docker Manager is the source of truth for production Compose content, release tags, and environment variables. Do not paste `server/docker-compose.yml` into Hostinger because that file is for local development.

Daily releases should update `IMAGE_TAG` to a tested `sha-*` tag and reconcile the ERP project from Hostinger Docker Manager. The current production release path does not build source code on the VPS, does not use host Nginx, and does not rely on a server-side source checkout.

If SSH is needed for diagnostics, follow the Docker Manager / GHCR path in `docs/ops/hostinger-vps-docker-runbook.md`; do not use old server-side release snippets as a release procedure.

## License

This project is proprietary and confidential. Unauthorized copying or redistribution is prohibited.
Copyright (c) 2026.
