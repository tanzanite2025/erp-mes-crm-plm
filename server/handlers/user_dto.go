package handlers

import (
	"xdfc-server/models"
	"xdfc-server/services"
)

type UserResponse = services.UserResponse

type UserListResponse = services.UserListResponse

type UserOptionResponse = services.UserOptionResponse

func mapUserToResponse(user models.User) UserResponse {
	return services.MapUserToResponse(user)
}
