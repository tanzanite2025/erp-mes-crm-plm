package services

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
	"time"
	"xdfc-server/models"
)

var nonAlphaNumericPattern = regexp.MustCompile(`[^a-z0-9]+`)

var allowedBusinessEventEntities = map[string]struct{}{
	"ORDER":   {},
	"BOM":     {},
	"PRODUCT": {},
	"MOLD":    {},
	"SYSTEM":  {},
}

var allowedBusinessEventActionKinds = map[string]struct{}{
	"created": {},
	"updated": {},
	"deleted": {},
	"status":  {},
	"custom":  {},
}

var allowedBusinessStatusPhases = map[string]struct{}{
	"draft":      {},
	"pending":    {},
	"scheduling": {},
	"active":     {},
	"done":       {},
	"cancelled":  {},
	"terminal":   {},
	"custom":     {},
}

var allowedBusinessFieldTypes = map[string]struct{}{
	"string":  {},
	"number":  {},
	"date":    {},
	"user":    {},
	"boolean": {},
	"object":  {},
}

var allowedBusinessResolverTypes = map[string]struct{}{
	"user":       {},
	"group":      {},
	"permission": {},
}

type BusinessEventActionDTO struct {
	ID    string `json:"id"`
	Order int    `json:"order"`
	Code  string `json:"code"`
	Name  string `json:"name"`
	Kind  string `json:"kind"`
}

type BusinessStatusDTO struct {
	ID             string `json:"id"`
	Order          int    `json:"order"`
	Code           string `json:"code"`
	Label          string `json:"label"`
	Phase          string `json:"phase"`
	IsTerminal     bool   `json:"isTerminal"`
	DefaultResolve bool   `json:"defaultResolve"`
}

type BusinessEventFieldDTO struct {
	ID              string `json:"id"`
	Order           int    `json:"order"`
	Key             string `json:"key"`
	Label           string `json:"label"`
	Path            string `json:"path"`
	Type            string `json:"type"`
	TemplateKey     string `json:"templateKey"`
	TemplateEnabled bool   `json:"templateEnabled"`
	DynamicResolver bool   `json:"dynamicResolver"`
}

type BusinessDynamicResolverDTO struct {
	ID    string `json:"id"`
	Order int    `json:"order"`
	Code  string `json:"code"`
	Label string `json:"label"`
	Path  string `json:"path"`
	Type  string `json:"type"`
}

type BusinessEventSourceConfigDTO struct {
	Actions                  []BusinessEventActionDTO     `json:"actions"`
	Statuses                 []BusinessStatusDTO          `json:"statuses"`
	Fields                   []BusinessEventFieldDTO      `json:"fields"`
	DynamicResolvers         []BusinessDynamicResolverDTO `json:"dynamicResolvers"`
	DefaultActionURLTemplate string                       `json:"defaultActionUrlTemplate"`
}

type BusinessEventSourceRequest struct {
	ID          string                       `json:"id"`
	Code        string                       `json:"code"`
	Name        string                       `json:"name"`
	Module      string                       `json:"module"`
	Entity      string                       `json:"entity"`
	Enabled     bool                         `json:"enabled"`
	Description string                       `json:"description"`
	Config      BusinessEventSourceConfigDTO `json:"config"`
}

type BusinessEventSourceResponse struct {
	ID          string                       `json:"id"`
	CreatedAt   time.Time                    `json:"createdAt"`
	UpdatedAt   time.Time                    `json:"updatedAt"`
	Code        string                       `json:"code"`
	Name        string                       `json:"name"`
	Module      string                       `json:"module"`
	Entity      string                       `json:"entity"`
	Enabled     bool                         `json:"enabled"`
	Description string                       `json:"description"`
	Config      BusinessEventSourceConfigDTO `json:"config"`
}

func slugifyBusinessEventToken(value string) string {
	normalized := strings.ToLower(strings.TrimSpace(value))
	normalized = nonAlphaNumericPattern.ReplaceAllString(normalized, "-")
	normalized = strings.Trim(normalized, "-")
	return normalized
}

func buildBusinessEventConfigItemID(prefix string, index int, parts ...string) string {
	baseParts := make([]string, 0, len(parts))
	for _, part := range parts {
		slug := slugifyBusinessEventToken(part)
		if slug != "" {
			baseParts = append(baseParts, slug)
		}
	}

	base := strings.Join(baseParts, "-")
	if base == "" {
		base = fmt.Sprintf("item-%d", index+1)
	}
	return fmt.Sprintf("%s-%s-%d", prefix, base, index+1)
}

func requireNonEmpty(field string, value string) error {
	if strings.TrimSpace(value) == "" {
		return fmt.Errorf("%s is required", field)
	}
	return nil
}

func requireEnum(field string, value string, allowed map[string]struct{}) error {
	if _, ok := allowed[value]; !ok {
		return fmt.Errorf("%s has invalid value %q", field, value)
	}
	return nil
}

func normalizeBusinessEventSourceConfigDTO(
	config BusinessEventSourceConfigDTO,
) BusinessEventSourceConfigDTO {
	if config.Actions == nil {
		config.Actions = []BusinessEventActionDTO{}
	}
	if config.Statuses == nil {
		config.Statuses = []BusinessStatusDTO{}
	}
	if config.Fields == nil {
		config.Fields = []BusinessEventFieldDTO{}
	}
	if config.DynamicResolvers == nil {
		config.DynamicResolvers = []BusinessDynamicResolverDTO{}
	}

	for index := range config.Actions {
		config.Actions[index].ID = strings.TrimSpace(config.Actions[index].ID)
		config.Actions[index].Code = strings.TrimSpace(config.Actions[index].Code)
		config.Actions[index].Name = strings.TrimSpace(config.Actions[index].Name)
		config.Actions[index].Kind = strings.TrimSpace(config.Actions[index].Kind)
		if config.Actions[index].ID == "" {
			config.Actions[index].ID = buildBusinessEventConfigItemID(
				"action",
				index,
				config.Actions[index].Code,
				config.Actions[index].Name,
			)
		}
		config.Actions[index].Order = index
	}

	for index := range config.Statuses {
		config.Statuses[index].ID = strings.TrimSpace(config.Statuses[index].ID)
		config.Statuses[index].Code = strings.TrimSpace(config.Statuses[index].Code)
		config.Statuses[index].Label = strings.TrimSpace(config.Statuses[index].Label)
		config.Statuses[index].Phase = strings.TrimSpace(config.Statuses[index].Phase)
		if config.Statuses[index].ID == "" {
			config.Statuses[index].ID = buildBusinessEventConfigItemID(
				"status",
				index,
				config.Statuses[index].Code,
				config.Statuses[index].Label,
			)
		}
		config.Statuses[index].Order = index
	}

	for index := range config.Fields {
		config.Fields[index].ID = strings.TrimSpace(config.Fields[index].ID)
		config.Fields[index].Key = strings.TrimSpace(config.Fields[index].Key)
		config.Fields[index].Label = strings.TrimSpace(config.Fields[index].Label)
		config.Fields[index].Path = strings.TrimSpace(config.Fields[index].Path)
		config.Fields[index].Type = strings.TrimSpace(config.Fields[index].Type)
		config.Fields[index].TemplateKey = strings.TrimSpace(config.Fields[index].TemplateKey)
		if config.Fields[index].ID == "" {
			config.Fields[index].ID = buildBusinessEventConfigItemID(
				"field",
				index,
				config.Fields[index].Key,
				config.Fields[index].Path,
			)
		}
		config.Fields[index].Order = index
	}

	for index := range config.DynamicResolvers {
		config.DynamicResolvers[index].ID = strings.TrimSpace(config.DynamicResolvers[index].ID)
		config.DynamicResolvers[index].Code = strings.TrimSpace(config.DynamicResolvers[index].Code)
		config.DynamicResolvers[index].Label = strings.TrimSpace(config.DynamicResolvers[index].Label)
		config.DynamicResolvers[index].Path = strings.TrimSpace(config.DynamicResolvers[index].Path)
		config.DynamicResolvers[index].Type = strings.TrimSpace(config.DynamicResolvers[index].Type)
		if config.DynamicResolvers[index].ID == "" {
			config.DynamicResolvers[index].ID = buildBusinessEventConfigItemID(
				"resolver",
				index,
				config.DynamicResolvers[index].Code,
				config.DynamicResolvers[index].Path,
			)
		}
		config.DynamicResolvers[index].Order = index
	}

	config.DefaultActionURLTemplate = strings.TrimSpace(config.DefaultActionURLTemplate)
	return config
}

func validateBusinessEventSourceConfigDTO(config BusinessEventSourceConfigDTO) error {
	for index, action := range config.Actions {
		if err := requireNonEmpty(fmt.Sprintf("config.actions[%d].id", index), action.ID); err != nil {
			return err
		}
		if action.Order != index {
			return fmt.Errorf("config.actions[%d].order must equal %d", index, index)
		}
		if err := requireNonEmpty(fmt.Sprintf("config.actions[%d].code", index), action.Code); err != nil {
			return err
		}
		if err := requireNonEmpty(fmt.Sprintf("config.actions[%d].name", index), action.Name); err != nil {
			return err
		}
		if err := requireNonEmpty(fmt.Sprintf("config.actions[%d].kind", index), action.Kind); err != nil {
			return err
		}
		if err := requireEnum(
			fmt.Sprintf("config.actions[%d].kind", index),
			action.Kind,
			allowedBusinessEventActionKinds,
		); err != nil {
			return err
		}
	}

	for index, status := range config.Statuses {
		if err := requireNonEmpty(fmt.Sprintf("config.statuses[%d].id", index), status.ID); err != nil {
			return err
		}
		if status.Order != index {
			return fmt.Errorf("config.statuses[%d].order must equal %d", index, index)
		}
		if err := requireNonEmpty(fmt.Sprintf("config.statuses[%d].code", index), status.Code); err != nil {
			return err
		}
		if err := requireNonEmpty(fmt.Sprintf("config.statuses[%d].label", index), status.Label); err != nil {
			return err
		}
		if err := requireNonEmpty(fmt.Sprintf("config.statuses[%d].phase", index), status.Phase); err != nil {
			return err
		}
		if err := requireEnum(
			fmt.Sprintf("config.statuses[%d].phase", index),
			status.Phase,
			allowedBusinessStatusPhases,
		); err != nil {
			return err
		}
	}

	for index, field := range config.Fields {
		if err := requireNonEmpty(fmt.Sprintf("config.fields[%d].id", index), field.ID); err != nil {
			return err
		}
		if field.Order != index {
			return fmt.Errorf("config.fields[%d].order must equal %d", index, index)
		}
		if err := requireNonEmpty(fmt.Sprintf("config.fields[%d].key", index), field.Key); err != nil {
			return err
		}
		if err := requireNonEmpty(fmt.Sprintf("config.fields[%d].label", index), field.Label); err != nil {
			return err
		}
		if err := requireNonEmpty(fmt.Sprintf("config.fields[%d].path", index), field.Path); err != nil {
			return err
		}
		if err := requireNonEmpty(fmt.Sprintf("config.fields[%d].type", index), field.Type); err != nil {
			return err
		}
		if err := requireEnum(
			fmt.Sprintf("config.fields[%d].type", index),
			field.Type,
			allowedBusinessFieldTypes,
		); err != nil {
			return err
		}
	}

	for index, resolver := range config.DynamicResolvers {
		if err := requireNonEmpty(fmt.Sprintf("config.dynamicResolvers[%d].id", index), resolver.ID); err != nil {
			return err
		}
		if resolver.Order != index {
			return fmt.Errorf("config.dynamicResolvers[%d].order must equal %d", index, index)
		}
		if err := requireNonEmpty(fmt.Sprintf("config.dynamicResolvers[%d].code", index), resolver.Code); err != nil {
			return err
		}
		if err := requireNonEmpty(fmt.Sprintf("config.dynamicResolvers[%d].label", index), resolver.Label); err != nil {
			return err
		}
		if err := requireNonEmpty(fmt.Sprintf("config.dynamicResolvers[%d].path", index), resolver.Path); err != nil {
			return err
		}
		if err := requireNonEmpty(fmt.Sprintf("config.dynamicResolvers[%d].type", index), resolver.Type); err != nil {
			return err
		}
		if err := requireEnum(
			fmt.Sprintf("config.dynamicResolvers[%d].type", index),
			resolver.Type,
			allowedBusinessResolverTypes,
		); err != nil {
			return err
		}
	}

	return nil
}

func normalizeBusinessEventSourceRequest(
	input BusinessEventSourceRequest,
) BusinessEventSourceRequest {
	input.ID = strings.TrimSpace(input.ID)
	input.Code = strings.TrimSpace(input.Code)
	input.Name = strings.TrimSpace(input.Name)
	input.Module = strings.TrimSpace(input.Module)
	input.Entity = strings.TrimSpace(input.Entity)
	input.Description = strings.TrimSpace(input.Description)
	input.Config = normalizeBusinessEventSourceConfigDTO(input.Config)
	return input
}

func validateBusinessEventSourceRequest(input BusinessEventSourceRequest) error {
	if err := requireNonEmpty("code", input.Code); err != nil {
		return err
	}
	if err := requireNonEmpty("name", input.Name); err != nil {
		return err
	}
	if err := requireNonEmpty("module", input.Module); err != nil {
		return err
	}
	if err := requireNonEmpty("entity", input.Entity); err != nil {
		return err
	}
	if err := requireEnum("entity", input.Entity, allowedBusinessEventEntities); err != nil {
		return err
	}
	return validateBusinessEventSourceConfigDTO(input.Config)
}

func marshalBusinessEventSourceConfig(
	config BusinessEventSourceConfigDTO,
) (json.RawMessage, error) {
	normalized := normalizeBusinessEventSourceConfigDTO(config)
	if err := validateBusinessEventSourceConfigDTO(normalized); err != nil {
		return nil, err
	}

	raw, err := json.Marshal(normalized)
	if err != nil {
		return nil, err
	}
	return raw, nil
}

func unmarshalBusinessEventSourceConfig(
	raw json.RawMessage,
) (BusinessEventSourceConfigDTO, error) {
	if len(raw) == 0 {
		return normalizeBusinessEventSourceConfigDTO(BusinessEventSourceConfigDTO{}), nil
	}

	var config BusinessEventSourceConfigDTO
	if err := json.Unmarshal(raw, &config); err != nil {
		return BusinessEventSourceConfigDTO{}, err
	}

	normalized := normalizeBusinessEventSourceConfigDTO(config)
	if err := validateBusinessEventSourceConfigDTO(normalized); err != nil {
		return BusinessEventSourceConfigDTO{}, err
	}
	return normalized, nil
}

func MapBusinessEventSourceRequestToModel(
	input BusinessEventSourceRequest,
) (models.BusinessEventSource, error) {
	normalized := normalizeBusinessEventSourceRequest(input)
	if err := validateBusinessEventSourceRequest(normalized); err != nil {
		return models.BusinessEventSource{}, err
	}

	config, err := marshalBusinessEventSourceConfig(normalized.Config)
	if err != nil {
		return models.BusinessEventSource{}, err
	}

	return models.BusinessEventSource{
		BaseModel:   models.BaseModel{ID: normalized.ID},
		Code:        normalized.Code,
		Name:        normalized.Name,
		Module:      normalized.Module,
		Entity:      normalized.Entity,
		Enabled:     normalized.Enabled,
		Description: normalized.Description,
		Config:      config,
	}, nil
}

func MapBusinessEventSourceToResponse(
	model models.BusinessEventSource,
) (BusinessEventSourceResponse, error) {
	config, err := unmarshalBusinessEventSourceConfig(model.Config)
	if err != nil {
		return BusinessEventSourceResponse{}, err
	}

	return BusinessEventSourceResponse{
		ID:          model.ID,
		CreatedAt:   model.CreatedAt,
		UpdatedAt:   model.UpdatedAt,
		Code:        strings.TrimSpace(model.Code),
		Name:        strings.TrimSpace(model.Name),
		Module:      strings.TrimSpace(model.Module),
		Entity:      strings.TrimSpace(model.Entity),
		Enabled:     model.Enabled,
		Description: strings.TrimSpace(model.Description),
		Config:      config,
	}, nil
}

func MapBusinessEventSourcesToResponse(
	items []models.BusinessEventSource,
) ([]BusinessEventSourceResponse, error) {
	result := make([]BusinessEventSourceResponse, 0, len(items))
	for _, item := range items {
		mapped, err := MapBusinessEventSourceToResponse(item)
		if err != nil {
			return nil, err
		}
		result = append(result, mapped)
	}
	return result, nil
}
