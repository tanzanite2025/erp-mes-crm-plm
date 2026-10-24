package statemachine

import (
	"context"
	"github.com/stretchr/testify/require"
	"testing"
	"xdfc-server/audit"
	"xdfc-server/authz"
)

func TestBOMThreeStateReleaseAndHistoricalStatusPermissions(t *testing.T) {
	for _, current := range []string{"DRAFT", "REVIEWING", "APPROVED"} {
		require.True(t, CanTransitionBOMStatus(current, "RELEASED").Allowed)
		for _, permission := range []string{authz.ActionEngineeringBOMPromote, PermissionBOMRelease, PermissionBOMManage, PermissionManage} {
			ctx := audit.NewContextWithActorAndPermissions(context.Background(), audit.AuditActor{UserID: "release-user"}, []string{permission})
			require.True(t, CanUserPromoteBOMStatus(ctx, current, "RELEASED").Allowed)
		}
		for _, permission := range []string{authz.ActionEngineeringBOMManage, PermissionBOMEdit, PermissionBOMReview, PermissionBOMApprove} {
			ctx := audit.NewContextWithActorAndPermissions(context.Background(), audit.AuditActor{UserID: "non-release-user"}, []string{permission})
			require.False(t, CanUserPromoteBOMStatus(ctx, current, "RELEASED").Allowed)
		}
	}
	require.False(t, CanTransitionBOMStatus("DRAFT", "REVIEWING").Allowed)
	require.False(t, CanTransitionBOMStatus("DRAFT", "APPROVED").Allowed)
	require.False(t, CanTransitionBOMStatus("REVIEWING", "APPROVED").Allowed)
	require.True(t, CanTransitionBOMStatus("RELEASED", "OBSOLETE").Allowed)
	require.False(t, CanTransitionBOMStatus("OBSOLETE", "DRAFT").Allowed)
}
