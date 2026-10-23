package services

import (
	"reflect"
	"sort"
	"xdfc-server/audit"
	"xdfc-server/models"

	"gorm.io/gorm"
)

// Snapshot business definitions, excluding binding row IDs recreated on every save.
func mapProductPhysicalSpecificationTemplateAuditSnapshot(template *models.ProductTemplate) map[string]any {
	if template == nil {
		return map[string]any{}
	}
	definitions := append([]models.ProductTemplateAttributeBinding(nil), template.AttributeBindings...)
	sort.Slice(definitions, func(i, j int) bool {
		if definitions[i].SortOrder == definitions[j].SortOrder {
			return definitions[i].CategoryKey < definitions[j].CategoryKey
		}
		return definitions[i].SortOrder < definitions[j].SortOrder
	})
	attributes := make([]map[string]any, 0, len(definitions))
	for _, definition := range definitions {
		options := append([]models.ProductTemplateAttributeOptionDefinition(nil), definition.Options...)
		sort.Slice(options, func(i, j int) bool {
			if options[i].SortOrder == options[j].SortOrder {
				return options[i].Value < options[j].Value
			}
			return options[i].SortOrder < options[j].SortOrder
		})
		attributes = append(attributes, map[string]any{
			"categoryKey": definition.CategoryKey,
			"nameZh":      definition.NameZh, "nameEn": definition.NameEn,
			"description": definition.Description, "required": definition.Required,
			"active": definition.Active, "sortOrder": definition.SortOrder,
			"options": options,
		})
	}
	return map[string]any{
		"name": template.Name, "code": template.Code,
		"componentKey": template.ComponentKey, "description": template.Description,
		"active": template.Active, "version": template.Version,
		"attributeBindings": attributes,
	}
}

func recordProductPhysicalSpecificationTemplateAuditEventWithinTransaction(
	transaction *gorm.DB,
	action audit.AuditAction,
	previous *models.ProductTemplate,
	next *models.ProductTemplate,
) error {
	target := next
	if target == nil {
		target = previous
	}
	actor, _ := audit.ActorFromContext(transaction.Statement.Context)
	event := audit.NewAuditEvent(audit.AuditEntityProductTemplate, target.ID, action, actor)
	before := mapProductPhysicalSpecificationTemplateAuditSnapshot(previous)
	after := mapProductPhysicalSpecificationTemplateAuditSnapshot(next)
	fieldSet := make(map[string]bool)
	for field := range before {
		fieldSet[field] = true
	}
	for field := range after {
		fieldSet[field] = true
	}
	fields := make([]string, 0, len(fieldSet))
	for field := range fieldSet {
		fields = append(fields, field)
	}
	sort.Strings(fields)
	for _, field := range fields {
		// Keep the historical name in every event, including after deletion or rename.
		if field != "name" && reflect.DeepEqual(before[field], after[field]) {
			continue
		}
		event = event.WithChanges(audit.AuditChange{
			Field: field, OldValue: before[field], NewValue: after[field], Label: field,
		})
	}
	return recordAuditEventTx(transaction, event)
}
