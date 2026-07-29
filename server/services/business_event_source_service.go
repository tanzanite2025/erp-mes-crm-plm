package services

import (
	"encoding/json"
	"errors"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

var ErrBusinessEventSourceNotFound = errors.New("business event source not found")

type defaultBusinessEventSourceSeed struct {
	ID          string
	Code        string
	Name        string
	Module      string
	Entity      string
	Enabled     bool
	Description string
	Config      json.RawMessage
}

var defaultBusinessEventSourceSeeds = []defaultBusinessEventSourceSeed{
	{
		ID:          "11111111-1111-1111-1111-111111111111",
		Code:        "SALES_ORDER",
		Name:        "销售订单",
		Module:      "Trading",
		Entity:      "ORDER",
		Enabled:     true,
		Description: "销售订单创建、状态变更、完成和作废等生命周期事件。",
		Config:      defaultSalesOrderEventSourceConfig(),
	},
	{
		ID:          "22222222-2222-2222-2222-222222222222",
		Code:        "PURCHASE_ORDER",
		Name:        "采购订单",
		Module:      "Trading",
		Entity:      "ORDER",
		Enabled:     true,
		Description: "采购订单创建、下达、待收货、收货和取消等生命周期事件。",
		Config:      defaultPurchaseOrderEventSourceConfig(),
	},
	{
		ID:          "33333333-3333-3333-3333-333333333333",
		Code:        "PRODUCTION_TASK",
		Name:        "生产任务",
		Module:      "Production",
		Entity:      "SYSTEM",
		Enabled:     true,
		Description: "生产任务围绕待执行、执行中、挂起和完工等真实任务状态事件。",
		Config:      defaultProductionTaskEventSourceConfig(),
	},
	{
		ID:          "44444444-4444-4444-4444-444444444444",
		Code:        "PRODUCTION_PLAN",
		Name:        "生产计划",
		Module:      "Production",
		Entity:      "SYSTEM",
		Enabled:     true,
		Description: "生产计划围绕已排产、生产中、计划完成和取消等主计划状态事件。",
		Config:      defaultProductionPlanEventSourceConfig(),
	},
	{
		ID:          "55555555-5555-5555-5555-555555555555",
		Code:        "PRODUCTION_OPERATION",
		Name:        "生产扫码执行",
		Module:      "Production",
		Entity:      "SYSTEM",
		Enabled:     true,
		Description: "产品一维码扫码触发开始、完成、挂起、返工等工序执行状态事件。",
		Config:      defaultProductionOperationEventSourceConfig(),
	},
	{
		ID:          "66666666-6666-6666-6666-666666666666",
		Code:        "PRODUCTION_OUTSOURCE",
		Name:        "委外执行",
		Module:      "Production",
		Entity:      "SYSTEM",
		Enabled:     true,
		Description: "委外下达、发出、退回和检验处置等执行事实事件。",
		Config:      defaultProductionOutsourceEventSourceConfig(),
	},
}

func ensureBusinessEventSourceIdentityImmutable(
	existing models.BusinessEventSource,
	patch models.BusinessEventSource,
) error {
	if strings.TrimSpace(patch.Code) != strings.TrimSpace(existing.Code) {
		return errors.New("business event source code is immutable after creation")
	}
	if strings.TrimSpace(patch.Module) != strings.TrimSpace(existing.Module) {
		return errors.New("business event source module is immutable after creation")
	}
	if strings.TrimSpace(patch.Entity) != strings.TrimSpace(existing.Entity) {
		return errors.New("business event source entity is immutable after creation")
	}

	existingConfig, err := unmarshalBusinessEventSourceStoredConfig(existing.Config)
	if err != nil {
		return err
	}
	patchConfig, err := unmarshalBusinessEventSourceStoredConfig(patch.Config)
	if err != nil {
		return err
	}

	existingActionCodes := make(map[string]BusinessEventActionDTO, len(existingConfig.Actions))
	for _, action := range existingConfig.Actions {
		existingActionCodes[action.ID] = action
	}
	patchActionIDs := make(map[string]struct{}, len(patchConfig.Actions))
	for _, action := range patchConfig.Actions {
		patchActionIDs[action.ID] = struct{}{}
		if existingAction, ok := existingActionCodes[action.ID]; ok {
			if existingAction.Code != action.Code {
				return errors.New("business event action code is immutable after creation")
			}
			if existingAction.Kind != action.Kind {
				return errors.New("business event action kind is immutable after creation")
			}
		}
	}
	for _, action := range existingConfig.Actions {
		if _, ok := patchActionIDs[action.ID]; !ok {
			return errors.New("business event action is immutable and cannot be deleted after creation")
		}
	}

	existingStatusCodes := make(map[string]BusinessStatusStoredDTO, len(existingConfig.Statuses))
	for _, status := range existingConfig.Statuses {
		existingStatusCodes[status.ID] = status
	}
	patchStatusIDs := make(map[string]struct{}, len(patchConfig.Statuses))
	for _, status := range patchConfig.Statuses {
		patchStatusIDs[status.ID] = struct{}{}
		if existingStatus, ok := existingStatusCodes[status.ID]; ok {
			if existingStatus.Code != status.Code {
				return errors.New("business event status code is immutable after creation")
			}
			if strings.TrimSpace(status.Phase) != "" && existingStatus.Phase != status.Phase {
				return errors.New("business event status phase is immutable after creation")
			}
		}
	}
	for _, status := range existingConfig.Statuses {
		if _, ok := patchStatusIDs[status.ID]; !ok {
			return errors.New("business event status is immutable and cannot be deleted after creation")
		}
	}

	existingFieldIdentity := make(map[string]BusinessEventFieldDTO, len(existingConfig.Fields))
	for _, field := range existingConfig.Fields {
		existingFieldIdentity[field.ID] = field
	}
	patchFieldIDs := make(map[string]struct{}, len(patchConfig.Fields))
	for _, field := range patchConfig.Fields {
		patchFieldIDs[field.ID] = struct{}{}
		if existingField, ok := existingFieldIdentity[field.ID]; ok {
			if existingField.Key != field.Key {
				return errors.New("business event field key is immutable after creation")
			}
			if existingField.Path != field.Path {
				return errors.New("business event field path is immutable after creation")
			}
			if existingField.Type != field.Type {
				return errors.New("business event field type is immutable after creation")
			}
		}
	}
	for _, field := range existingConfig.Fields {
		if _, ok := patchFieldIDs[field.ID]; !ok {
			return errors.New("business event field is immutable and cannot be deleted after creation")
		}
	}

	existingResolverIdentity := make(map[string]BusinessDynamicResolverDTO, len(existingConfig.DynamicResolvers))
	for _, resolver := range existingConfig.DynamicResolvers {
		existingResolverIdentity[resolver.ID] = resolver
	}
	patchResolverIDs := make(map[string]struct{}, len(patchConfig.DynamicResolvers))
	for _, resolver := range patchConfig.DynamicResolvers {
		patchResolverIDs[resolver.ID] = struct{}{}
		if existingResolver, ok := existingResolverIdentity[resolver.ID]; ok {
			if existingResolver.Code != resolver.Code {
				return errors.New("business event resolver code is immutable after creation")
			}
			if existingResolver.Path != resolver.Path {
				return errors.New("business event resolver path is immutable after creation")
			}
			if existingResolver.Type != resolver.Type {
				return errors.New("business event resolver type is immutable after creation")
			}
		}
	}
	for _, resolver := range existingConfig.DynamicResolvers {
		if _, ok := patchResolverIDs[resolver.ID]; !ok {
			return errors.New("business event resolver is immutable and cannot be deleted after creation")
		}
	}

	return nil
}

func mergeBusinessEventActionsByID(existing, defaults []BusinessEventActionDTO) []BusinessEventActionDTO {
	seen := make(map[string]struct{}, len(existing))
	result := append([]BusinessEventActionDTO{}, existing...)
	for _, item := range existing {
		seen[item.ID] = struct{}{}
		seen["code:"+item.Code] = struct{}{}
	}
	for _, item := range defaults {
		if _, ok := seen[item.ID]; ok {
			continue
		}
		if _, ok := seen["code:"+item.Code]; !ok {
			result = append(result, item)
		}
	}
	return result
}

func mergeBusinessStatusesByID(
	existing, defaults []BusinessStatusStoredDTO,
) []BusinessStatusStoredDTO {
	seen := make(map[string]struct{}, len(existing))
	result := append([]BusinessStatusStoredDTO{}, existing...)
	for _, item := range existing {
		seen[item.ID] = struct{}{}
		seen["code:"+item.Code] = struct{}{}
	}
	for _, item := range defaults {
		if _, ok := seen[item.ID]; ok {
			continue
		}
		if _, ok := seen["code:"+item.Code]; !ok {
			result = append(result, item)
		}
	}
	return result
}

func mergeBusinessEventFieldsByID(existing, defaults []BusinessEventFieldDTO) []BusinessEventFieldDTO {
	seen := make(map[string]struct{}, len(existing))
	result := append([]BusinessEventFieldDTO{}, existing...)
	for _, item := range existing {
		seen[item.ID] = struct{}{}
		seen["key:"+item.Key] = struct{}{}
	}
	for _, item := range defaults {
		if _, ok := seen[item.ID]; ok {
			continue
		}
		if _, ok := seen["key:"+item.Key]; !ok {
			result = append(result, item)
		}
	}
	return result
}

func mergeBusinessDynamicResolversByID(existing, defaults []BusinessDynamicResolverDTO) []BusinessDynamicResolverDTO {
	seen := make(map[string]struct{}, len(existing))
	result := append([]BusinessDynamicResolverDTO{}, existing...)
	for _, item := range existing {
		seen[item.ID] = struct{}{}
		seen["code:"+item.Code] = struct{}{}
	}
	for _, item := range defaults {
		if _, ok := seen[item.ID]; ok {
			continue
		}
		if _, ok := seen["code:"+item.Code]; !ok {
			result = append(result, item)
		}
	}
	return result
}

func backfillDefaultBusinessEventSourceConfig(existing models.BusinessEventSource, seed defaultBusinessEventSourceSeed) error {
	existingConfig, err := unmarshalBusinessEventSourceStoredConfig(existing.Config)
	if err != nil {
		return err
	}
	defaultConfig, err := unmarshalBusinessEventSourceStoredConfig(seed.Config)
	if err != nil {
		return err
	}

	merged := existingConfig
	merged.Actions = mergeBusinessEventActionsByID(existingConfig.Actions, defaultConfig.Actions)
	merged.Statuses = mergeBusinessStatusesByID(existingConfig.Statuses, defaultConfig.Statuses)
	merged.Fields = mergeBusinessEventFieldsByID(existingConfig.Fields, defaultConfig.Fields)
	merged.DynamicResolvers = mergeBusinessDynamicResolversByID(existingConfig.DynamicResolvers, defaultConfig.DynamicResolvers)
	if strings.TrimSpace(merged.DefaultActionURLTemplate) == "" {
		merged.DefaultActionURLTemplate = defaultConfig.DefaultActionURLTemplate
	}

	mergedRaw, err := marshalBusinessEventSourceStoredConfig(merged)
	if err != nil {
		return err
	}
	if string(mergedRaw) == string(existing.Config) {
		return nil
	}
	return db.DB.Model(&existing).Update("config", mergedRaw).Error
}

func EnsureDefaultBusinessEventSources() error {
	if db.DB == nil || !db.DB.Migrator().HasTable(&models.BusinessEventSource{}) {
		return nil
	}

	// 一次性清理：把历史上软删除的事件源硬删掉，让 code 重新可用。
	// 现在 DeleteBusinessEventSource 已改为硬删除，但旧数据仍可能残留。
	if err := db.DB.Unscoped().
		Where("deleted_at IS NOT NULL").
		Delete(&models.BusinessEventSource{}).Error; err != nil {
		return err
	}

	for _, seed := range defaultBusinessEventSourceSeeds {
		var existing models.BusinessEventSource
		err := db.DB.Where("code = ?", seed.Code).First(&existing).Error
		if err == nil {
			if err := backfillDefaultBusinessEventSourceConfig(existing, seed); err != nil {
				return err
			}
			continue
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}

		if err := db.DB.Create(&models.BusinessEventSource{
			BaseModel:   models.BaseModel{ID: seed.ID},
			Code:        seed.Code,
			Name:        seed.Name,
			Module:      seed.Module,
			Entity:      seed.Entity,
			Enabled:     seed.Enabled,
			Description: seed.Description,
			Config:      seed.Config,
		}).Error; err != nil {
			return err
		}
	}

	return nil
}

func ListBusinessEventSources() ([]models.BusinessEventSource, error) {
	if err := EnsureDefaultBusinessEventSources(); err != nil {
		return nil, err
	}

	var sources []models.BusinessEventSource
	if err := db.DB.Order("module asc").Order("name asc").Find(&sources).Error; err != nil {
		return nil, err
	}
	return sources, nil
}

func CreateBusinessEventSource(source models.BusinessEventSource) (models.BusinessEventSource, error) {
	source.Code = strings.TrimSpace(source.Code)
	source.Name = strings.TrimSpace(source.Name)
	source.Module = strings.TrimSpace(source.Module)
	source.Entity = strings.TrimSpace(source.Entity)
	source.Description = strings.TrimSpace(source.Description)

	if source.Code == "" {
		return models.BusinessEventSource{}, errors.New("business event source code is required")
	}
	if source.Name == "" {
		return models.BusinessEventSource{}, errors.New("business event source name is required")
	}
	if source.Module == "" {
		return models.BusinessEventSource{}, errors.New("business event source module is required")
	}
	if source.Entity == "" {
		return models.BusinessEventSource{}, errors.New("business event source entity is required")
	}
	if len(source.Config) == 0 {
		source.Config = json.RawMessage(`{"actions":[],"statuses":[],"fields":[],"dynamicResolvers":[],"defaultActionUrlTemplate":""}`)
	}
	if err := db.DB.Create(&source).Error; err != nil {
		return models.BusinessEventSource{}, err
	}
	return source, nil
}

func UpdateBusinessEventSource(id string, patch models.BusinessEventSource) (models.BusinessEventSource, error) {
	id = strings.TrimSpace(id)

	var existing models.BusinessEventSource
	if err := db.DB.Where("id = ?", id).First(&existing).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return models.BusinessEventSource{}, ErrBusinessEventSourceNotFound
		}
		return models.BusinessEventSource{}, err
	}

	if err := ensureBusinessEventSourceIdentityImmutable(existing, patch); err != nil {
		return models.BusinessEventSource{}, err
	}

	updates := map[string]interface{}{
		"name":        strings.TrimSpace(patch.Name),
		"enabled":     patch.Enabled,
		"description": strings.TrimSpace(patch.Description),
		"config":      patch.Config,
	}

	if updates["name"] == "" {
		updates["name"] = existing.Name
	}
	if len(patch.Config) == 0 {
		updates["config"] = existing.Config
	}

	if err := db.DB.Model(&existing).Updates(updates).Error; err != nil {
		return models.BusinessEventSource{}, err
	}
	if err := db.DB.First(&existing, "id = ?", id).Error; err != nil {
		return models.BusinessEventSource{}, err
	}
	return existing, nil
}

func DeleteBusinessEventSource(id string) error {
	id = strings.TrimSpace(id)
	// 硬删除：业务事件源 code 受 unique 索引约束，软删除会让 code 永久占用，
	// 导致用户删除后无法再用同一 code 重建。审计已由 rule-execution-logs 单独承载。
	return db.DB.Unscoped().Where("id = ?", id).Delete(&models.BusinessEventSource{}).Error
}
