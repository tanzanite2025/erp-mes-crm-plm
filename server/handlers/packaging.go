package handlers

import (
	"errors"
	"net/http"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgconn"
	"gorm.io/gorm"
)

var (
	errPackagingRuleMaterialMissing   = errors.New("packaging rule material missing")
	errPackagingRuleDuplicateMaterial = errors.New("packaging rule duplicate material")
	errPackagingRuleNotFound          = errors.New("packaging rule not found")
)

// GetPackagingRulesHandler 获取包装换算规则
func GetPackagingRulesHandler(c *gin.Context) {
	materialID := c.Query("materialId")
	var rules []models.PackagingRule
	query := db.DB.Order("updated_at desc")

	if materialID != "" {
		query = query.Where("material_id = ?", materialID)
	}

	if err := query.Find(&rules).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取包装规则失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, rules)
}

func packagingRuleConflictResponse(c *gin.Context) {
	c.JSON(http.StatusConflict, gin.H{
		"error": "[BUSINESS_RULE_VIOLATION] 同一物料仅允许存在一条拼装换算规则",
		"code":  "PACKAGING_RULE_DUPLICATE_MATERIAL",
	})
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == "23505"
	}
	return false
}

// SavePackagingRuleHandler 新增或更新包装规则
func SavePackagingRuleHandler(c *gin.Context) {
	var input models.PackagingRule
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 包装规则数据格式错误: " + err.Error()})
		return
	}

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		var material models.Material
		if err := tx.Where("id = ?", input.MaterialID).First(&material).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errPackagingRuleMaterialMissing
			}
			return err
		}

		var conflict models.PackagingRule
		conflictQuery := tx.Where("material_id = ?", input.MaterialID)
		if input.ID != "" {
			conflictQuery = conflictQuery.Where("id <> ?", input.ID)
		}
		if err := conflictQuery.First(&conflict).Error; err == nil {
			return errPackagingRuleDuplicateMaterial
		} else if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}

		if input.ID != "" {
			var existing models.PackagingRule
			if err := tx.Where("id = ?", input.ID).First(&existing).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					return errPackagingRuleNotFound
				}
				return err
			}
			if err := tx.Model(&existing).Select("*").Updates(input).Error; err != nil {
				if isUniqueViolation(err) {
					return errPackagingRuleDuplicateMaterial
				}
				return err
			}
			return tx.Where("id = ?", existing.ID).First(&input).Error
		}

		if err := tx.Create(&input).Error; err != nil {
			if isUniqueViolation(err) {
				return errPackagingRuleDuplicateMaterial
			}
			return err
		}
		return nil
	})

	if err != nil {
		switch err {
		case errPackagingRuleMaterialMissing:
			c.JSON(http.StatusNotFound, gin.H{"error": "[CRITICAL] 关联物料不存在: " + input.MaterialID})
			return
		case errPackagingRuleDuplicateMaterial:
			packagingRuleConflictResponse(c)
			return
		case errPackagingRuleNotFound:
			c.JSON(http.StatusNotFound, gin.H{"error": "[NOT_FOUND] 包装换算规则不存在: " + input.ID})
			return
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 保存包装规则失败: " + err.Error()})
			return
		}
	}

	c.JSON(http.StatusOK, input)
}

// DeletePackagingRuleHandler 删除包装换算规则
func DeletePackagingRuleHandler(c *gin.Context) {
	id := c.Param("id")
	if err := db.DB.Delete(&models.PackagingRule{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 删除包装规则失败: " + err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}
