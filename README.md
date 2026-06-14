# Digital Management ERP

A modern ERP system for digital governance and industrial resource optimization.

## Vision

This system bridges complex industrial workflows with cloud-native architecture, providing real-time, data-driven operations for enterprise teams.

## Key Features

- Real-time persistence with Go (Gin) + PostgreSQL.
- Modular React + Vite frontend architecture.
- Full lifecycle tracking for molds and equipment.
- JWT-based auth and enterprise security controls.
- Atomic warehouse/inventory transaction flows.
- Organization and personnel management hub.

## Tech Stack

- Frontend: React 19, Vite, TanStack Router/Table, Shadcn UI, TailwindCSS.
- Backend: Go (Gin), GORM.
- Database: PostgreSQL (Dockerized).
- API: RESTful endpoints consumed via `apiFetch`.

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
docs/ops/            Deployment, monitoring, and operations checklists.
```

For the current file responsibility and layering assessment, see `docs/architecture/project-structure-review.md`.

## Documentation Hygiene

- Keep durable source-of-truth docs under `README.md`, `docs/architecture/`, `docs/analysis/`, `docs/ops/`, or feature-local `README.md` files.
- Keep `.kiro/specs/**` focused on active spec artifacts (`requirements.md`, `design.md`, `tasks.md`, and short `README.md` files).
- Do not commit one-off repair notes, local cleanup scripts, generated completion reports, or docs that reference another upstream template project.

## Local Development

```bash
corepack enable
corepack prepare pnpm@10.33.0 --activate
pnpm install
pnpm dev
```

## Local Development Modes

Use one of these two modes and avoid mixing them on the same ports.

### Mode A: Production-Consistent Local Stack

This is the closest match to the VPS deployment model.

Run the full Docker business stack:

```bash
pnpm run dev:stack:full
```

Then run the frontend against the same `localhost:8080` entrypoint used by the local load balancer:

```bash
pnpm dev
```

Flow:

- `frontend -> nginx_lb:8080 -> app -> search-engine/db/redis`

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

- Frontend proxy target: `http://localhost:18080`
- Host Go API: `http://localhost:18080`
- Host-accessible search engine: `http://localhost:18081`
- `localhost:8080` remains reserved for the production-consistent Docker entrypoint

Flow:

- `frontend(vite) -> host go api:18080 -> search-engine:18081/db/redis`

If your existing local `server/postgres_data` was initialized with different credentials, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\server\dev-up.ps1 -ResetDb
```

Notes:

- Do not run host Go on `8080`; reserve that port for the Docker load balancer.
- `server/.env.dev` should stay production-consistent for Dockerized app routing.
- Host Go hot-debug mode overrides `PORT` and `SEARCH_ENGINE_URL` at runtime instead of editing `server/.env.dev`.
- This flow is for local dev only and should never point to production database endpoints.
- Backend env has a single source of truth: `server/.env.dev`
- Root `.env.local` is frontend-only and should keep only `VITE_*` variables.

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

Single-VPS deployment roadmap: `docs/ops/single-vps-deployment-roadmap.md`
Monitoring/alerting deploy checklist: `docs/ops/monitoring-deploy-checklist.md`

Server one-time bootstrap (when script updates are pulled):

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
