package handlers

import (
	"encoding/json"
	"testing"
	"xdfc-server/services"
)

func TestUserPermissionsResponseEncodesEmptyCollectionsAsArrays(t *testing.T) {
	for _, testCase := range []struct {
		name string
		view services.UserPermissionsView
	}{
		{name: "account without permissions"},
		{
			name: "explicit permissions without a preset",
			view: services.UserPermissionsView{
				Permissions:            []services.UserPermissionItem{{PermissionID: "menu_purchase"}},
				EffectivePermissionIDs: []string{"menu_purchase"},
			},
		},
	} {
		t.Run(testCase.name, func(t *testing.T) {
			response := buildUserPermissionsResponse(testCase.view)
			encoded, err := json.Marshal(response)
			if err != nil {
				t.Fatalf("encode permissions response: %v", err)
			}
			var fields map[string]json.RawMessage
			if err := json.Unmarshal(encoded, &fields); err != nil {
				t.Fatalf("decode permissions response: %v", err)
			}
			for _, field := range []string{"permissions", "presetPermissions", "effectivePermissions"} {
				if len(fields[field]) == 0 || fields[field][0] != '[' {
					t.Errorf("%s must be a JSON array, got %s", field, fields[field])
				}
			}
			if len(response.Permissions) != len(testCase.view.Permissions) ||
				len(response.EffectivePermissions) != len(testCase.view.EffectivePermissionIDs) {
				t.Fatal("response changed saved permission counts")
			}
		})
	}
}
