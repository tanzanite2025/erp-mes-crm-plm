package authz

import "strings"

var RouteMenuPermissions = map[string]string{
	"/dashboard":                  MenuDashboard,
	"/warehouse":                  MenuWarehouse,
	"/warehouse-config":           MenuWarehouseConfig,
	"/mrp":                        MenuMrp,
	"/raw-materials":              MenuTrading,
	"/trading":                    MenuTrading,
	"/sales-analysis":             MenuTrading,
	"/quotes":                     MenuTrading,
	"/shipping-management":        MenuTrading,
	"/purchase":                   MenuPurchase,
	"/engineering":                MenuEngineering,
	"/materials":                  MenuEngineering,
	"/engineering-db":             MenuEngineering,
	"/engineering-reference":      MenuEngineering,
	"/quality":                    MenuQuality,
	"/production-quality":         MenuQuality,
	"/labs":                       MenuQuality,
	"/experimental":               MenuQuality,
	"/equipment-tooling":          MenuEquipment,
	"/furnaces":                   MenuEquipment,
	"/personnel":                  MenuOrg,
	"/leave-management":           MenuOrg,
	"/hall-of-fame":               MenuOrg,
	"/piecework":                  MenuPiecework,
	"/cutting-operations":         MenuPiecework,
	"/aps-scheduling":             MenuApsScheduling,
	"/production-architecture":    MenuPiecework,
	"/system-management":          MenuSystem,
	"/approval":                   MenuApproval,
	"/basic-settings":             MenuSettings,
	"/sidebar-command-assignment": MenuSettings,
	"/sidebar-command-library":    MenuSettings,
	"/code-center":                MenuCodeCenter,
	"/terminal-config":            MenuSettings,
	"/logistics-config":           MenuSettings,
	"/logistics-settings":         MenuSettings,
	"/finance-management":         MenuSettings,
	"/personal-workbench":         MenuPDA,
	"/pda-shell":                  MenuPDA,
	"/wheel-trace":                MenuProdConfig,
}

func RoutePermissionIDs(routePath string) []string {
	normalizedPath := NormalizeRoutePath(routePath)
	if normalizedPath == "" {
		return nil
	}
	rootPath := RouteRootPath(normalizedPath)
	menuPermissionID := RouteMenuPermissions[rootPath]
	if menuPermissionID == "" {
		return nil
	}

	segments := strings.Split(strings.Trim(normalizedPath, "/"), "/")
	if len(segments) <= 1 {
		pagePermissionID := BuildRoutePermissionID("page", normalizedPath)
		if pagePermissionID == "" {
			return []string{menuPermissionID}
		}
		return DeduplicatePermissionIDs([]string{pagePermissionID, menuPermissionID})
	}

	tabPermissionID := BuildRoutePermissionID("tab", normalizedPath)
	if tabPermissionID == "" {
		return []string{menuPermissionID}
	}
	return []string{tabPermissionID}
}

func NormalizeRoutePath(routePath string) string {
	trimmed := strings.TrimSpace(routePath)
	if trimmed == "" {
		return ""
	}
	if index := strings.IndexAny(trimmed, "?#"); index >= 0 {
		trimmed = trimmed[:index]
	}
	trimmed = strings.ReplaceAll(trimmed, "\\", "/")
	for strings.Contains(trimmed, "//") {
		trimmed = strings.ReplaceAll(trimmed, "//", "/")
	}
	if !strings.HasPrefix(trimmed, "/") {
		trimmed = "/" + trimmed
	}
	trimmed = strings.TrimRight(trimmed, "/")
	if trimmed == "" {
		return "/"
	}
	return trimmed
}

func RouteRootPath(routePath string) string {
	segments := strings.Split(strings.Trim(routePath, "/"), "/")
	if len(segments) == 0 || strings.TrimSpace(segments[0]) == "" {
		return "/dashboard"
	}
	return "/" + segments[0]
}

func BuildRoutePermissionID(kind string, routePath string) string {
	normalizedPath := NormalizeRoutePath(routePath)
	if kind == "page" && normalizedPath == "/" {
		return "page_dashboard_home"
	}
	segments := strings.Split(strings.Trim(normalizedPath, "/"), "/")
	parts := make([]string, 0, len(segments))
	for _, segment := range segments {
		part := strings.Builder{}
		for _, r := range strings.ToLower(segment) {
			if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '_' {
				part.WriteRune(r)
			} else {
				part.WriteByte('_')
			}
		}
		normalized := strings.Trim(part.String(), "_")
		if normalized != "" {
			parts = append(parts, normalized)
		}
	}
	suffix := strings.Trim(strings.Join(parts, "_"), "_")
	if suffix == "" {
		suffix = "root"
	}
	return kind + "_" + suffix
}
