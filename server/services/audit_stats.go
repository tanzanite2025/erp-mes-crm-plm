package services

import (
	"database/sql/driver"
	"sort"
	"strings"
	"time"
	"xdfc-server/audit"
	"xdfc-server/models"

	"gorm.io/gorm"
)

type AuditEngineModuleStats struct {
	ID                         string   `json:"id"`
	TargetEntityCount          int      `json:"targetEntityCount"`
	IntegratedEntityCount      int      `json:"integratedEntityCount"`
	ActiveEntityCount          int      `json:"activeEntityCount"`
	IntegrationCoverage        float64  `json:"integrationCoverage"`
	ActivityCoverage           float64  `json:"activityCoverage"`
	Connected                  bool     `json:"connected"`
	Status                     string   `json:"status"`
	LastEvent                  string   `json:"lastEvent,omitempty"`
	IntegratedEntities         []string `json:"integratedEntities"`
	ActiveEntities             []string `json:"activeEntities"`
	MissingIntegrationEntities []string `json:"missingIntegrationEntities"`

	// Deprecated response fields remain populated for older web clients.
	LoggedEntityCount int      `json:"loggedEntityCount"`
	EntryEntityCount  int      `json:"entryEntityCount"`
	Coverage          float64  `json:"coverage"`
	LogCoverage       float64  `json:"logCoverage"`
	EntryCoverage     float64  `json:"entryCoverage"`
	ConnectedEntities []string `json:"connectedEntities"`
	LoggedEntities    []string `json:"loggedEntities"`
	EntryEntities     []string `json:"entryEntities"`
}

type AuditEngineStatsResponse struct {
	Modules                []AuditEngineModuleStats `json:"modules"`
	HotWindowDays          int                      `json:"hotWindowDays"`
	UnmappedLogEntities    []string                 `json:"unmappedLogEntities"`
	UnmappedLogEntityCount int                      `json:"unmappedLogEntityCount"`
}

type auditEngineLogAggregate struct {
	Module    string
	LastEvent auditAggregateTimestamp
}

// auditAggregateTimestamp accepts both PostgreSQL time.Time values and SQLite
// text timestamps. Tests and local tools use SQLite while production uses the
// PostgreSQL driver, so relying on one concrete scan type is brittle.
type auditAggregateTimestamp struct {
	value time.Time
}

func (timestamp *auditAggregateTimestamp) Scan(value any) error {
	parsed, ok := parseAuditAggregateTime(value)
	if ok {
		timestamp.value = parsed
	} else {
		timestamp.value = time.Time{}
	}
	return nil
}

func (timestamp auditAggregateTimestamp) Value() (driver.Value, error) {
	if timestamp.value.IsZero() {
		return nil, nil
	}
	return timestamp.value, nil
}

func parseAuditAggregateTime(value any) (time.Time, bool) {
	switch typed := value.(type) {
	case time.Time:
		return typed, !typed.IsZero()
	case string:
		return parseAuditAggregateTimeText(typed)
	case []byte:
		return parseAuditAggregateTimeText(string(typed))
	default:
		return time.Time{}, false
	}
}

func parseAuditAggregateTimeText(value string) (time.Time, bool) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return time.Time{}, false
	}
	for _, layout := range []string{
		time.RFC3339Nano,
		"2006-01-02 15:04:05.999999999-07:00",
		"2006-01-02 15:04:05.999999999",
	} {
		if parsed, err := time.Parse(layout, trimmed); err == nil {
			return parsed, true
		}
	}
	return time.Time{}, false
}

// BuildAuditEngineStats reports two independent facts: configured audit
// integration and recent activity in the hot retention window.
func BuildAuditEngineStats(db *gorm.DB) (AuditEngineStatsResponse, error) {
	registry := GetAuditEntityRegistry()
	moduleOrder := GetAuditEngineModuleOrder()

	type moduleAccumulator struct {
		stats       AuditEngineModuleStats
		latestEvent time.Time
	}

	accumulators := make(map[string]*moduleAccumulator, len(moduleOrder))
	for _, moduleID := range moduleOrder {
		accumulators[moduleID] = &moduleAccumulator{stats: newAuditEngineModuleStats(moduleID)}
	}

	logAggregates := make([]auditEngineLogAggregate, 0)
	if err := db.Model(&models.AuditLog{}).
		Select("module, MAX(created_at) as last_event").
		Where("created_at >= ?", time.Now().Add(-audit.HotRetention)).
		Group("module").
		Scan(&logAggregates).Error; err != nil {
		return AuditEngineStatsResponse{}, err
	}

	loggedEntityLastEvent := make(map[string]time.Time, len(logAggregates))
	for _, item := range logAggregates {
		lastEvent := item.LastEvent.value
		if lastEvent.IsZero() {
			continue
		}
		normalized := NormalizeAuditModuleForStats(item.Module)
		if normalized == "" {
			continue
		}
		if current, exists := loggedEntityLastEvent[normalized]; !exists || lastEvent.After(current) {
			loggedEntityLastEvent[normalized] = lastEvent
		}
	}

	registeredKeys := make(map[string]struct{}, len(registry))
	for _, entry := range registry {
		registeredKeys[entry.EntityKey] = struct{}{}
		accumulator, ok := accumulators[entry.EngineModule]
		if !ok {
			continue
		}

		accumulator.stats.TargetEntityCount++
		if entry.Integrated {
			accumulator.stats.IntegratedEntityCount++
			accumulator.stats.IntegratedEntities = append(accumulator.stats.IntegratedEntities, entry.EntityKey)
		} else {
			accumulator.stats.MissingIntegrationEntities = append(accumulator.stats.MissingIntegrationEntities, entry.EntityKey)
		}

		if lastEvent, active := loggedEntityLastEvent[entry.EntityKey]; active {
			accumulator.stats.ActiveEntityCount++
			accumulator.stats.ActiveEntities = append(accumulator.stats.ActiveEntities, entry.EntityKey)
			if accumulator.latestEvent.IsZero() || lastEvent.After(accumulator.latestEvent) {
				accumulator.latestEvent = lastEvent
				accumulator.stats.LastEvent = lastEvent.UTC().Format(time.RFC3339Nano)
			}
		}
	}

	unmappedEntities := make([]string, 0)
	for entityKey := range loggedEntityLastEvent {
		if _, registered := registeredKeys[entityKey]; !registered {
			unmappedEntities = append(unmappedEntities, entityKey)
		}
	}
	sort.Strings(unmappedEntities)

	modules := make([]AuditEngineModuleStats, 0, len(moduleOrder))
	for _, moduleID := range moduleOrder {
		stats := finalizeAuditEngineModuleStats(accumulators[moduleID].stats)
		modules = append(modules, stats)
	}

	return AuditEngineStatsResponse{
		Modules:                modules,
		HotWindowDays:          audit.HotRetentionDays,
		UnmappedLogEntities:    unmappedEntities,
		UnmappedLogEntityCount: len(unmappedEntities),
	}, nil
}

func newAuditEngineModuleStats(moduleID string) AuditEngineModuleStats {
	return AuditEngineModuleStats{
		ID:                         moduleID,
		IntegratedEntities:         []string{},
		ActiveEntities:             []string{},
		MissingIntegrationEntities: []string{},
		ConnectedEntities:          []string{},
		LoggedEntities:             []string{},
		EntryEntities:              []string{},
	}
}

func finalizeAuditEngineModuleStats(stats AuditEngineModuleStats) AuditEngineModuleStats {
	if stats.TargetEntityCount > 0 {
		stats.IntegrationCoverage = float64(stats.IntegratedEntityCount) / float64(stats.TargetEntityCount) * 100
		stats.ActivityCoverage = float64(stats.ActiveEntityCount) / float64(stats.TargetEntityCount) * 100
	}
	stats.Connected = stats.TargetEntityCount > 0 && stats.IntegratedEntityCount == stats.TargetEntityCount
	switch {
	case stats.Connected:
		stats.Status = "HEALTHY"
	case stats.IntegratedEntityCount > 0:
		stats.Status = "ALERT"
	default:
		stats.Status = "CRITICAL"
	}

	sort.Strings(stats.IntegratedEntities)
	sort.Strings(stats.ActiveEntities)
	sort.Strings(stats.MissingIntegrationEntities)

	stats.LoggedEntityCount = stats.ActiveEntityCount
	stats.EntryEntityCount = stats.IntegratedEntityCount
	stats.Coverage = stats.IntegrationCoverage
	stats.LogCoverage = stats.ActivityCoverage
	stats.EntryCoverage = stats.IntegrationCoverage
	stats.ConnectedEntities = append([]string{}, stats.IntegratedEntities...)
	stats.LoggedEntities = append([]string{}, stats.ActiveEntities...)
	stats.EntryEntities = append([]string{}, stats.IntegratedEntities...)
	return stats
}

// GetAuditEngineModuleOrder returns the backend-owned display order.
func GetAuditEngineModuleOrder() []string {
	order := []string{
		AuditEngineModuleTrading,
		AuditEngineModuleFinance,
		AuditEngineModuleEquipment,
		AuditEngineModuleEngineering,
		AuditEngineModuleCuttingEngine,
		AuditEngineModuleWarehouse,
		AuditEngineModuleProduction,
		AuditEngineModuleQuality,
		AuditEngineModuleOrganization,
		AuditEngineModuleSystem,
		AuditEngineModuleWorkflow,
	}
	return append([]string{}, order...)
}

func IsRecentEvent(lastEvent string, within time.Duration) bool {
	if strings.TrimSpace(lastEvent) == "" {
		return false
	}
	parsed, err := time.Parse(time.RFC3339Nano, lastEvent)
	if err != nil {
		return false
	}
	return time.Since(parsed) <= within
}
