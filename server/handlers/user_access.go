package handlers

import (
	"errors"
	"net/http"
	"strings"
	"xdfc-server/db"
	"xdfc-server/dependencies"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func GetUserAccessSnapshotHandler(c *gin.Context) {
	userID := strings.TrimSpace(c.Param("id"))
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] user id is required"})
		return
	}

	snapshot, err := dependencies.NewIdentityAccessServiceWithDB(db.DB).ResolveSnapshotByUserID(userID)
	if err != nil {
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		case errors.Is(err, gorm.ErrInvalidDB):
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to resolve user access"})
			return
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to resolve user access"})
			return
		}
	}

	c.JSON(http.StatusOK, snapshot)
}
