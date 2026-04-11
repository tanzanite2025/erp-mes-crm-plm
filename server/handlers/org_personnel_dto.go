package handlers

import (
	"encoding/json"
	"time"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

type OrganizationSaveHandlerRequest struct {
	ID                 string          `json:"id"`
	Name               string          `json:"name"`
	ParentID           *string         `json:"parentId"`
	Manager            string          `json:"manager"`
	Description        string          `json:"description"`
	Type               string          `json:"type"`
	LinkedArchitecture json.RawMessage `json:"linkedArchitecture"`
}

type BulkSyncOrganizationHandlerRequest struct {
	ID                 string          `json:"id"`
	Name               string          `json:"name"`
	ParentID           *string         `json:"parentId"`
	Manager            string          `json:"manager"`
	Description        string          `json:"description"`
	Type               string          `json:"type"`
	LinkedArchitecture json.RawMessage `json:"linkedArchitecture"`
}

type EmployeeSaveHandlerRequest struct {
	ID             string     `json:"id"`
	StaffID        string     `json:"staffId"`
	Name           string     `json:"name"`
	Gender         string     `json:"gender"`
	Birthday       *time.Time `json:"birthday"`
	IDCard         string     `json:"idCard"`
	Phone          string     `json:"phone"`
	EmergencyPhone string     `json:"emergencyPhone"`
	Address        string     `json:"address"`
	BankCard       string     `json:"bankCard"`
	BankName       string     `json:"bankName"`
	Education      string     `json:"education"`
	Age            int        `json:"age"`
	Status         string     `json:"status"`
	JoinedDate     *time.Time `json:"joinedDate"`
	DeptID         string     `json:"deptId"`
	LineID         string     `json:"lineId"`
	ProcessID      string     `json:"processId"`
}

type BulkSyncEmployeeHandlerRequest struct {
	ID             string     `json:"id"`
	StaffID        string     `json:"staffId"`
	Name           string     `json:"name"`
	Gender         string     `json:"gender"`
	Birthday       *time.Time `json:"birthday"`
	IDCard         string     `json:"idCard"`
	Phone          string     `json:"phone"`
	EmergencyPhone string     `json:"emergencyPhone"`
	Address        string     `json:"address"`
	BankCard       string     `json:"bankCard"`
	BankName       string     `json:"bankName"`
	Education      string     `json:"education"`
	Age            int        `json:"age"`
	Status         string     `json:"status"`
	JoinedDate     *time.Time `json:"joinedDate"`
	DeptID         string     `json:"deptId"`
	LineID         string     `json:"lineId"`
	ProcessID      string     `json:"processId"`
}

func mapOrganizationSaveHandlerRequestToService(input OrganizationSaveHandlerRequest) services.OrganizationSaveRequest {
	return services.OrganizationSaveRequest{
		ID:                 input.ID,
		Name:               input.Name,
		ParentID:           input.ParentID,
		Manager:            input.Manager,
		Description:        input.Description,
		Type:               input.Type,
		LinkedArchitecture: input.LinkedArchitecture,
	}
}

func mapBulkSyncOrganizationHandlerRequestsToService(input []BulkSyncOrganizationHandlerRequest) []services.BulkSyncOrganizationRequest {
	result := make([]services.BulkSyncOrganizationRequest, 0, len(input))
	for _, item := range input {
		result = append(result, services.BulkSyncOrganizationRequest{
			ID:                 item.ID,
			Name:               item.Name,
			ParentID:           item.ParentID,
			Manager:            item.Manager,
			Description:        item.Description,
			Type:               item.Type,
			LinkedArchitecture: item.LinkedArchitecture,
		})
	}
	return result
}

func mapOrganizationSaveServiceResponseToResponse(input services.OrganizationSaveResponse) gin.H {
	return gin.H{
		"id":                 input.ID,
		"name":               input.Name,
		"parentId":           input.ParentID,
		"manager":            input.Manager,
		"description":        input.Description,
		"type":               input.Type,
		"linkedArchitecture": input.LinkedArchitecture,
		"createdAt":          input.CreatedAt,
		"updatedAt":          input.UpdatedAt,
		"version":            optimisticVersionForResponse(input.UpdatedAt, input.CreatedAt),
	}
}

func mapEmployeeSaveServiceResponseToResponse(input services.EmployeeSaveResponse) gin.H {
	return gin.H{
		"id":             input.ID,
		"staffId":        input.StaffID,
		"name":           input.Name,
		"gender":         input.Gender,
		"birthday":       input.Birthday,
		"idCard":         input.IDCard,
		"phone":          input.Phone,
		"emergencyPhone": input.EmergencyPhone,
		"address":        input.Address,
		"bankCard":       input.BankCard,
		"bankName":       input.BankName,
		"education":      input.Education,
		"age":            input.Age,
		"status":         input.Status,
		"joinedDate":     input.JoinedDate,
		"deptId":         input.DeptID,
		"lineId":         input.LineID,
		"processId":      input.ProcessID,
		"positionId":     input.PositionID,
		"deptName":       input.DeptName,
		"lineName":       input.LineName,
		"processName":    input.ProcessName,
		"positionName":   input.PositionName,
		"createdAt":      input.CreatedAt,
		"updatedAt":      input.UpdatedAt,
		"version":        optimisticVersionForResponse(input.UpdatedAt, input.CreatedAt),
	}
}

func mapEmployeeSaveHandlerRequestToService(input EmployeeSaveHandlerRequest) services.EmployeeSaveRequest {
	return services.EmployeeSaveRequest{
		ID:             input.ID,
		StaffID:        input.StaffID,
		Name:           input.Name,
		Gender:         input.Gender,
		Birthday:       input.Birthday,
		IDCard:         input.IDCard,
		Phone:          input.Phone,
		EmergencyPhone: input.EmergencyPhone,
		Address:        input.Address,
		BankCard:       input.BankCard,
		BankName:       input.BankName,
		Education:      input.Education,
		Age:            input.Age,
		Status:         input.Status,
		JoinedDate:     input.JoinedDate,
		DeptID:         input.DeptID,
		LineID:         input.LineID,
		ProcessID:      input.ProcessID,
	}
}

func mapBulkSyncEmployeeHandlerRequestsToService(input []BulkSyncEmployeeHandlerRequest) []services.BulkSyncEmployeeRequest {
	result := make([]services.BulkSyncEmployeeRequest, 0, len(input))
	for _, item := range input {
		result = append(result, services.BulkSyncEmployeeRequest{
			ID:             item.ID,
			StaffID:        item.StaffID,
			Name:           item.Name,
			Gender:         item.Gender,
			Birthday:       item.Birthday,
			IDCard:         item.IDCard,
			Phone:          item.Phone,
			EmergencyPhone: item.EmergencyPhone,
			Address:        item.Address,
			BankCard:       item.BankCard,
			BankName:       item.BankName,
			Education:      item.Education,
			Age:            item.Age,
			Status:         item.Status,
			JoinedDate:     item.JoinedDate,
			DeptID:         item.DeptID,
			LineID:         item.LineID,
			ProcessID:      item.ProcessID,
		})
	}
	return result
}
