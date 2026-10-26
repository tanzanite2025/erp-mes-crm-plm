package services

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"xdfc-server/authz"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func TestGlobalBusinessSearchStopsStaleHydrationAtTheCandidateWindowAndReportsRemainingMatches(t *testing.T) {
	for _, stale := range []bool{false, true} {
		for _, moreMatches := range []bool{false, true} {
			database := createIsolatedGlobalBusinessSearchDatabase(t)
			materialID := uuid.NewString()
			if !stale {
				require.NoError(t, database.Exec(`INSERT INTO materials (id, code, name) VALUES (?, 'MAT-LAST', '末尾物料')`, materialID).Error)
			}
			requests := 0
			engine := httptest.NewServer(http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
				requests++
				var query GlobalBusinessSearchEngineRequest
				require.NoError(t, json.NewDecoder(request.Body).Decode(&query))
				require.Equal(t, GlobalBusinessSearchCandidateWindowLimit-1, query.Offset)
				require.Equal(t, 1, query.Limit, "the last batch must fit inside the Rust candidate window")
				require.NoError(t, json.NewEncoder(response).Encode(SearchResponse{
					Items:   []GlobalBusinessSearchEngineHit{{ID: materialID, Category: "material"}},
					HasMore: moreMatches, Generation: "boundary-snapshot",
				}))
			}))
			page, err := SearchGlobalBusinessRecords(context.Background(), database,
				&SearchServiceClient{BaseURL: engine.URL, HTTPClient: engine.Client()},
				"MAT", uuid.NewString(), []string{authz.MenuWarehouse}, false, 30, GlobalBusinessSearchCandidateWindowLimit-1, "boundary-snapshot")
			engine.Close()
			require.NoError(t, err)
			require.Equal(t, 1, requests, "stale hits must not cause an out-of-range Rust request")
			require.False(t, page.HasMore)
			require.Equal(t, GlobalBusinessSearchCandidateWindowLimit, page.NextOffset)
			require.Equal(t, moreMatches, page.CandidateLimitReached)
			if stale {
				require.Empty(t, page.Data)
			} else {
				require.Len(t, page.Data, 1)
			}
		}
	}
}

func TestGlobalBusinessSearchRequiresApprovalReadPermissionBeforeContactingTheSidecar(t *testing.T) {
	page, err := SearchGlobalBusinessRecords(context.Background(), nil, nil,
		"审批", uuid.NewString(), []string{authz.ActionApprovalReview}, false, 30, 0, "")
	require.NoError(t, err)
	require.Empty(t, page.Data, "reviewing an approval does not grant access to the approval list")
}
