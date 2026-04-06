# Monitoring Deploy Checklist

This project intentionally keeps monitoring security simple:

- `metrics` endpoint protection is done at Nginx/Cloudflare layer.
- Alertmanager webhook uses one shared token (`ALERT_WEBHOOK_TOKEN`) in app layer.

## Files You Need to Remember

- Backend token check:
  - `server/middleware/ingress_guard.go`
  - `server/main.go`
- Backend routes:
  - `server/routes/routes.go`
- Nginx restrictions for `/api/v1/system/metrics`:
  - `nginx.conf.template`
  - `server/deployment/nginx/erp.tanzanite.site.conf`
  - `server/deployment/nginx/internal_lb.conf`
- Monitoring examples:
  - `deployment/monitoring/prometheus.yml.example`
  - `deployment/monitoring/alert_rules.yml.example`
  - `deployment/monitoring/alertmanager.yml.example`
- Environment template:
  - `.env.example`

## Required Environment Variables (Production)

- `GIN_MODE=release`
- `ALERT_WEBHOOK_TOKEN=<strong-random-token>`

## Deployment Steps

1. Set `ALERT_WEBHOOK_TOKEN` in backend environment.
2. Set same token in Alertmanager config (`authorization.credentials`).
3. Keep `/api/v1/system/metrics` allow/deny rules in Nginx.
4. Reload Nginx and restart backend.
5. Validate:
   - POST a `firing` webhook
   - POST a `resolved` webhook
   - Confirm dashboard + toast + sidebar red dot behavior.

