package services

import (
	"time"
	"xdfc-server/models"
)

type UserQuery struct {
	Page     int
	PageSize int
	Username string
	Statuses []string
}

type UserResponse struct {
	ID                 string    `json:"id"`
	Username           string    `json:"username"`
	Email              string    `json:"email"`
	PhoneNumber        string    `json:"phoneNumber"`
	FirstName          string    `json:"firstName"`
	LastName           string    `json:"lastName"`
	Status             string    `json:"status"`
	IsProtected        bool      `json:"isProtected"`
	PermissionPresetID string    `json:"permissionPresetId,omitempty"`
	EmployeeID         string    `json:"employeeId"`
	CreatedAt          time.Time `json:"createdAt"`
	UpdatedAt          time.Time `json:"updatedAt"`
}

type UserOptionResponse struct {
	ID                 string `json:"id"`
	Username           string `json:"username"`
	EmployeeID         string `json:"employeeId,omitempty"`
	FirstName          string `json:"firstName,omitempty"`
	LastName           string `json:"lastName,omitempty"`
	IsProtected        bool   `json:"isProtected"`
	PermissionPresetID string `json:"permissionPresetId,omitempty"`
	Status             string `json:"status,omitempty"`
}

type UserListResponse struct {
	Items    []UserResponse `json:"items"`
	Total    int64          `json:"total"`
	Page     int            `json:"page"`
	PageSize int            `json:"pageSize"`
}

func MapUserToResponse(user models.User) UserResponse {
	return UserResponse{
		ID:                 user.ID,
		Username:           user.Username,
		Email:              user.Email,
		PhoneNumber:        user.PhoneNumber,
		FirstName:          user.FirstName,
		LastName:           user.LastName,
		Status:             user.Status,
		IsProtected:        user.IsSystemProtected(),
		PermissionPresetID: user.PermissionPresetID,
		EmployeeID:         user.EmployeeID,
		CreatedAt:          user.CreatedAt,
		UpdatedAt:          user.UpdatedAt,
	}
}

func MapUsersToResponse(items []models.User) []UserResponse {
	result := make([]UserResponse, 0, len(items))
	for _, item := range items {
		result = append(result, MapUserToResponse(item))
	}
	return result
}

func MapUserToOptionResponse(user models.User) UserOptionResponse {
	return UserOptionResponse{
		ID:                 user.ID,
		Username:           user.Username,
		EmployeeID:         user.EmployeeID,
		FirstName:          user.FirstName,
		LastName:           user.LastName,
		IsProtected:        user.IsSystemProtected(),
		PermissionPresetID: user.PermissionPresetID,
		Status:             user.Status,
	}
}

func MapUsersToOptionResponse(items []models.User) []UserOptionResponse {
	result := make([]UserOptionResponse, 0, len(items))
	for _, item := range items {
		result = append(result, MapUserToOptionResponse(item))
	}
	return result
}
