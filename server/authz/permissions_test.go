package authz

import "testing"

func TestAdminFallbackPermissionsIncludeSystemWorkflowActions(t *testing.T) {
	permissionSet := make(map[string]struct{}, len(AdminFallbackPermissions))
	for _, permissionID := range AdminFallbackPermissions {
		permissionSet[permissionID] = struct{}{}
	}

	if _, ok := permissionSet[ActionSystemWorkflowManage]; !ok {
		t.Fatalf("admin fallback permissions missing %s", ActionSystemWorkflowManage)
	}
	if _, ok := permissionSet[ActionSystemWorkflowReview]; !ok {
		t.Fatalf("admin fallback permissions missing %s", ActionSystemWorkflowReview)
	}
}
