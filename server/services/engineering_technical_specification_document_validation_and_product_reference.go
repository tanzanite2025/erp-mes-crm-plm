package services

import (
	"encoding/json"
	"net/url"
	"path"
	"strings"
	"unicode/utf8"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const engineeringTechnicalSpecificationDocumentType = "TECH_SPEC"

func validateAndNormalizeEngineeringTechnicalSpecificationDocument(input *models.EngineeringSpec) error {
	input.Name = strings.TrimSpace(input.Name)
	if input.Name == "" || utf8.RuneCountInString(input.Name) > 100 {
		return domainValidationError("技术规范名称不能为空且不能超过 100 个字符")
	}
	input.ChangeType = strings.TrimSpace(input.ChangeType)
	switch input.ChangeType {
	case "", "MANUAL", "ECO", "ECN":
	default:
		return domainValidationError("技术规范变更类型必须是 MANUAL、ECO 或 ECN")
	}
	payload := map[string]any{}
	if len(input.SpecData) > 0 {
		if err := json.Unmarshal(input.SpecData, &payload); err != nil || payload == nil {
			return domainValidationError("技术规范文档内容必须是对象")
		}
	}
	// Optional fields may be absent, but persisted values must match the read contract.
	for _, field := range []string{"category", "fileUrl", "fileExtension"} {
		if value, exists := payload[field]; exists {
			if _, ok := value.(string); !ok {
				return domainValidationError("技术规范字段 " + field + " 必须是字符串；留空请使用空字符串或省略字段")
			}
		}
	}
	if rawURL, exists := payload["fileUrl"]; exists {
		fileURL := rawURL.(string)
		fileURL = strings.TrimSpace(fileURL)
		if fileURL != "" {
			parsedURL, err := url.Parse(fileURL)
			if err != nil || strings.Contains(fileURL, "\\") || parsedURL.User != nil || !((parsedURL.Scheme == "https" || parsedURL.Scheme == "http") && parsedURL.Host != "" || parsedURL.Scheme == "" && parsedURL.Host == "" && strings.HasPrefix(parsedURL.Path, "/uploads/") && path.Clean(parsedURL.Path) == parsedURL.Path) {
				return domainValidationError("技术规范附件须上传至服务器，不能保存当前电脑的本地或临时文件地址")
			}
		}
		payload["fileUrl"] = fileURL
	}
	// The master record owns identity, revision and concurrency version.
	for _, key := range []string{"id", "code", "version", "createdAt", "revisionNo"} {
		delete(payload, key)
	}
	payload["name"] = input.Name
	payload["description"] = input.Description
	encoded, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	input.SpecData = datatypes.JSON(encoded)
	return nil
}

func assignNewEngineeringTechnicalSpecificationDocumentIdentity(input *models.EngineeringSpec) {
	input.ID = uuid.NewString()
	input.Code = "SPEC-" + strings.ToUpper(strings.ReplaceAll(input.ID, "-", ""))
}

func validateAndLockProductEngineeringTechnicalSpecificationReference(tx *gorm.DB, specificationID string) error {
	if specificationID == "" {
		return nil
	}
	if _, err := uuid.Parse(specificationID); err != nil {
		return domainValidationError("所选工艺规范标识无效，请从工程管理技术规范主库重新选择")
	}
	var specification models.EngineeringSpec
	if err := tx.Clauses(clause.Locking{Strength: "SHARE"}).Where("id = ?", specificationID).First(&specification).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return domainValidationError("所选工艺规范不存在或已删除，请从工程管理技术规范主库重新选择")
		}
		return err
	}
	if specification.Type != engineeringTechnicalSpecificationDocumentType {
		return domainValidationError("绑定工艺只能选择工程管理技术规范主库中的文档")
	}
	return nil
}
