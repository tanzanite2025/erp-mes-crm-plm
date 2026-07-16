# Digital Management ERP / MES / CRM / PLM

A modern industrial operations platform for ERP, MES, CRM, PLM, and production resource optimization.

## Vision

This system bridges complex industrial workflows with cloud-native architecture, providing real-time, data-driven operations for engineering, production, warehouse, trading, finance, and administrative teams.

## Key Features

- Real-time persistence with Go (Gin) + PostgreSQL.
- Modular React + Vite frontend architecture.
- Product lifecycle, engineering BOM, manufacturing BOM, and MRP-oriented workflows.
- Workflow, approval, permission, and audit infrastructure.
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

Do not start with `pnpm dev` alone unless a backend is already running. Pick one of the modes below so the frontend proxy, backend port, database, Redis, and Rust search engine all point at the same local stack.

## Local Development Modes

Use one of these two modes and avoid mixing them on the same ports.

### Mode A: Production-Consistent Local Stack

This is the closest match to the VPS deployment model.

Run the full Docker business stack:

```bash
pnpm run dev:stack:full
```

Then run the frontend against the same `localhost:8020` entrypoint used by the local load balancer:

```bash
pnpm dev
```

No root `.env.local` file is required for this mode because Vite defaults the API proxy to `http://localhost:8020`. If you do keep a root `.env.local`, set:

```bash
VITE_PROXY_TARGET=http://localhost:8020
```

Flow:

- `frontend:8010 -> nginx_lb:8020 -> app -> search-engine/db/redis`

Use this mode when you want behavior that matches production as closely as possible.

### Mode B: Host Go Hot-Debug Mode

This mode keeps Docker for core dependencies but runs the Go API on the host with non-production ports so it never collides with the production-consistent entrypoint.

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

Ports in this mode:

- Frontend dev server: `http://localhost:8010`
- Frontend proxy target: `http://localhost:8020`
- Host Go API: `http://localhost:8020`
- Host-accessible search engine: `http://localhost:8030`
- Host-accessible Postgres: `localhost:8040`
- Host-accessible Redis: `localhost:8050`

Flow:

- `frontend(vite):8010 -> host go api:8020 -> search-engine:8030/db/redis`

If your existing local `server/postgres_data` was initialized with different credentials, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\server\dev-up.ps1 -ResetDb
```

Notes:

- Do not run host Go on `8080`; use `8020` through `pnpm run dev:server:debug`.
- Use `pnpm run dev:server:debug` for host-side Go development. `pnpm run dev:server` loads the Docker-oriented `server/.env.dev` values and can collide with the local load balancer.
- `server/.env.dev` should stay production-consistent for Dockerized app routing.
- Host Go hot-debug mode overrides `PORT` and `SEARCH_ENGINE_URL` at runtime instead of editing `server/.env.dev`.
- This flow is for local dev only and should never point to production database endpoints.
- Backend env has a single source of truth: `server/.env.dev`
- Root `.env.local` is frontend-only and should keep only `VITE_*` variables.

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
It also runs server deployment self-checks to ensure deploy scripts, docker-compose volumes, and nginx uploads path are aligned.

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

The current Hostinger phase uses the repository's Git-based deployment flow. Run `deploy.sh` over SSH; use Hostinger Docker Manager for status and logs, not as a second copy of the Compose configuration. Full image-based Stack deployment is a later optimization.

After completing the Hostinger prerequisites, production environment, and certificate steps in the runbook:

```bash
cd /var/www/erp
git fetch --all
git reset --hard origin/master
chmod +x deploy.sh
./deploy.sh
```

Daily deploy:

```bash
cd /var/www/erp && ./deploy.sh
```

## License

This project is proprietary and confidential. Unauthorized copying or redistribution is prohibited.
Copyright (c) 2026.
