package handlers

import (
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type ActiveAlert struct {
	ID          string    `json:"id"`
	Fingerprint string    `json:"fingerprint"`
	Status      string    `json:"status"`
	Severity    string    `json:"severity"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	StartsAt    time.Time `json:"startsAt"`
}

type AlertDiagnosticLog struct {
	ID              string     `json:"id"`
	Fingerprint     string     `json:"fingerprint"`
	Status          string     `json:"status"`
	Severity        string     `json:"severity"`
	Name            string     `json:"name"`
	Description     string     `json:"description"`
	StartsAt        time.Time  `json:"startsAt"`
	EndsAt          *time.Time `json:"endsAt,omitempty"`
	ReceivedAt      time.Time  `json:"receivedAt"`
	DurationSeconds int64      `json:"durationSeconds"`
}

type AlertDiagnosticsResponse struct {
	Active []ActiveAlert        `json:"active"`
	Logs   []AlertDiagnosticLog `json:"logs"`
}

var (
	alertsMu          sync.Mutex
	activeAlerts      = make(map[string]ActiveAlert)
	alertHistory      []AlertDiagnosticLog
	alertLogRetention = 24 * time.Hour
)

func AlertWebhookHandler(c *gin.Context) {
	var payload struct {
		Alerts []struct {
			Status      string            `json:"status"`
			Labels      map[string]string `json:"labels"`
			Annotations map[string]string `json:"annotations"`
			StartsAt    time.Time         `json:"startsAt"`
			Fingerprint string            `json:"fingerprint"`
		} `json:"alerts"`
	}

	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid alert payload"})
		return
	}

	alertsMu.Lock()
	defer alertsMu.Unlock()
	pruneAlertHistoryLocked(time.Now())

	for _, a := range payload.Alerts {
		alertName := a.Labels["alertname"]
		if strings.TrimSpace(alertName) == "" {
			alertName = "UnknownAlert"
		}

		fingerprint := strings.TrimSpace(a.Fingerprint)
		if fingerprint == "" {
			fingerprint = alertName + ":" + a.StartsAt.Format(time.RFC3339)
		}

		description := a.Annotations["description"]
		if strings.TrimSpace(description) == "" {
			description = a.Annotations["summary"]
		}
		if strings.TrimSpace(description) == "" {
			description = alertName
		}

		translatedDesc := translateAlertDescription(alertName, description)
		severity := strings.ToLower(strings.TrimSpace(a.Labels["severity"]))
		if severity == "" {
			severity = "warning"
		}

		if strings.EqualFold(a.Status, "resolved") {
			previous, existed := activeAlerts[fingerprint]
			delete(activeAlerts, fingerprint)

			startsAt := a.StartsAt
			if startsAt.IsZero() && existed {
				startsAt = previous.StartsAt
			}
			now := time.Now()
			entry := newAlertLogEntry(
				fingerprint,
				"resolved",
				severity,
				alertName,
				translatedDesc,
				startsAt,
				&now,
				now,
			)
			alertHistory = append(alertHistory, entry)

			NotifyTrigger("System", "ALERT_RESOLVED", "系统自诊断已恢复: "+translatedDesc, "admin", map[string]interface{}{
				"fingerprint":     fingerprint,
				"status":          "resolved",
				"severity":        severity,
				"name":            alertName,
				"description":     translatedDesc,
				"startsAt":        startsAt,
				"endsAt":          now,
				"durationSeconds": entry.DurationSeconds,
			})
			continue
		}

		alert := ActiveAlert{
			ID:          fingerprint,
			Fingerprint: fingerprint,
			Status:      "firing",
			Severity:    severity,
			Name:        alertName,
			Description: translatedDesc,
			StartsAt:    a.StartsAt,
		}

		previous, existed := activeAlerts[fingerprint]
		activeAlerts[fingerprint] = alert

		now := time.Now()
		alertHistory = append(alertHistory, newAlertLogEntry(
			fingerprint,
			"firing",
			severity,
			alertName,
			translatedDesc,
			a.StartsAt,
			nil,
			now,
		))

		shouldBroadcast := !existed ||
			previous.Severity != alert.Severity ||
			previous.Description != alert.Description
		if shouldBroadcast {
			NotifyTrigger("System", "ALERT", "系统自诊断异常: "+translatedDesc, "admin", alert)
		}
	}

	c.JSON(http.StatusOK, gin.H{"status": "processed"})
}

func GetActiveAlertsHandler(c *gin.Context) {
	alertsMu.Lock()
	defer alertsMu.Unlock()
	pruneAlertHistoryLocked(time.Now())

	list := make([]ActiveAlert, 0, len(activeAlerts))
	for _, a := range activeAlerts {
		list = append(list, a)
	}
	sort.Slice(list, func(i, j int) bool {
		return list[i].StartsAt.After(list[j].StartsAt)
	})
	c.JSON(http.StatusOK, list)
}

func GetAlertDiagnosticsHandler(c *gin.Context) {
	alertsMu.Lock()
	defer alertsMu.Unlock()
	pruneAlertHistoryLocked(time.Now())

	active := make([]ActiveAlert, 0, len(activeAlerts))
	for _, a := range activeAlerts {
		active = append(active, a)
	}
	sort.Slice(active, func(i, j int) bool {
		return active[i].StartsAt.After(active[j].StartsAt)
	})

	logs := make([]AlertDiagnosticLog, len(alertHistory))
	copy(logs, alertHistory)
	sort.Slice(logs, func(i, j int) bool {
		return logs[i].ReceivedAt.After(logs[j].ReceivedAt)
	})

	c.JSON(http.StatusOK, AlertDiagnosticsResponse{
		Active: active,
		Logs:   logs,
	})
}

func translateAlertDescription(name, desc string) string {
	mapping := map[string]string{
		"InstanceDown":       "服务器实例宕机或无法连接",
		"DBConnectionHigh":   "数据库连接池负载过高，请检查并发与慢查询",
		"RedisDown":          "缓存服务异常，实时通知可能受影响",
		"HighCPULoad":        "处理器负载异常，系统响应可能变慢",
		"DiskSpaceLow":       "磁盘空间不足，请立即清理",
		"WatchdogSignalLost": "Watchdog 心跳丢失，请检查监控进程",
	}

	if val, ok := mapping[name]; ok {
		return val
	}
	return desc
}

func pruneAlertHistoryLocked(now time.Time) {
	if len(alertHistory) == 0 {
		return
	}

	cutoff := now.Add(-alertLogRetention)
	kept := alertHistory[:0]
	for _, item := range alertHistory {
		if item.ReceivedAt.After(cutoff) {
			kept = append(kept, item)
		}
	}
	alertHistory = kept
}

func newAlertLogEntry(
	fingerprint string,
	status string,
	severity string,
	name string,
	description string,
	startsAt time.Time,
	endsAt *time.Time,
	receivedAt time.Time,
) AlertDiagnosticLog {
	var durationSeconds int64
	if !startsAt.IsZero() {
		endAt := receivedAt
		if endsAt != nil {
			endAt = *endsAt
		}
		if endAt.After(startsAt) {
			durationSeconds = int64(endAt.Sub(startsAt).Seconds())
		}
	}

	return AlertDiagnosticLog{
		ID:              fingerprint + ":" + receivedAt.Format(time.RFC3339Nano),
		Fingerprint:     fingerprint,
		Status:          status,
		Severity:        severity,
		Name:            name,
		Description:     description,
		StartsAt:        startsAt,
		EndsAt:          endsAt,
		ReceivedAt:      receivedAt,
		DurationSeconds: durationSeconds,
	}
}
