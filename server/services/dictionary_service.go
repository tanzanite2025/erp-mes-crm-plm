package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

type CreateDictGroupInput struct {
	Name        string
	Code        string
	Description string
	Active      *bool
}

type PatchDictGroupInput struct {
	Code        string
	Name        *string
	Description *string
	Active      *bool
	Version     string
}

type CreateDictEntryInput struct {
	GroupID     string
	Label       string
	Code        string
	Description string
	Options     []any
	SortOrder   *int
	Active      *bool
}

type PatchDictEntryInput struct {
	Code        string
	Label       *string
	Description *string
	Options     *[]any
	SortOrder   *int
	Active      *bool
	Version     string
}

type BulkSyncDictGroupInput struct {
	Name        string `json:"name"`
	Code        string `json:"code"`
	Description string `json:"description"`
	Active      bool   `json:"active"`
}

type BulkSyncDictEntryInput struct {
	GroupID     string          `json:"groupId"`
	Label       string          `json:"label"`
	Code        string          `json:"code"`
	Description string          `json:"description"`
	Options     json.RawMessage `json:"options"`
	SortOrder   int             `json:"sortOrder"`
	Active      bool            `json:"active"`
}

type BulkSyncDictionaryInput struct {
	Groups  []BulkSyncDictGroupInput `json:"groups"`
	Entries []BulkSyncDictEntryInput `json:"entries"`
}

type dictOptionPayload struct {
	Label string `json:"label"`
	Value string `json:"value"`
	Ext   string `json:"ext,omitempty"`
}

func normalizeDictCode(code string) string {
	return strings.ToUpper(strings.TrimSpace(code))
}

func parseDictVersion(version string) (time.Time, error) {
	raw := strings.TrimSpace(version)
	if raw == "" {
		return time.Time{}, errors.New("version is required")
	}
	if parsed, err := time.Parse(time.RFC3339Nano, raw); err == nil {
		return parsed.UTC(), nil
	}
	if parsed, err := time.Parse(time.RFC3339, raw); err == nil {
		return parsed.UTC(), nil
	}
	return time.Time{}, fmt.Errorf("invalid version timestamp: %s", raw)
}

func isDictVersionMatch(current time.Time, expected time.Time) bool {
	return current.UTC().Truncate(time.Millisecond).Equal(expected.UTC().Truncate(time.Millisecond))
}

func normalizeDictOptions(raw []any) (json.RawMessage, error) {
	normalized := make([]dictOptionPayload, 0, len(raw))

	for idx, item := range raw {
		switch v := item.(type) {
		case string:
			label := strings.TrimSpace(v)
			if label == "" {
				return nil, fmt.Errorf("options[%d] is empty", idx)
			}
			normalized = append(normalized, dictOptionPayload{
				Label: label,
				Value: strings.ToUpper(label),
			})
		case map[string]any:
			labelRaw, hasLabel := v["label"]
			valueRaw, hasValue := v["value"]
			if !hasLabel || !hasValue {
				return nil, fmt.Errorf("options[%d] must include label and value", idx)
			}

			label, okLabel := labelRaw.(string)
			value, okValue := valueRaw.(string)
			if !okLabel || !okValue {
				return nil, fmt.Errorf("options[%d] label/value must be strings", idx)
			}

			label = strings.TrimSpace(label)
			value = strings.TrimSpace(value)
			if label == "" || value == "" {
				return nil, fmt.Errorf("options[%d] label/value cannot be empty", idx)
			}

			option := dictOptionPayload{Label: label, Value: value}
			if extRaw, ok := v["ext"]; ok {
				if extStr, ok := extRaw.(string); ok && strings.TrimSpace(extStr) != "" {
					option.Ext = strings.TrimSpace(extStr)
				}
			}
			normalized = append(normalized, option)
		default:
			return nil, fmt.Errorf("options[%d] must be string or object", idx)
		}
	}

	if len(normalized) == 0 {
		return json.RawMessage("[]"), nil
	}

	payload, err := json.Marshal(normalized)
	if err != nil {
		return nil, fmt.Errorf("marshal options failed: %w", err)
	}
	return payload, nil
}

func clearDictCaches() {
	ctx := context.Background()
	db.RDB.Del(ctx, "global:cache:dict:groups")

	var cursor uint64
	for {
		keys, nextCursor, err := db.RDB.Scan(ctx, cursor, "global:cache:dict:entries:*", 100).Result()
		if err != nil {
			break
		}
		if len(keys) > 0 {
			db.RDB.Del(ctx, keys...)
		}
		cursor = nextCursor
		if cursor == 0 {
			break
		}
	}
}

func ListDictGroups() ([]models.DictGroup, error) {
	ctx := context.Background()
	cacheKey := "global:cache:dict:groups"

	if cachedData, err := db.RDB.Get(ctx, cacheKey).Result(); err == nil && cachedData != "" {
		var groups []models.DictGroup
		if unmarshalErr := json.Unmarshal([]byte(cachedData), &groups); unmarshalErr == nil {
			return groups, nil
		}
	}

	var groups []models.DictGroup
	if err := db.DB.Order("is_system desc, code asc").Find(&groups).Error; err != nil {
		return nil, err
	}

	if len(groups) == 0 {
		if err := db.SeedDictionary(db.DB); err == nil {
			_ = db.DB.Order("is_system desc, code asc").Find(&groups).Error
		}
	}

	if jsonBytes, err := json.Marshal(groups); err == nil {
		db.RDB.Set(ctx, cacheKey, string(jsonBytes), 0)
	}

	return groups, nil
}

func CreateDictGroup(input CreateDictGroupInput) (models.DictGroup, error) {
	name := strings.TrimSpace(input.Name)
	code := normalizeDictCode(input.Code)
	if name == "" || code == "" {
		return models.DictGroup{}, errors.New("name/code cannot be empty")
	}

	active := true
	if input.Active != nil {
		active = *input.Active
	}

	var created models.DictGroup
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		var existing models.DictGroup
		if err := tx.Unscoped().Where("code = ?", code).Limit(1).Find(&existing).Error; err != nil {
			return err
		}
		if existing.ID != "" {
			return fmt.Errorf("conflict: dictionary group %s already exists", code)
		}

		created = models.DictGroup{
			Name:        name,
			Code:        code,
			Description: strings.TrimSpace(input.Description),
			Active:      active,
			IsSystem:    false,
		}
		return tx.Create(&created).Error
	})
	if err != nil {
		return models.DictGroup{}, err
	}

	clearDictCaches()
	return created, nil
}

func PatchDictGroup(input PatchDictGroupInput) (models.DictGroup, error) {
	groupCode := normalizeDictCode(input.Code)
	if groupCode == "" {
		return models.DictGroup{}, errors.New("group code is required")
	}

	expectedVersion, err := parseDictVersion(input.Version)
	if err != nil {
		return models.DictGroup{}, err
	}

	if input.Name == nil && input.Description == nil && input.Active == nil {
		return models.DictGroup{}, errors.New("at least one field must be provided")
	}

	var updated models.DictGroup
	err = db.DB.Transaction(func(tx *gorm.DB) error {
		var existing models.DictGroup
		if err := tx.Where("code = ?", groupCode).First(&existing).Error; err != nil {
			return err
		}
		if existing.IsSystem {
			return errors.New("forbidden: system groups cannot be modified")
		}
		if !isDictVersionMatch(existing.UpdatedAt, expectedVersion) {
			return errors.New("conflict: stale dictionary group version")
		}

		updates := map[string]any{}
		if input.Name != nil {
			name := strings.TrimSpace(*input.Name)
			if name == "" {
				return errors.New("name cannot be empty")
			}
			updates["name"] = name
		}
		if input.Description != nil {
			updates["description"] = strings.TrimSpace(*input.Description)
		}
		if input.Active != nil {
			updates["active"] = *input.Active
		}

		if len(updates) == 0 {
			updated = existing
			return nil
		}
		if err := tx.Model(&existing).Updates(updates).Error; err != nil {
			return err
		}
		return tx.First(&updated, "id = ?", existing.ID).Error
	})
	if err != nil {
		return models.DictGroup{}, err
	}

	clearDictCaches()
	return updated, nil
}

func DeleteDictGroup(code string) error {
	groupCode := normalizeDictCode(code)
	if groupCode == "" {
		return errors.New("group code is required")
	}

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		var existing models.DictGroup
		if err := tx.Where("code = ?", groupCode).First(&existing).Error; err != nil {
			return err
		}
		if existing.IsSystem {
			return errors.New("forbidden: system groups cannot be deleted")
		}
		if err := tx.Where("group_id = ?", existing.ID).Delete(&models.DictEntry{}).Error; err != nil {
			return err
		}
		return tx.Delete(&existing).Error
	})
	if err != nil {
		return err
	}

	clearDictCaches()
	return nil
}

func ListDictEntries(groupID string) ([]models.DictEntry, error) {
	groupID = strings.TrimSpace(groupID)
	ctx := context.Background()

	cacheKey := "global:cache:dict:entries:ALL"
	if groupID != "" {
		cacheKey = "global:cache:dict:entries:" + groupID
	}

	if cachedData, err := db.RDB.Get(ctx, cacheKey).Result(); err == nil && cachedData != "" {
		var entries []models.DictEntry
		if unmarshalErr := json.Unmarshal([]byte(cachedData), &entries); unmarshalErr == nil {
			return entries, nil
		}
	}

	var entries []models.DictEntry
	query := db.DB.Order("sort_order asc, code asc")
	if groupID != "" {
		query = query.Where("group_id = ?", groupID)
	}
	if err := query.Find(&entries).Error; err != nil {
		return nil, err
	}

	if jsonBytes, err := json.Marshal(entries); err == nil {
		db.RDB.Set(ctx, cacheKey, string(jsonBytes), 0)
	}

	return entries, nil
}

func CreateDictEntry(input CreateDictEntryInput) (models.DictEntry, error) {
	groupID := strings.TrimSpace(input.GroupID)
	label := strings.TrimSpace(input.Label)
	code := normalizeDictCode(input.Code)
	if groupID == "" || label == "" || code == "" {
		return models.DictEntry{}, errors.New("groupId/label/code cannot be empty")
	}

	optionsJSON, err := normalizeDictOptions(input.Options)
	if err != nil {
		return models.DictEntry{}, err
	}

	sortOrder := 0
	if input.SortOrder != nil {
		sortOrder = *input.SortOrder
	}
	active := true
	if input.Active != nil {
		active = *input.Active
	}

	var created models.DictEntry
	err = db.DB.Transaction(func(tx *gorm.DB) error {
		var group models.DictGroup
		if err := tx.Where("id = ?", groupID).First(&group).Error; err != nil {
			return err
		}

		var existing models.DictEntry
		if err := tx.Unscoped().Where("code = ?", code).Limit(1).Find(&existing).Error; err != nil {
			return err
		}
		if existing.ID != "" {
			return fmt.Errorf("conflict: dictionary entry %s already exists", code)
		}

		created = models.DictEntry{
			GroupID:     groupID,
			Label:       label,
			Code:        code,
			Description: strings.TrimSpace(input.Description),
			Options:     optionsJSON,
			SortOrder:   sortOrder,
			Active:      active,
			IsSystem:    false,
		}
		return tx.Create(&created).Error
	})
	if err != nil {
		return models.DictEntry{}, err
	}

	clearDictCaches()
	return created, nil
}

func PatchDictEntry(input PatchDictEntryInput) (models.DictEntry, error) {
	entryCode := normalizeDictCode(input.Code)
	if entryCode == "" {
		return models.DictEntry{}, errors.New("entry code is required")
	}

	expectedVersion, err := parseDictVersion(input.Version)
	if err != nil {
		return models.DictEntry{}, err
	}

	if input.Label == nil && input.Description == nil && input.Options == nil && input.SortOrder == nil && input.Active == nil {
		return models.DictEntry{}, errors.New("at least one field must be provided")
	}

	var updated models.DictEntry
	err = db.DB.Transaction(func(tx *gorm.DB) error {
		var existing models.DictEntry
		if err := tx.Where("code = ?", entryCode).First(&existing).Error; err != nil {
			return err
		}
		if !isDictVersionMatch(existing.UpdatedAt, expectedVersion) {
			return errors.New("conflict: stale dictionary entry version")
		}
		if existing.IsSystem && (input.Label != nil || input.Active != nil || input.SortOrder != nil) {
			return errors.New("forbidden: system entry metadata is immutable")
		}

		updates := map[string]any{}
		if input.Label != nil {
			label := strings.TrimSpace(*input.Label)
			if label == "" {
				return errors.New("label cannot be empty")
			}
			updates["label"] = label
		}
		if input.Description != nil {
			updates["description"] = strings.TrimSpace(*input.Description)
		}
		if input.SortOrder != nil {
			updates["sort_order"] = *input.SortOrder
		}
		if input.Active != nil {
			updates["active"] = *input.Active
		}
		if input.Options != nil {
			optionsJSON, err := normalizeDictOptions(*input.Options)
			if err != nil {
				return err
			}
			updates["options"] = optionsJSON
		}

		if len(updates) == 0 {
			updated = existing
			return nil
		}
		if err := tx.Model(&existing).Updates(updates).Error; err != nil {
			return err
		}
		return tx.First(&updated, "id = ?", existing.ID).Error
	})
	if err != nil {
		return models.DictEntry{}, err
	}

	clearDictCaches()
	return updated, nil
}

func DeleteDictEntry(code string) error {
	entryCode := normalizeDictCode(code)
	if entryCode == "" {
		return errors.New("entry code is required")
	}

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		var existing models.DictEntry
		if err := tx.Where("code = ?", entryCode).First(&existing).Error; err != nil {
			return err
		}
		if existing.IsSystem {
			return errors.New("forbidden: system entries cannot be deleted")
		}
		return tx.Delete(&existing).Error
	})
	if err != nil {
		return err
	}

	clearDictCaches()
	return nil
}

func SyncDictionary() error {
	if err := db.SeedDictionary(db.DB); err != nil {
		return err
	}
	clearDictCaches()
	return nil
}

func BulkSyncDictionary(input BulkSyncDictionaryInput) error {
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		for _, g := range input.Groups {
			code := normalizeDictCode(g.Code)
			name := strings.TrimSpace(g.Name)
			if code == "" || name == "" {
				continue
			}

			var existing models.DictGroup
			if err := tx.Where("code = ?", code).First(&existing).Error; err == nil {
				if existing.IsSystem {
					continue
				}
				if err := tx.Model(&existing).Updates(map[string]any{
					"name":        name,
					"description": strings.TrimSpace(g.Description),
					"active":      g.Active,
				}).Error; err != nil {
					return err
				}
				continue
			}

			if err := tx.Create(&models.DictGroup{
				Name:        name,
				Code:        code,
				Description: strings.TrimSpace(g.Description),
				Active:      g.Active,
				IsSystem:    false,
			}).Error; err != nil {
				return err
			}
		}

		for _, e := range input.Entries {
			code := normalizeDictCode(e.Code)
			label := strings.TrimSpace(e.Label)
			groupID := strings.TrimSpace(e.GroupID)
			if code == "" || label == "" || groupID == "" {
				continue
			}

			var rawOptions []any
			if len(e.Options) > 0 {
				if err := json.Unmarshal(e.Options, &rawOptions); err != nil {
					return err
				}
			}
			optionsJSON, err := normalizeDictOptions(rawOptions)
			if err != nil {
				return err
			}

			var existing models.DictEntry
			if err := tx.Where("code = ?", code).First(&existing).Error; err == nil {
				if existing.IsSystem {
					continue
				}
				if err := tx.Model(&existing).Updates(map[string]any{
					"group_id":    groupID,
					"label":       label,
					"description": strings.TrimSpace(e.Description),
					"options":     optionsJSON,
					"sort_order":  e.SortOrder,
					"active":      e.Active,
				}).Error; err != nil {
					return err
				}
				continue
			}

			if err := tx.Create(&models.DictEntry{
				GroupID:     groupID,
				Label:       label,
				Code:        code,
				Description: strings.TrimSpace(e.Description),
				Options:     optionsJSON,
				SortOrder:   e.SortOrder,
				Active:      e.Active,
				IsSystem:    false,
			}).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return err
	}

	clearDictCaches()
	return nil
}
