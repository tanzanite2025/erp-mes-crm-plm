package handlers

import (
	"log"
	"net/http"
	"strings"
	"xdfc-server/authz"
	"xdfc-server/db"
	"xdfc-server/middleware"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

// auditModulePermissionMap maps canonical audit module keys to the menu permissions
// required to access their timeline data. A module must have at least one matching
// permission for the requesting user; unknown modules are denied (fail-closed).
var auditModulePermissionMap = map[string][]string{
	services.AuditModuleSalesOrder:        {authz.MenuTrading},
	services.AuditModulePurchaseOrder:     {authz.MenuTrading, authz.MenuPurchase},
	services.AuditModuleCustomer:          {authz.MenuTrading},
	services.AuditModuleProduct:           {authz.MenuEngineering},
	services.AuditModuleSupplier:          {authz.MenuTrading, authz.MenuPurchase},
	services.AuditModuleDrilling:          {authz.MenuEngineering},
	services.AuditModuleEngineeringSpec:   {authz.MenuEngineering},
	services.AuditModuleEmployee:          {authz.MenuOrg},
	services.AuditModuleMaterial:          {authz.MenuEngineering, authz.MenuTrading, authz.MenuWarehouse},
	services.AuditModuleInventory:         {authz.MenuWarehouse},
	services.AuditModuleShipment:          {authz.MenuWarehouse},
	services.AuditModuleLogistics:         {authz.MenuTrading, authz.MenuPurchase},
	services.AuditModulePackagingAssembly: {authz.MenuWarehouse},
	services.AuditModuleChangeOrder:       {authz.MenuEngineering},
	services.AuditModuleBOM:               {authz.MenuEngineering},
	services.AuditModuleUser:              {authz.TabPersonnelAccounts, authz.TabPersonnelRights, authz.PermissionUserView, authz.PermissionManage},
	services.AuditModuleUserPermission:    {authz.PermissionManage},
	services.AuditModuleRole:              {authz.TabPersonnelRights, authz.PermissionManage},
	services.AuditModuleProductionLine:    {authz.MenuProdConfig, authz.MenuEquipment},
	"Inventory":                           {authz.MenuWarehouse},
	"Shipment":                            {authz.MenuWarehouse},
	"Logistics":                           {authz.MenuTrading, authz.MenuPurchase},
	"PackagingAssembly":                   {authz.MenuWarehouse},
	"InspectionStandard":                  {authz.MenuQuality},
	"InspectionTask":                      {authz.MenuQuality},
}

// enforceAuditModulePermission checks whether the requesting user has permission
// to access audit data for the given module. Returns true if access is granted.
func enforceAuditModulePermission(c *gin.Context, module string) bool {
	canonical := services.NormalizeAuditModule(module)
	if canonical == "" {
		canonical = strings.TrimSpace(module)
	}

	requiredPermissions, ok := auditModulePermissionMap[canonical]
	if !ok {
		// Fail-closed: unknown module → deny access and log for visibility.
		log.Printf("[AUDIT_SECURITY] Denied timeline access for unknown module=%q user=%s ip=%s",
			module, middleware.GetSafeUserID(c), c.ClientIP())
		c.JSON(http.StatusForbidden, gin.H{"error": "[SECURITY] 无权访问该模块的审计数据"})
		return false
	}

	if !middleware.HasAnyPermission(c, requiredPermissions...) {
		log.Printf("[AUDIT_SECURITY] Denied timeline access for module=%q user=%s ip=%s (insufficient permissions)",
			module, middleware.GetSafeUserID(c), c.ClientIP())
		c.JSON(http.StatusForbidden, gin.H{"error": "[SECURITY] 无权访问该模块的审计数据"})
		return false
	}

	return true
}

// GetDataTimelineHandler 获取指定对象的数据时间轴
func GetDataTimelineHandler(c *gin.Context) {
	module := c.Query("module")
	targetID := c.Query("target_id")

	if module == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] module is required"})
		return
	}

	canonicalModule := services.NormalizeAuditModule(module)
	allowModuleLevelQuery := canonicalModule == services.AuditModuleUserPermission || canonicalModule == services.AuditModuleInventory || canonicalModule == services.AuditModuleShipment || canonicalModule == services.AuditModuleLogistics || canonicalModule == services.AuditModulePurchaseOrder || canonicalModule == services.AuditModuleSupplier || canonicalModule == services.AuditModulePackagingAssembly || canonicalModule == services.AuditModuleEngineeringSpec || canonicalModule == services.AuditModuleDrilling || canonicalModule == services.AuditModuleProduct || canonicalModule == services.AuditModuleBOM
	if strings.TrimSpace(targetID) == "" && !allowModuleLevelQuery {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] target_id is required for this module"})
		return
	}

	// [SECURITY] 校验用户是否拥有该审计模块的访问权限
	if !enforceAuditModulePermission(c, module) {
		return
	}

	moduleAliases := services.ExpandAuditModuleAliasesForQuery(module)
	if len(moduleAliases) == 0 {
		moduleAliases = []string{module}
	}

	var logs []models.AuditLog
	query := db.DB.Where("module IN ?", moduleAliases)
	if strings.TrimSpace(targetID) != "" {
		query = query.Where("target_id = ?", targetID)
	}
	if err := query.Order("created_at DESC").Find(&logs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[CRITICAL_DB_ERROR] failed to fetch data timeline: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, logs)
}

func GetAuditEngineStatsHandler(c *gin.Context) {
	stats, err := services.BuildAuditEngineStats(db.DB)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[CRITICAL_DB_ERROR] failed to aggregate audit engine stats: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, stats)
}
