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
	Station        string     `json:"station"`
	Status         string     `json:"status"`
	JoinedDate     *time.Time `json:"joinedDate"`
	DeptID         string     `json:"deptId"`
	LineID         string     `json:"lineId"`
	ProcessID      string     `json:"processId"`
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
	Station        string     `json:"station"`
	Status         string     `json:"status"`
	JoinedDate     *time.Time `json:"joinedDate"`
	DeptID         string     `json:"deptId"`
	LineID         string     `json:"lineId"`
	ProcessID      string     `json:"processId"`
	DeptName       string     `json:"deptName"`
	LineName       string     `json:"lineName"`
	ProcessName    string     `json:"processName"`
	CreatedAt      time.Time  `json:"createdAt"`
	UpdatedAt      time.Time  `json:"updatedAt"`
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
	Station        string     `json:"station"`
	Status         string     `json:"status"`
	JoinedDate     *time.Time `json:"joinedDate"`
	DeptID         string     `json:"deptId"`
	LineID         string     `json:"lineId"`
	ProcessID      string     `json:"processId"`
}

func MapOrganizationSaveRequestToModel(input OrganizationSaveRequest) models.Organization {
	return models.Organization{
		BaseModel:           models.BaseModel{ID: input.ID},
		Name:                input.Name,
		ParentID:            input.ParentID,
		Manager:             input.Manager,
		Description:         input.Description,
		Type:                input.Type,
		LinkedArchitecture:  input.LinkedArchitecture,
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
		BaseModel:           models.BaseModel{ID: input.ID},
		Name:                input.Name,
		ParentID:            input.ParentID,
		Manager:             input.Manager,
		Description:         input.Description,
		Type:                input.Type,
		LinkedArchitecture:  input.LinkedArchitecture,
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
		Station:        input.Station,
		Status:         input.Status,
		JoinedDate:     input.JoinedDate,
		DeptID:         input.DeptID,
		LineID:         input.LineID,
		ProcessID:      input.ProcessID,
	}
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
		Station:        model.Station,
		Status:         model.Status,
		JoinedDate:     model.JoinedDate,
		DeptID:         model.DeptID,
		LineID:         model.LineID,
		ProcessID:      model.ProcessID,
		DeptName:       model.DeptName,
		LineName:       model.LineName,
		ProcessName:    model.ProcessName,
		CreatedAt:      model.CreatedAt,
		UpdatedAt:      model.UpdatedAt,
	}
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
		Station:        input.Station,
		Status:         input.Status,
		JoinedDate:     input.JoinedDate,
		DeptID:         input.DeptID,
		LineID:         input.LineID,
		ProcessID:      input.ProcessID,
	}
}
