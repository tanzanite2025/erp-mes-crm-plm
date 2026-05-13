# BOM Performance Optimization - Production Monitoring Setup

**Version**: 1.0  
**Last Updated**: May 13, 2026  
**Target Audience**: DevOps Engineers, SRE Team, Frontend Team

## Table of Contents

1. [Overview](#overview)
2. [Metrics Collection](#metrics-collection)
3. [Alert Thresholds](#alert-thresholds)
4. [Monitoring Dashboard](#monitoring-dashboard)
5. [Log Aggregation](#log-aggregation)
6. [Monitoring Procedures](#monitoring-procedures)
7. [Incident Response](#incident-response)

---

## Overview

This document describes the production monitoring setup for the BOM performance optimization. The monitoring system tracks key performance metrics, detects anomalies, and alerts the team when issues occur.

### Monitoring Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Application                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         BOMPerformanceMonitor                         │   │
│  │  • Collect metrics                                    │   │
│  │  • Send to backend                                    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Metrics Backend API                       │
│  • Receive metrics                                           │
│  • Validate and transform                                    │
│  • Send to time-series database                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Time-Series Database                        │
│  • Prometheus / InfluxDB                                     │
│  • Store metrics with timestamps                             │
│  • Support queries and aggregations                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Visualization Layer                       │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │   Grafana    │  │  AlertManager│  │   PagerDuty     │   │
│  │  Dashboards  │  │    Rules     │  │   Incidents     │   │
│  └──────────────┘  └──────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Metrics Collection

### Frontend Metrics Collection

#### Implementation

```typescript
// src/lib/performance/metrics-reporter.ts

import { BOMPerformanceMetrics } from './bom-performance-monitor';

interface MetricsReporterConfig {
  endpoint: string;
  batchSize: number;
  flushInterval: number;
  enabled: boolean;
}

class MetricsReporter {
  private queue: BOMPerformanceMetrics[] = [];
  private config: MetricsReporterConfig;
  private flushTimer: NodeJS.Timeout | null = null;
  
  constructor(config: MetricsReporterConfig) {
    this.config = config;
    
    if (config.enabled) {
      this.startFlushTimer();
    }
  }
  
  /**
   * Report metrics to backend
   */
  report(metrics: BOMPerformanceMetrics): void {
    if (!this.config.enabled) {
      return;
    }
    
    this.queue.push(metrics);
    
    if (this.queue.length >= this.config.batchSize) {
      this.flush();
    }
  }
  
  /**
   * Flush queued metrics to backend
   */
  private async flush(): Promise<void> {
    if (this.queue.length === 0) {
      return;
    }
    
    const batch = [...this.queue];
    this.queue = [];
    
    try {
      await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metrics: batch,
          timestamp: Date.now(),
          source: 'bom-performance',
        }),
      });
    } catch (error) {
      console.error('Failed to report metrics:', error);
      // Re-queue failed metrics
      this.queue.unshift(...batch);
    }
  }
  
  /**
   * Start automatic flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }
  
  /**
   * Stop automatic flush timer
   */
  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    
    // Flush remaining metrics
    this.flush();
  }
}

// Export singleton instance
export const metricsReporter = new MetricsReporter({
  endpoint: import.meta.env.VITE_METRICS_ENDPOINT || '/api/metrics',
  batchSize: 10,
  flushInterval: 30000, // 30 seconds
  enabled: import.meta.env.VITE_BOM_ENABLE_PERFORMANCE_MONITORING === 'true',
});
```

#### Integration with Performance Monitor

```typescript
// src/lib/performance/use-bom-performance-monitor.ts

import { metricsReporter } from './metrics-reporter';

export function useBOMPerformanceMonitor() {
  const monitor = useMemo(() => new BOMPerformanceMonitor(), []);
  
  // Report metrics to backend
  useEffect(() => {
    const interval = setInterval(() => {
      const metrics = monitor.getLatestMetrics();
      if (metrics) {
        metricsReporter.report(metrics);
      }
    }, 60000); // Report every minute
    
    return () => clearInterval(interval);
  }, [monitor]);
  
  // ... rest of hook implementation
}
```

---

### Backend Metrics API

#### Endpoint Implementation

```typescript
// backend/src/api/metrics.ts

import { Router } from 'express';
import { prometheusClient } from '../monitoring/prometheus';

const router = Router();

// Prometheus metrics
const initialRenderHistogram = new prometheusClient.Histogram({
  name: 'bom_initial_render_duration_ms',
  help: 'BOM initial render duration in milliseconds',
  buckets: [10, 25, 50, 100, 200, 500, 1000],
});

const editTimeHistogram = new prometheusClient.Histogram({
  name: 'bom_edit_duration_ms',
  help: 'BOM edit operation duration in milliseconds',
  buckets: [5, 10, 25, 50, 100, 200],
});

const commitTimeHistogram = new prometheusClient.Histogram({
  name: 'bom_commit_duration_ms',
  help: 'BOM commit operation duration in milliseconds',
  buckets: [5, 10, 25, 50, 100, 200, 500],
});

const activeProxyGauge = new prometheusClient.Gauge({
  name: 'bom_active_proxy_count',
  help: 'Number of active BOM Proxies',
});

const dirtyRowGauge = new prometheusClient.Gauge({
  name: 'bom_dirty_row_count',
  help: 'Number of dirty BOM rows',
});

// POST /api/metrics
router.post('/metrics', async (req, res) => {
  try {
    const { metrics } = req.body;
    
    if (!Array.isArray(metrics)) {
      return res.status(400).json({ error: 'Invalid metrics format' });
    }
    
    // Record metrics in Prometheus
    for (const metric of metrics) {
      initialRenderHistogram.observe(metric.initialRenderTime);
      editTimeHistogram.observe(metric.editTime);
      commitTimeHistogram.observe(metric.commitTime);
      activeProxyGauge.set(metric.activeProxyCount);
      dirtyRowGauge.set(metric.dirtyRowCount);
    }
    
    res.json({ success: true, count: metrics.length });
  } catch (error) {
    console.error('Error recording metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

---

## Alert Thresholds

### Performance Thresholds

| Metric | Good | Warning | Critical | Action |
|--------|------|---------|----------|--------|
| **Initial Render** | < 50ms | 50-100ms | > 100ms | Investigate |
| **Edit Time** | < 25ms | 25-50ms | > 50ms | Investigate |
| **Commit Time** | < 25ms | 25-50ms | > 50ms | Investigate |
| **Active Proxies** | < 2,000 | 2,000-4,000 | > 4,000 | Memory leak check |
| **Dirty Rows %** | < 10% | 10-20% | > 20% | User behavior analysis |

### Error Rate Thresholds

| Metric | Good | Warning | Critical | Action |
|--------|------|---------|----------|--------|
| **Error Rate** | < 0.01% | 0.01-0.1% | > 0.1% | Rollback consideration |
| **DiffEngineError** | 0 | 1-5/hour | > 5/hour | Investigate diff logic |
| **ProxyTrackerError** | 0 | 1-5/hour | > 5/hour | Investigate Proxy creation |
| **VirtualScrollerError** | 0 | 1-5/hour | > 5/hour | Investigate scroll logic |

### Alert Configuration

#### Prometheus Alert Rules

```yaml
# prometheus/alerts/bom-performance.yml

groups:
  - name: bom_performance
    interval: 30s
    rules:
      # Initial render time alert
      - alert: BOMInitialRenderSlow
        expr: histogram_quantile(0.95, bom_initial_render_duration_ms) > 100
        for: 5m
        labels:
          severity: warning
          component: bom-performance
        annotations:
          summary: "BOM initial render is slow"
          description: "P95 initial render time is {{ $value }}ms (threshold: 100ms)"
      
      # Edit time alert
      - alert: BOMEditSlow
        expr: histogram_quantile(0.95, bom_edit_duration_ms) > 50
        for: 5m
        labels:
          severity: warning
          component: bom-performance
        annotations:
          summary: "BOM edit operations are slow"
          description: "P95 edit time is {{ $value }}ms (threshold: 50ms)"
      
      # Commit time alert
      - alert: BOMCommitSlow
        expr: histogram_quantile(0.95, bom_commit_duration_ms) > 50
        for: 5m
        labels:
          severity: warning
          component: bom-performance
        annotations:
          summary: "BOM commit operations are slow"
          description: "P95 commit time is {{ $value }}ms (threshold: 50ms)"
      
      # Active Proxy count alert
      - alert: BOMHighProxyCount
        expr: bom_active_proxy_count > 4000
        for: 5m
        labels:
          severity: critical
          component: bom-performance
        annotations:
          summary: "BOM active Proxy count is high"
          description: "Active Proxy count is {{ $value }} (threshold: 4000)"
      
      # Error rate alert
      - alert: BOMHighErrorRate
        expr: rate(bom_errors_total[5m]) > 0.001
        for: 5m
        labels:
          severity: critical
          component: bom-performance
        annotations:
          summary: "BOM error rate is high"
          description: "Error rate is {{ $value }} (threshold: 0.1%)"
```

#### AlertManager Configuration

```yaml
# alertmanager/config.yml

route:
  group_by: ['alertname', 'component']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'default'
  
  routes:
    # Critical alerts go to PagerDuty
    - match:
        severity: critical
      receiver: 'pagerduty'
      continue: true
    
    # Warning alerts go to Slack
    - match:
        severity: warning
      receiver: 'slack'

receivers:
  - name: 'default'
    webhook_configs:
      - url: 'http://localhost:5001/webhook'
  
  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: '<PAGERDUTY_SERVICE_KEY>'
        description: '{{ .CommonAnnotations.summary }}'
  
  - name: 'slack'
    slack_configs:
      - api_url: '<SLACK_WEBHOOK_URL>'
        channel: '#bom-performance-alerts'
        title: '{{ .CommonAnnotations.summary }}'
        text: '{{ .CommonAnnotations.description }}'
```

---

## Monitoring Dashboard

### Grafana Dashboard Configuration

#### Dashboard JSON

```json
{
  "dashboard": {
    "title": "BOM Performance Optimization",
    "tags": ["bom", "performance"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Initial Render Time (P50, P95, P99)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.50, bom_initial_render_duration_ms)",
            "legendFormat": "P50"
          },
          {
            "expr": "histogram_quantile(0.95, bom_initial_render_duration_ms)",
            "legendFormat": "P95"
          },
          {
            "expr": "histogram_quantile(0.99, bom_initial_render_duration_ms)",
            "legendFormat": "P99"
          }
        ],
        "yaxes": [
          {
            "label": "Time (ms)",
            "format": "ms"
          }
        ],
        "alert": {
          "conditions": [
            {
              "evaluator": {
                "params": [100],
                "type": "gt"
              },
              "query": {
                "params": ["P95", "5m", "now"]
              }
            }
          ]
        }
      },
      {
        "id": 2,
        "title": "Edit Time (P50, P95, P99)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.50, bom_edit_duration_ms)",
            "legendFormat": "P50"
          },
          {
            "expr": "histogram_quantile(0.95, bom_edit_duration_ms)",
            "legendFormat": "P95"
          },
          {
            "expr": "histogram_quantile(0.99, bom_edit_duration_ms)",
            "legendFormat": "P99"
          }
        ]
      },
      {
        "id": 3,
        "title": "Commit Time (P50, P95, P99)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.50, bom_commit_duration_ms)",
            "legendFormat": "P50"
          },
          {
            "expr": "histogram_quantile(0.95, bom_commit_duration_ms)",
            "legendFormat": "P95"
          },
          {
            "expr": "histogram_quantile(0.99, bom_commit_duration_ms)",
            "legendFormat": "P99"
          }
        ]
      },
      {
        "id": 4,
        "title": "Active Proxy Count",
        "type": "graph",
        "targets": [
          {
            "expr": "bom_active_proxy_count",
            "legendFormat": "Active Proxies"
          }
        ],
        "yaxes": [
          {
            "label": "Count"
          }
        ]
      },
      {
        "id": 5,
        "title": "Dirty Row Count",
        "type": "graph",
        "targets": [
          {
            "expr": "bom_dirty_row_count",
            "legendFormat": "Dirty Rows"
          }
        ]
      },
      {
        "id": 6,
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(bom_errors_total[5m])",
            "legendFormat": "Error Rate"
          }
        ],
        "yaxes": [
          {
            "label": "Errors/sec",
            "format": "percentunit"
          }
        ]
      },
      {
        "id": 7,
        "title": "Rollout Percentage",
        "type": "stat",
        "targets": [
          {
            "expr": "bom_rollout_percentage",
            "legendFormat": "Rollout %"
          }
        ]
      },
      {
        "id": 8,
        "title": "Feature Flag Status",
        "type": "table",
        "targets": [
          {
            "expr": "bom_feature_flags",
            "format": "table"
          }
        ]
      }
    ]
  }
}
```

### Dashboard Access

**URL**: `https://grafana.example.com/d/bom-performance`

**Permissions**:
- View: All engineers
- Edit: DevOps team, Frontend team leads
- Admin: DevOps team

---

## Log Aggregation

### Frontend Error Logging

```typescript
// src/lib/performance/error-logger.ts

import { BOMDeltaError } from '@/lib/delta/errors';

interface ErrorLog {
  timestamp: number;
  level: 'error' | 'warn' | 'info';
  message: string;
  error?: Error;
  context?: Record<string, any>;
  userId?: string;
  sessionId?: string;
}

class ErrorLogger {
  private endpoint: string;
  private enabled: boolean;
  
  constructor(endpoint: string, enabled: boolean) {
    this.endpoint = endpoint;
    this.enabled = enabled;
  }
  
  /**
   * Log error to backend
   */
  async logError(log: ErrorLog): Promise<void> {
    if (!this.enabled) {
      console.error(log);
      return;
    }
    
    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...log,
          source: 'bom-performance',
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      });
    } catch (error) {
      console.error('Failed to log error:', error);
    }
  }
  
  /**
   * Log BOM delta error
   */
  logBOMError(error: BOMDeltaError, context?: Record<string, any>): void {
    this.logError({
      timestamp: Date.now(),
      level: 'error',
      message: error.message,
      error,
      context: {
        ...context,
        ...error.context,
      },
    });
  }
}

export const errorLogger = new ErrorLogger(
  import.meta.env.VITE_ERROR_LOG_ENDPOINT || '/api/logs',
  import.meta.env.VITE_BOM_ENABLE_ERROR_LOGGING === 'true'
);
```

### Log Aggregation Stack

**ELK Stack** (Elasticsearch, Logstash, Kibana):

```yaml
# logstash/config/bom-performance.conf

input {
  http {
    port => 5000
    codec => json
  }
}

filter {
  if [source] == "bom-performance" {
    mutate {
      add_tag => ["bom", "performance"]
    }
    
    # Extract error type
    if [error][name] {
      mutate {
        add_field => { "error_type" => "%{[error][name]}" }
      }
    }
    
    # Parse user agent
    useragent {
      source => "userAgent"
      target => "user_agent"
    }
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "bom-performance-%{+YYYY.MM.dd}"
  }
}
```

---

## Monitoring Procedures

### Daily Monitoring Checklist

**Performed by**: On-call engineer

- [ ] Check Grafana dashboard for anomalies
- [ ] Review error logs in Kibana
- [ ] Verify alert status (no active alerts)
- [ ] Check rollout percentage
- [ ] Review performance trends (week-over-week)

### Weekly Monitoring Report

**Performed by**: Frontend team lead

**Report Contents**:
1. Performance metrics summary (P50, P95, P99)
2. Error rate trends
3. User feedback summary
4. Rollout status
5. Action items

**Distribution**: Engineering team, Product team

### Monthly Performance Review

**Performed by**: Engineering manager, Frontend team

**Agenda**:
1. Review monthly performance trends
2. Analyze user feedback
3. Identify optimization opportunities
4. Plan improvements
5. Update documentation

---

## Incident Response

### Incident Severity Levels

| Level | Description | Response Time | Escalation |
|-------|-------------|---------------|------------|
| **P0** | Critical outage | 15 minutes | Immediate |
| **P1** | Major degradation | 1 hour | 30 minutes |
| **P2** | Minor degradation | 4 hours | 2 hours |
| **P3** | Low impact | 1 business day | N/A |

### Incident Response Procedure

#### 1. Detection

**Automated**:
- Alert triggered in PagerDuty
- Notification sent to on-call engineer

**Manual**:
- User report
- Team member observation

#### 2. Triage

**Actions**:
- [ ] Acknowledge alert
- [ ] Assess severity
- [ ] Check Grafana dashboard
- [ ] Review error logs
- [ ] Determine impact

**Decision**:
- Rollback immediately (P0, P1)
- Investigate and fix (P2, P3)

#### 3. Mitigation

**Rollback**:
```bash
# Disable optimizations
VITE_BOM_ENABLE_ALL_OPTIMIZATIONS=false

# Redeploy
npm run deploy

# Verify
curl https://app.example.com/api/feature-flags
```

**Fix**:
- Identify root cause
- Implement fix
- Test in staging
- Deploy to production

#### 4. Communication

**Internal**:
- Post in #incidents Slack channel
- Update status page
- Notify stakeholders

**External** (if user-facing):
- Update status page
- Send email to affected users
- Post on social media (if major)

#### 5. Post-Mortem

**Timeline**: Within 48 hours of resolution

**Contents**:
- Incident summary
- Timeline of events
- Root cause analysis
- Impact assessment
- Action items
- Lessons learned

**Distribution**: Engineering team, Product team, Leadership

---

## Appendix

### A. Useful Queries

**Prometheus Queries**:

```promql
# P95 initial render time
histogram_quantile(0.95, bom_initial_render_duration_ms)

# Error rate (last 5 minutes)
rate(bom_errors_total[5m])

# Active Proxy count
bom_active_proxy_count

# Dirty row percentage
(bom_dirty_row_count / bom_total_row_count) * 100
```

**Kibana Queries**:

```
# All BOM errors
source:"bom-performance" AND level:"error"

# DiffEngineError
source:"bom-performance" AND error_type:"DiffEngineError"

# Errors by user
source:"bom-performance" AND userId:"user-123"
```

### B. Monitoring Tools

| Tool | Purpose | URL |
|------|---------|-----|
| Grafana | Metrics visualization | https://grafana.example.com |
| Prometheus | Metrics storage | https://prometheus.example.com |
| Kibana | Log analysis | https://kibana.example.com |
| PagerDuty | Incident management | https://pagerduty.com |
| Slack | Team communication | #bom-performance-alerts |

### C. Contact Information

| Role | Name | Slack | Email |
|------|------|-------|-------|
| On-call Engineer | Rotation | @oncall | oncall@example.com |
| Frontend Lead | [Name] | @frontend-lead | frontend-lead@example.com |
| DevOps Lead | [Name] | @devops-lead | devops-lead@example.com |
| Engineering Manager | [Name] | @eng-manager | eng-manager@example.com |

---

**Document Version**: 1.0  
**Last Updated**: May 13, 2026  
**Maintained By**: DevOps Team, SRE Team  
**Review Frequency**: Quarterly
