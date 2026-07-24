package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
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
	var input OrganizationSaveHandlerRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid organization payload"})
		return
	}

	organization, err := services.SaveOrganization(auditContextFromGin(c), mapOrganizationSaveHandlerRequestToService(input))
	if err != nil {
		if err == services.ErrOrganizationNameConflict {
			c.JSON(http.StatusConflict, gin.H{"error": "Organization name already exists under the same parent"})
			return
		}
		if err == services.ErrOrganizationNameRequired {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Organization name is required"})
			return
		}
		if err == services.ErrOrganizationIDInvalid {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Organization id is invalid"})
			return
		}
		if err == services.ErrOrganizationParentIDInvalid {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Organization parent id is invalid"})
			return
		}
		if err == services.ErrOrganizationParentNotFound {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Organization parent does not exist"})
			return
		}
		if err == services.ErrOrganizationHierarchyInvalid {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Organization hierarchy is invalid for the selected parent"})
			return
		}
		if err == services.ErrOrganizationDepthExceeded {
			c.JSON(http.StatusConflict, gin.H{"error": "Organization depth exceeds the supported three levels"})
			return
		}
		if err == services.ErrOrganizationLinkedArchitectureInvalid {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Organization linked architecture is invalid"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save organization"})
		return
	}

	if loadedTree, err := services.ListOrganizationTree(); err == nil {
		for _, node := range loadedTree {
			if response := findOrganizationResponse(node, organization.ID); response != nil {
				c.JSON(http.StatusOK, response)
				return
			}
		}
	}

	c.JSON(http.StatusOK, mapOrganizationSaveServiceResponseToResponse(organization))
}

func PatchOrgHandler(c *gin.Context) {
	id := c.Param("id")
	var req services.SDRTSDeltaHandlerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid organization patch payload"})
		return
	}
	if err := validateSupportedTopLevelDeltaKeys(req.Delta, "name", "parentId", "manager", "description", "type", "linkedArchitecture"); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid organization delta: " + err.Error()})
		return
	}

	patch := services.PatchOrganizationRequest{
		ID:              id,
		ExpectedVersion: int(req.Metadata.Version),
		DeltaKeys:       servicesDeltaKeys(req.Delta),
	}
	for key, raw := range req.Delta {
		valueRaw, err := extractDeltaNewValue(raw)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid organization delta payload: " + err.Error()})
			return
		}

		switch key {
		case "name":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid organization name payload"})
				return
			}
			patch.Name = &value
		case "parentId":
			patch.ParentIDSet = true
			if string(valueRaw) == "null" {
				patch.ParentID = nil
				continue
			}
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid organization parentId payload"})
				return
			}
			value = strings.TrimSpace(value)
			if value == "" {
				patch.ParentID = nil
			} else {
				patch.ParentID = &value
			}
		case "manager":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid organization manager payload"})
				return
			}
			patch.Manager = &value
		case "description":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid organization description payload"})
				return
			}
			patch.Description = &value
		case "type":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid organization type payload"})
				return
			}
			patch.Type = &value
		case "linkedArchitecture":
			patch.LinkedArchitecture = append(json.RawMessage(nil), valueRaw...)
			patch.LinkedArchitectureSet = true
		}
	}

	refreshed, err := services.PatchOrganization(auditContextFromGin(c), patch)
	if err != nil {
		if errors.Is(err, services.ErrOrganizationPatchVersionConflict) {
			respondVersionConflict(c)
			return
		}
		switch err {
		case services.ErrOrganizationNameConflict:
			c.JSON(http.StatusConflict, gin.H{"error": "Organization name already exists under the same parent"})
			return
		case services.ErrOrganizationParentNotFound:
			c.JSON(http.StatusBadRequest, gin.H{"error": "Organization parent does not exist"})
			return
		case services.ErrOrganizationHierarchyInvalid:
			c.JSON(http.StatusBadRequest, gin.H{"error": "Organization hierarchy is invalid for the selected parent"})
			return
		case services.ErrOrganizationDepthExceeded:
			c.JSON(http.StatusConflict, gin.H{"error": "Organization depth exceeds the supported three levels"})
			return
		}
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "organization not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to patch organization"})
		return
	}

	c.JSON(http.StatusOK, refreshed)
}

func findOrganizationResponse(node services.OrganizationTreeNodeResponse, targetID string) *services.OrganizationTreeNodeResponse {
	if node.ID == targetID {
		response := node
		return &response
	}
	for _, child := range node.Children {
		if found := findOrganizationResponse(child, targetID); found != nil {
			return found
		}
	}
	return nil
}

func DeleteOrgHandler(c *gin.Context) {
	id := c.Param("id")

	err := services.DeleteOrganization(auditContextFromGin(c), id)
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
