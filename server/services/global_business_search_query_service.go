package services

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"golang.org/x/text/unicode/norm"
	"gorm.io/gorm"
)

var ErrGlobalBusinessSearchSnapshotChanged = errors.New("business search snapshot changed; restart pagination")

const GlobalBusinessSearchCandidateWindowLimit = 100000

type GlobalBusinessSearchPage struct {
	Data                  []GlobalBusinessSearchItem `json:"data"`
	HasMore               bool                       `json:"hasMore"`
	NextOffset            int                        `json:"nextOffset"`
	Generation            string                     `json:"generation"`
	CandidateLimitReached bool                       `json:"candidateLimitReached"`
}

type GlobalBusinessSearchEngineRequest struct {
	Query      string   `json:"q"`
	Categories []string `json:"categories"`
	UserID     string   `json:"user_id"`
	CanManage  bool     `json:"can_manage"`
	Limit      int      `json:"limit"`
	Offset     int      `json:"offset"`
	Generation string   `json:"generation,omitempty"`
}

func globalBusinessSearchDocumentMatchesLiveScope(document SearchDocument, userID string, canManage bool) bool {
	if !document.RestrictedToUsers || canManage {
		return true
	}
	for _, allowedUserID := range document.AllowedUserIDs {
		if userID != "" && allowedUserID == userID {
			return true
		}
	}
	return false
}

func globalBusinessSearchDocumentContainsKeywords(document SearchDocument, query string) bool {
	text := strings.ToLower(norm.NFKC.String(document.Model))
	for _, keyword := range strings.Fields(strings.ToLower(norm.NFKC.String(query))) {
		if !strings.Contains(text, keyword) {
			return false
		}
	}
	return true
}

// Rust filters categories and ownership before pagination. The database recheck
// prevents stale index entries from disclosing deleted or reassigned records.
func SearchGlobalBusinessRecords(searchContext context.Context, database *gorm.DB, client *SearchServiceClient, query, userID string, permissions []string, canManage bool, limit, offset int, generation string) (GlobalBusinessSearchPage, error) {
	page := GlobalBusinessSearchPage{Data: []GlobalBusinessSearchItem{}, NextOffset: offset, Generation: generation}
	sources := map[string]globalBusinessSearchSource{}
	categories := []string{}
	permissionSet := map[string]bool{}
	for _, permission := range permissions {
		permissionSet[permission] = true
	}
	for _, source := range globalBusinessSearchSources {
		allowed := canManage
		for _, permission := range source.requiredPermissions {
			allowed = allowed || permissionSet[permission]
		}
		if allowed {
			sources[source.category] = source
			categories = append(categories, source.category)
		}
	}
	if len(categories) == 0 {
		return page, nil
	}
	if client == nil {
		return page, fmt.Errorf("Rust search client is not initialized")
	}
	// Fetch extra candidates and continue through stale hits until a full page is
	// available. nextOffset refers to consumed Rust hits, not visible result count.
	cursor := offset
	for {
		batchLimit := min(100, GlobalBusinessSearchCandidateWindowLimit-cursor)
		if batchLimit <= 0 {
			return page, fmt.Errorf("business search offset exceeds the candidate window")
		}
		response, err := client.SearchGlobalBusinessIndex(searchContext, GlobalBusinessSearchEngineRequest{
			Query: query, Categories: categories, UserID: userID, CanManage: canManage, Limit: batchLimit, Offset: cursor, Generation: page.Generation,
		})
		if err != nil {
			return page, err
		}
		if response.Generation == "" {
			return page, fmt.Errorf("Rust search returned no snapshot generation")
		}
		if page.Generation != "" && page.Generation != response.Generation {
			return page, ErrGlobalBusinessSearchSnapshotChanged
		}
		page.Generation = response.Generation
		idsByCategory := map[string][]string{}
		for _, hit := range response.Items {
			if _, allowed := sources[hit.Category]; allowed {
				idsByCategory[hit.Category] = append(idsByCategory[hit.Category], hit.ID)
			}
		}
		liveDocuments := map[string]SearchDocument{}
		for category, ids := range idsByCategory {
			documents, err := loadGlobalBusinessSearchSourceDocuments(searchContext, database, sources[category], "", ids, len(ids))
			if err != nil {
				return page, err
			}
			for _, document := range documents {
				liveDocuments[category+":"+document.ID] = document
			}
		}
		for _, hit := range response.Items {
			document, exists := liveDocuments[hit.Category+":"+hit.ID]
			if exists && globalBusinessSearchDocumentMatchesLiveScope(document, userID, canManage) && globalBusinessSearchDocumentContainsKeywords(document, query) {
				if len(page.Data) == limit {
					page.HasMore = true
					page.NextOffset = cursor
					return page, nil
				}
				source := sources[hit.Category]
				item := GlobalBusinessSearchItem{ID: document.ID, Title: document.Name, Code: document.Code, Category: document.Category, ParentTitle: source.parentTitle, Score: hit.Score}
				item.Href = buildGlobalBusinessSearchResultHref(source, item)
				page.Data = append(page.Data, item)
			}
			cursor++
		}
		page.NextOffset = cursor
		if cursor >= GlobalBusinessSearchCandidateWindowLimit {
			page.CandidateLimitReached = response.HasMore
			return page, nil
		}
		if !response.HasMore || len(response.Items) == 0 {
			return page, nil
		}
	}
}
