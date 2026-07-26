package handlers

import (
	"testing"
	"xdfc-server/services"
)

func TestAuditModulePermissionMapCoversRegisteredAuditEntities(t *testing.T) {
	for _, registration := range services.GetAuditEntityRegistry() {
		requiredPermissions, ok := auditModulePermissionMap[registration.EntityKey]
		if !ok {
			t.Fatalf("audit module %q is registered but has no permission mapping", registration.EntityKey)
		}
		if len(requiredPermissions) == 0 {
			t.Fatalf("audit module %q has an empty permission mapping", registration.EntityKey)
		}
	}
}
