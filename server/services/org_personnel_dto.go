package services

import (
	"encoding/json"
	"time"
	"xdfc-server/models"
)

type OrganizationSaveRequest struct {
	ID                 string          `json:"id"`
	Name               string          `json:"name"`
	ParentID           *string         `json:"parentId"`
	Manager            string          `json:"manager"`
	Description        string          `json:"description"`
	Type               string          `json:"type"`
	LinkedArchitecture json.RawMessage `json:"linkedArchitecture"`
}

type OrganizationSaveResponse struct {
	ID                 string          `json:"id"`
	Name               string          `json:"name"`
	ParentID           *string         `json:"parentId"`
	Manager            string          `json:"manager"`
	Description        string          `json:"description"`
	Type               string          `json:"type"`
	LinkedArchitecture json.RawMessage `json:"linkedArchitecture"`
	CreatedAt          time.Time       `json:"createdAt"`
	UpdatedAt          time.Time       `json:"updatedAt"`
}

type BulkSyncOrganizationRequest struct {
	ID                 string          `json:"id"`
	Name               string          `json:"name"`
	ParentID           *string         `json:"parentId"`
	Manager            string          `json:"manager"`
	Description        string          `json:"description"`
	Type               string          `json:"type"`
	LinkedArchitecture json.RawMessage `json:"linkedArchitecture"`
}

type EmployeeSaveRequest struct {
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

type OrganizationTreeNodeResponse struct {
	ID                 string                         `json:"id"`
	Name               string                         `json:"name"`
	ParentID           *string                        `json:"parentId"`
	Manager            string                         `json:"manager"`
	Description        string                         `json:"description"`
	Type               string                         `json:"type"`
	LinkedArchitecture json.RawMessage                `json:"linkedArchitecture"`
	Children           []OrganizationTreeNodeResponse `json:"children,omitempty"`
	CreatedAt          time.Time                      `json:"createdAt"`
	UpdatedAt          time.Time                      `json:"updatedAt"`
	Version            int                            `json:"version"`
}

type EmployeeListItemResponse struct {
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
	PositionID     string     `json:"positionId"`
	DeptName       string     `json:"deptName"`
	LineName       string     `json:"lineName"`
	ProcessName    string     `json:"processName"`
	PositionName   string     `json:"positionName"`
	CreatedAt      time.Time  `json:"createdAt"`
	UpdatedAt      time.Time  `json:"updatedAt"`
	Version        int        `json:"version"`
}

type EmployeeSaveResponse struct {
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
	PositionID     string     `json:"positionId"`
	DeptName       string     `json:"deptName"`
	LineName       string     `json:"lineName"`
	ProcessName    string     `json:"processName"`
	PositionName   string     `json:"positionName"`
	CreatedAt      time.Time  `json:"createdAt"`
	UpdatedAt      time.Time  `json:"updatedAt"`
}

type PositionListItemResponse struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Code        string    `json:"code"`
	OrgUnitID   *string   `json:"orgUnitId,omitempty"`
	OrgUnitName string    `json:"orgUnitName"`
	Status      string    `json:"status"`
	SortOrder   int       `json:"sortOrder"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
	Version     int       `json:"version"`
}

type BulkSyncEmployeeRequest struct {
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

func MapOrganizationSaveRequestToModel(input OrganizationSaveRequest) models.Organization {
	return models.Organization{
		BaseModel:          models.BaseModel{ID: input.ID},
		Name:               input.Name,
		ParentID:           input.ParentID,
		Manager:            input.Manager,
		Description:        input.Description,
		Type:               input.Type,
		LinkedArchitecture: input.LinkedArchitecture,
	}
}

func MapOrganizationToSaveResponse(model models.Organization) OrganizationSaveResponse {
	return OrganizationSaveResponse{
		ID:                 model.ID,
		Name:               model.Name,
		ParentID:           model.ParentID,
		Manager:            model.Manager,
		Description:        model.Description,
		Type:               model.Type,
		LinkedArchitecture: model.LinkedArchitecture,
		CreatedAt:          model.CreatedAt,
		UpdatedAt:          model.UpdatedAt,
	}
}

func MapBulkSyncOrganizationRequestToModel(input BulkSyncOrganizationRequest) models.Organization {
	return models.Organization{
		BaseModel:          models.BaseModel{ID: input.ID},
		Name:               input.Name,
		ParentID:           input.ParentID,
		Manager:            input.Manager,
		Description:        input.Description,
		Type:               input.Type,
		LinkedArchitecture: input.LinkedArchitecture,
	}
}

func MapEmployeeSaveRequestToModel(input EmployeeSaveRequest) models.Employee {
	return models.Employee{
		BaseModel:      models.BaseModel{ID: input.ID},
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

func MapOrganizationTreeToResponse(nodes []*models.Organization) []OrganizationTreeNodeResponse {
	items := make([]OrganizationTreeNodeResponse, 0, len(nodes))
	for _, node := range nodes {
		items = append(items, MapOrganizationNodeToResponse(node))
	}
	return items
}

func MapOrganizationNodeToResponse(node *models.Organization) OrganizationTreeNodeResponse {
	if node == nil {
		return OrganizationTreeNodeResponse{}
	}

	response := OrganizationTreeNodeResponse{
		ID:                 node.ID,
		Name:               node.Name,
		ParentID:           node.ParentID,
		Manager:            node.Manager,
		Description:        node.Description,
		Type:               node.Type,
		LinkedArchitecture: node.LinkedArchitecture,
		CreatedAt:          node.CreatedAt,
		UpdatedAt:          node.UpdatedAt,
		Version:            optimisticVersionFromTimestamps(node.UpdatedAt, node.CreatedAt),
	}

	if len(node.Children) > 0 {
		response.Children = make([]OrganizationTreeNodeResponse, 0, len(node.Children))
		for _, child := range node.Children {
			response.Children = append(response.Children, MapOrganizationNodeToResponse(child))
		}
	}

	return response
}

func MapEmployeeToListItemResponse(model models.Employee) EmployeeListItemResponse {
	return EmployeeListItemResponse{
		ID:             model.ID,
		StaffID:        model.StaffID,
		Name:           model.Name,
		Gender:         model.Gender,
		Birthday:       model.Birthday,
		IDCard:         model.IDCard,
		Phone:          model.Phone,
		EmergencyPhone: model.EmergencyPhone,
		Address:        model.Address,
		BankCard:       model.BankCard,
		BankName:       model.BankName,
		Education:      model.Education,
		Age:            model.Age,
		Status:         model.Status,
		JoinedDate:     model.JoinedDate,
		DeptID:         model.DeptID,
		LineID:         model.LineID,
		ProcessID:      model.ProcessID,
		PositionID:     model.PositionID,
		DeptName:       model.DeptName,
		LineName:       model.LineName,
		ProcessName:    model.ProcessName,
		PositionName:   model.PositionName,
		CreatedAt:      model.CreatedAt,
		UpdatedAt:      model.UpdatedAt,
		Version:        optimisticVersionFromTimestamps(model.UpdatedAt, model.CreatedAt),
	}
}

func MapEmployeesToListItemResponse(models []models.Employee) []EmployeeListItemResponse {
	items := make([]EmployeeListItemResponse, 0, len(models))
	for _, model := range models {
		items = append(items, MapEmployeeToListItemResponse(model))
	}
	return items
}

func MapEmployeeToSaveResponse(model models.Employee) EmployeeSaveResponse {
	return EmployeeSaveResponse{
		ID:             model.ID,
		StaffID:        model.StaffID,
		Name:           model.Name,
		Gender:         model.Gender,
		Birthday:       model.Birthday,
		IDCard:         model.IDCard,
		Phone:          model.Phone,
		EmergencyPhone: model.EmergencyPhone,
		Address:        model.Address,
		BankCard:       model.BankCard,
		BankName:       model.BankName,
		Education:      model.Education,
		Age:            model.Age,
		Status:         model.Status,
		JoinedDate:     model.JoinedDate,
		DeptID:         model.DeptID,
		LineID:         model.LineID,
		ProcessID:      model.ProcessID,
		PositionID:     model.PositionID,
		DeptName:       model.DeptName,
		LineName:       model.LineName,
		ProcessName:    model.ProcessName,
		PositionName:   model.PositionName,
		CreatedAt:      model.CreatedAt,
		UpdatedAt:      model.UpdatedAt,
	}
}

func MapPositionToListItemResponse(model models.Position) PositionListItemResponse {
	return PositionListItemResponse{
		ID:          model.ID,
		Name:        model.Name,
		Code:        model.Code,
		OrgUnitID:   cloneStringPointer(model.OrgUnitID),
		OrgUnitName: model.OrgUnitName,
		Status:      model.Status,
		SortOrder:   model.SortOrder,
		CreatedAt:   model.CreatedAt,
		UpdatedAt:   model.UpdatedAt,
		Version:     optimisticVersionFromTimestamps(model.UpdatedAt, model.CreatedAt),
	}
}

func MapPositionsToListItemResponse(models []models.Position) []PositionListItemResponse {
	items := make([]PositionListItemResponse, 0, len(models))
	for _, model := range models {
		items = append(items, MapPositionToListItemResponse(model))
	}
	return items
}

func MapBulkSyncEmployeeRequestToModel(input BulkSyncEmployeeRequest) models.Employee {
	return models.Employee{
		BaseModel:      models.BaseModel{ID: input.ID},
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
