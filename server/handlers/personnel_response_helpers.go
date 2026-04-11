package handlers

import (
	"time"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
)

func optimisticVersionForResponse(updatedAt, createdAt time.Time) int {
	versionTime := updatedAt
	if versionTime.IsZero() {
		versionTime = createdAt
	}
	if versionTime.IsZero() {
		return 1
	}
	version := versionTime.UnixMilli()
	if version < 1 {
		return 1
	}
	return int(version)
}

func mapEmployeeResponse(employee models.Employee) gin.H {
	return gin.H{
		"id":             employee.ID,
		"staffId":        employee.StaffID,
		"name":           employee.Name,
		"gender":         employee.Gender,
		"birthday":       employee.Birthday,
		"idCard":         employee.IDCard,
		"phone":          employee.Phone,
		"emergencyPhone": employee.EmergencyPhone,
		"address":        employee.Address,
		"bankCard":       employee.BankCard,
		"bankName":       employee.BankName,
		"education":      employee.Education,
		"age":            employee.Age,
		"status":         employee.Status,
		"joinedDate":     employee.JoinedDate,
		"deptId":         employee.DeptID,
		"lineId":         employee.LineID,
		"processId":      employee.ProcessID,
		"deptName":       employee.DeptName,
		"lineName":       employee.LineName,
		"processName":    employee.ProcessName,
		"createdAt":      employee.CreatedAt,
		"updatedAt":      employee.UpdatedAt,
		"version":        optimisticVersionForResponse(employee.UpdatedAt, employee.CreatedAt),
	}
}

func mapEmployeeResponses(employees []models.Employee) []gin.H {
	items := make([]gin.H, 0, len(employees))
	for _, employee := range employees {
		items = append(items, mapEmployeeResponse(employee))
	}
	return items
}

func mapOrganizationResponse(node *models.Organization) gin.H {
	if node == nil {
		return gin.H{}
	}

	response := gin.H{
		"id":                 node.ID,
		"name":               node.Name,
		"parentId":           node.ParentID,
		"manager":            node.Manager,
		"description":        node.Description,
		"type":               node.Type,
		"linkedArchitecture": node.LinkedArchitecture,
		"createdAt":          node.CreatedAt,
		"updatedAt":          node.UpdatedAt,
		"version":            optimisticVersionForResponse(node.UpdatedAt, node.CreatedAt),
	}

	if len(node.Children) > 0 {
		children := make([]gin.H, 0, len(node.Children))
		for _, child := range node.Children {
			children = append(children, mapOrganizationResponse(child))
		}
		response["children"] = children
	}

	return response
}

func mapOrganizationTreeResponse(nodes []*models.Organization) []gin.H {
	items := make([]gin.H, 0, len(nodes))
	for _, node := range nodes {
		items = append(items, mapOrganizationResponse(node))
	}
	return items
}
