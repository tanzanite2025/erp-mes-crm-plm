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

## Local Development
```bash
pnpm install
pnpm dev
```

## Local Docker Dev (Windows, Isolated from Production DB)
This project includes a one-click local Docker startup script that uses `server/.env.dev` and targets only the local compose services (`db`, `redis`, `app`, `nginx_lb`, `watchdog`).

First run:
```powershell
powershell -ExecutionPolicy Bypass -File .\server\dev-up.ps1
```

If your existing local `server/postgres_data` was initialized with different credentials, run:
```powershell
powershell -ExecutionPolicy Bypass -File .\server\dev-up.ps1 -ResetDb
```

Notes:
- This flow is for local dev only and should never point to production database endpoints.
- The script starts `db + redis`, verifies DB credentials, then starts business containers to avoid crash-restart loops.

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
Detailed environment checklist: `PRODUCTION_SETUP.md`
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
