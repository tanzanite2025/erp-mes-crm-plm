package handlers

import (
	"net/http"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func GetOrgTreeHandler(c *gin.Context) {
	tree, err := services.ListOrganizationTree()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch organization tree"})
		return
	}
	c.JSON(http.StatusOK, tree)
}

func SaveOrgHandler(c *gin.Context) {
	var input models.Organization
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid organization payload"})
		return
	}

	organization, err := services.SaveOrganization(input)
	if err != nil {
		if err == services.ErrOrganizationNameConflict {
			c.JSON(http.StatusConflict, gin.H{"error": "Organization name already exists under the same parent"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save organization"})
		return
	}

	c.JSON(http.StatusOK, organization)
}

func DeleteOrgHandler(c *gin.Context) {
	id := c.Param("id")

	err := services.DeleteOrganization(id)
	if err != nil {
		if err == services.ErrOrganizationHasChildren {
			c.JSON(http.StatusConflict, gin.H{"error": "Cannot delete organization with child departments"})
			return
		}
		if err == services.ErrOrganizationHasEmployees {
			c.JSON(http.StatusConflict, gin.H{"error": "Cannot delete organization with active employees"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete organization"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Deleted successfully"})
}
