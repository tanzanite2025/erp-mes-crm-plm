# Monitoring Deploy Checklist

Monitoring is shared infrastructure on the Hostinger VPS. Do not run a separate Loki, Grafana, Prometheus, or Alertmanager stack inside every business project.

## Security Boundary

- Public requests to `/api/v1/system/metrics` are blocked with `404` by `deployment/nginx/erp-web.conf`.
- A future shared monitoring Stack must join the ERP application network and scrape `app:8080` directly.
- The monitoring Stack must not join the ERP data network.
- Alertmanager webhook requests require the shared `ALERT_WEBHOOK_TOKEN` enforced by the Go application.
- Monitoring services must not publish host ports. Use the shared gateway with authentication or an SSH tunnel for operator access.

## Relevant Files

- Backend ingress guard: `server/middleware/ingress_guard.go`
- Backend route registration: `server/routes/routes.go`
- Public metrics block: `deployment/nginx/erp-web.conf`
- Production ERP Stack: `compose.prod.yml`
- Monitoring examples:
  - `deployment/monitoring/prometheus.yml.example`
  - `deployment/monitoring/alert_rules.yml.example`
  - `deployment/monitoring/alertmanager.yml.example`
- Production environment template: `server/.env.production.example`

## Required Environment

```dotenv
GIN_MODE=release
ALERT_WEBHOOK_TOKEN=<strong-random-token>
```

Use the same token in Alertmanager `authorization.credentials`. Never place the real value in Git.

## Deployment Checklist

1. Confirm the ERP Stack is Healthy before adding monitoring.
2. Create one shared observability Compose Project with independent volumes and resource limits.
3. Attach only Prometheus or the required collector to the ERP application network.
4. Keep Grafana and Alertmanager off public host ports.
5. Verify a public metrics request returns `404`.
6. Verify the internal Prometheus target is Up.
7. Send authenticated `firing` and `resolved` webhook events.
8. Confirm dashboard, toast, and sidebar alert behavior.
9. Confirm monitoring logs use rotation and cannot fill the VPS disk.

Do not restore the removed host Nginx allowlist model. Container network membership is the production trust boundary for metrics collection.
