package services

import (
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"
)

func ListUsers(queryInput UserQuery) (UserListResponse, error) {
	page := queryInput.Page
	if page < 1 {
		page = 1
	}
	pageSize := queryInput.PageSize
	if pageSize < 1 {
		pageSize = 50
	}

	query := db.DB.Model(&models.User{})
	if strings.TrimSpace(queryInput.Username) != "" {
		query = query.Where("username LIKE ?", "%"+strings.TrimSpace(queryInput.Username)+"%")
	}
	if len(queryInput.Statuses) > 0 {
		query = query.Where("status IN ?", queryInput.Statuses)
	}
	if len(queryInput.Roles) > 0 {
		query = query.Where("role IN ?", queryInput.Roles)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return UserListResponse{}, err
	}

	var items []models.User
	if err := query.Limit(pageSize).Offset((page - 1) * pageSize).Find(&items).Error; err != nil {
		return UserListResponse{}, err
	}

	return UserListResponse{
		Items:    MapUsersToResponse(items),
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}

func ListUserOptions(queryInput UserQuery) ([]UserOptionResponse, error) {
	query := db.DB.Model(&models.User{})
	if strings.TrimSpace(queryInput.Username) != "" {
		query = query.Where("username LIKE ?", "%"+strings.TrimSpace(queryInput.Username)+"%")
	}
	if len(queryInput.Statuses) > 0 {
		query = query.Where("status IN ?", queryInput.Statuses)
	}
	if len(queryInput.Roles) > 0 {
		query = query.Where("role IN ?", queryInput.Roles)
	}

	var items []models.User
	if err := query.Find(&items).Error; err != nil {
		return nil, err
	}

	return MapUsersToOptionResponse(items), nil
}
