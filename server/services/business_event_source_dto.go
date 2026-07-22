// Package services - 业务事件源(自定义工作流引擎)的 DTO 编解码与规范化。
//
// 业务事件源(BusinessEventSource)是一个用户可配置的"可被规则引擎监听的事件类型",
// 用于消息中心 + 审批中心的路由触发。配置项包括:
//   - 事件触发条件
//   - 状态字段(状态值列表 + 状态间转换图)
//   - 默认派生的审批/通知动作
//
// 此文件聚焦配置的存储格式与 API 形态间的双向映射:
//   - validateBusinessEventSourceWriteConfigDTO / normalizeBusinessEventSourceWriteConfigDTO
//   - normalizeBusinessEventSourceStoredConfigDTO / validateBusinessEventSourceStoredConfigDTO
//   - marshal/unmarshal helpers (config 走 JSONB 存储)
//   - MapBusinessEventSourceRequestToModel / MapBusinessEventSourceToResponse 双向映射
//
// 关键不变量:
//   - slugifyBusinessEventToken 把人类可读名称规范化为 ASCII slug(用于 ID 生成)
//   - buildBusinessEventConfigItemID 保证 config 内部子项 ID 在父 source 内唯一
//   - 状态/动作/配置项的 enum 校验集中在 requireEnum
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
	"QUALITY": {},
	"SYSTEM":  {},
}

var allowedBusinessEventActionKinds = map[string]struct{}{
	"created": {},
	"updated": {},
	"deleted": {},
	"status":  {},
	"custom":  {},
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

type BusinessStatusStoredDTO struct {
	ID             string `json:"id"`
	Order          int    `json:"order"`
	Code           string `json:"code"`
	Label          string `json:"label"`
	Phase          string `json:"phase"`
	IsTerminal     bool   `json:"isTerminal"`
	DefaultResolve bool   `json:"defaultResolve"`
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

type BusinessStatusWriteDTO struct {
	ID    string `json:"id"`
	Order int    `json:"order"`
	Code  string `json:"code"`
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

type BusinessEventSourceStoredConfigDTO struct {
	Actions                  []BusinessEventActionDTO     `json:"actions"`
	Statuses                 []BusinessStatusStoredDTO    `json:"statuses"`
	Fields                   []BusinessEventFieldDTO      `json:"fields"`
	DynamicResolvers         []BusinessDynamicResolverDTO `json:"dynamicResolvers"`
	DefaultActionURLTemplate string                       `json:"defaultActionUrlTemplate"`
}

type BusinessEventSourceResponseConfigDTO struct {
	Actions                  []BusinessEventActionDTO     `json:"actions"`
	Statuses                 []BusinessStatusDTO          `json:"statuses"`
	Fields                   []BusinessEventFieldDTO      `json:"fields"`
	DynamicResolvers         []BusinessDynamicResolverDTO `json:"dynamicResolvers"`
	DefaultActionURLTemplate string                       `json:"defaultActionUrlTemplate"`
}

type BusinessEventSourceWriteConfigDTO struct {
	Actions                  []BusinessEventActionDTO     `json:"actions"`
	Statuses                 []BusinessStatusWriteDTO     `json:"statuses"`
	Fields                   []BusinessEventFieldDTO      `json:"fields"`
	DynamicResolvers         []BusinessDynamicResolverDTO `json:"dynamicResolvers"`
	DefaultActionURLTemplate string                       `json:"defaultActionUrlTemplate"`
}

type BusinessEventSourceWriteRequest struct {
	ID          string                            `json:"id"`
	Code        string                            `json:"code"`
	Name        string                            `json:"name"`
	Module      string                            `json:"module"`
	Entity      string                            `json:"entity"`
	Enabled     bool                              `json:"enabled"`
	Description string                            `json:"description"`
	Config      BusinessEventSourceWriteConfigDTO `json:"config"`
}

type BusinessEventSourceRequest = BusinessEventSourceWriteRequest

type BusinessEventSourceResponse struct {
	ID          string                               `json:"id"`
	CreatedAt   time.Time                            `json:"createdAt"`
	UpdatedAt   time.Time                            `json:"updatedAt"`
	Code        string                               `json:"code"`
	Name        string                               `json:"name"`
	Module      string                               `json:"module"`
	Entity      string                               `json:"entity"`
	Enabled     bool                                 `json:"enabled"`
	Description string                               `json:"description"`
	Config      BusinessEventSourceResponseConfigDTO `json:"config"`
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

func validateBusinessEventSourceWriteConfigDTO(config BusinessEventSourceWriteConfigDTO) error {
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

func requireEnum(field string, value string, allowed map[string]struct{}) error {
	if _, ok := allowed[value]; !ok {
		return fmt.Errorf("%s has invalid value %q", field, value)
	}
	return nil
}

func normalizeBusinessEventSourceStoredConfigDTO(
	config BusinessEventSourceStoredConfigDTO,
) BusinessEventSourceStoredConfigDTO {
	if config.Actions == nil {
		config.Actions = []BusinessEventActionDTO{}
	}
	if config.Statuses == nil {
		config.Statuses = []BusinessStatusStoredDTO{}
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

func normalizeBusinessEventSourceWriteConfigDTO(
	config BusinessEventSourceWriteConfigDTO,
) BusinessEventSourceWriteConfigDTO {
	if config.Actions == nil {
		config.Actions = []BusinessEventActionDTO{}
	}
	if config.Statuses == nil {
		config.Statuses = []BusinessStatusWriteDTO{}
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
		if config.Statuses[index].ID == "" {
			config.Statuses[index].ID = buildBusinessEventConfigItemID(
				"status",
				index,
				config.Statuses[index].Code,
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

func validateBusinessEventSourceStoredConfigDTO(config BusinessEventSourceStoredConfigDTO) error {
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
		if status.Phase != "" {
			if err := requireEnum(
				fmt.Sprintf("config.statuses[%d].phase", index),
				status.Phase,
				allowedBusinessStatusPhases,
			); err != nil {
				return err
			}
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
	input.Config = normalizeBusinessEventSourceWriteConfigDTO(input.Config)
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
	return validateBusinessEventSourceWriteConfigDTO(input.Config)
}

func marshalBusinessEventSourceWriteConfig(
	config BusinessEventSourceWriteConfigDTO,
) (json.RawMessage, error) {
	normalized := normalizeBusinessEventSourceWriteConfigDTO(config)
	if err := validateBusinessEventSourceWriteConfigDTO(normalized); err != nil {
		return nil, err
	}

	raw, err := json.Marshal(normalized)
	if err != nil {
		return nil, err
	}
	return raw, nil
}

func marshalBusinessEventSourceStoredConfig(
	config BusinessEventSourceStoredConfigDTO,
) (json.RawMessage, error) {
	normalized := normalizeBusinessEventSourceStoredConfigDTO(config)
	if err := validateBusinessEventSourceStoredConfigDTO(normalized); err != nil {
		return nil, err
	}

	raw, err := json.Marshal(normalized)
	if err != nil {
		return nil, err
	}
	return raw, nil
}

func unmarshalBusinessEventSourceStoredConfig(
	raw json.RawMessage,
) (BusinessEventSourceStoredConfigDTO, error) {
	if len(raw) == 0 {
		return normalizeBusinessEventSourceStoredConfigDTO(BusinessEventSourceStoredConfigDTO{}), nil
	}

	var config BusinessEventSourceStoredConfigDTO
	if err := json.Unmarshal(raw, &config); err != nil {
		return BusinessEventSourceStoredConfigDTO{}, err
	}

	normalized := normalizeBusinessEventSourceStoredConfigDTO(config)
	if err := validateBusinessEventSourceStoredConfigDTO(normalized); err != nil {
		return BusinessEventSourceStoredConfigDTO{}, err
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

	config, err := marshalBusinessEventSourceWriteConfig(normalized.Config)
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
func hydrateBusinessStatusResponse(
	sourceCode string,
	status BusinessStatusStoredDTO,
) BusinessStatusDTO {
	compatibility := indexBusinessEventSourceCompatibilityStatuses(sourceCode)[status.Code]
	result := BusinessStatusDTO{
		ID:             status.ID,
		Order:          status.Order,
		Code:           status.Code,
		Label:          status.Label,
		Phase:          status.Phase,
		IsTerminal:     status.IsTerminal,
		DefaultResolve: status.DefaultResolve,
	}
	if strings.TrimSpace(result.Label) == "" {
		if strings.TrimSpace(compatibility.Label) != "" {
			result.Label = compatibility.Label
		} else {
			result.Label = result.Code
		}
	}
	if strings.TrimSpace(result.Phase) == "" {
		result.Phase = compatibility.Phase
	}
	if !result.IsTerminal {
		result.IsTerminal = compatibility.IsTerminal
	}
	if !result.DefaultResolve {
		result.DefaultResolve = compatibility.DefaultResolve
	}
	return result
}

func hydrateBusinessEventSourceResponseConfig(
	sourceCode string,
	config BusinessEventSourceStoredConfigDTO,
) BusinessEventSourceResponseConfigDTO {
	config = normalizeBusinessEventSourceStoredConfigDTO(config)
	response := BusinessEventSourceResponseConfigDTO{
		Actions:                  append([]BusinessEventActionDTO{}, config.Actions...),
		Statuses:                 make([]BusinessStatusDTO, 0, len(config.Statuses)),
		Fields:                   append([]BusinessEventFieldDTO{}, config.Fields...),
		DynamicResolvers:         append([]BusinessDynamicResolverDTO{}, config.DynamicResolvers...),
		DefaultActionURLTemplate: config.DefaultActionURLTemplate,
	}
	for _, status := range config.Statuses {
		response.Statuses = append(
			response.Statuses,
			hydrateBusinessStatusResponse(sourceCode, status),
		)
	}
	return response
}

func MapBusinessEventSourceToResponse(
	model models.BusinessEventSource,
) (BusinessEventSourceResponse, error) {
	storedConfig, err := unmarshalBusinessEventSourceStoredConfig(model.Config)
	if err != nil {
		return BusinessEventSourceResponse{}, err
	}
	responseConfig := hydrateBusinessEventSourceResponseConfig(
		strings.TrimSpace(model.Code),
		storedConfig,
	)

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
		Config:      responseConfig,
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
