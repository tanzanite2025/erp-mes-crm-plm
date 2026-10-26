package handlers

import (
	"context"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"
	"xdfc-server/authz"
	"xdfc-server/db"
	"xdfc-server/middleware"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"golang.org/x/text/unicode/norm"
)

func GlobalSearchHandler(c *gin.Context) {
	query := strings.TrimSpace(norm.NFKC.String(c.Query("q")))
	if query == "" {
		c.JSON(http.StatusOK, services.GlobalBusinessSearchPage{Data: []services.GlobalBusinessSearchItem{}})
		return
	}
	if utf8.RuneCountInString(query) > 200 || len(strings.Fields(query)) > 8 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "search supports up to 200 characters and 8 keywords"})
		return
	}
	limit, err := strconv.Atoi(c.DefaultQuery("limit", "30"))
	if err != nil || limit < 1 || limit > 100 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "limit must be between 1 and 100"})
		return
	}
	offset, err := strconv.Atoi(c.DefaultQuery("offset", "0"))
	if err != nil || offset < 0 || offset >= services.GlobalBusinessSearchCandidateWindowLimit {
		c.JSON(http.StatusBadRequest, gin.H{"error": "offset exceeds the business search candidate window"})
		return
	}
	generation := c.Query("generation")
	if len(generation) > 128 || (offset > 0 && generation == "") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "continuing search requires its snapshot generation"})
		return
	}
	searchContext, cancelSearch := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancelSearch()
	page, err := services.SearchGlobalBusinessRecords(searchContext, db.DB, services.GlobalSearchClient, query,
		middleware.GetSafeUserID(c), middleware.GetUserPermissions(c), middleware.HasAnyPermission(c, authz.PermissionManage), limit, offset, generation)
	if c.Request.Context().Err() != nil {
		// The browser discarded this query. Its cancellation is not a sidecar outage.
		return
	}
	if err != nil {
		if errors.Is(err, services.ErrGlobalBusinessSearchSnapshotChanged) {
			c.JSON(http.StatusConflict, gin.H{"error": "search results changed; restart pagination", "code": "GLOBAL_SEARCH_SNAPSHOT_CHANGED"})
			return
		}
		log.Printf("[SEARCH_ERROR] Rust business search unavailable: %v", err)
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "business search is unavailable or rebuilding; please retry"})
		return
	}
	c.JSON(http.StatusOK, page)
}
