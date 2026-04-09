package handlers

import (
	"time"
	"xdfc-server/models"
	"xdfc-server/services"
)

type CustomerRequest struct {
	ID            string  `json:"id"`
	Name          string  `json:"name"`
	Code          string  `json:"code"`
	ContactPerson string  `json:"contactPerson"`
	ContactPhone  string  `json:"contactPhone"`
	Email         string  `json:"email"`
	Address       string  `json:"address"`
	Status        string  `json:"status"`
	CreditLimit   float64 `json:"creditLimit"`
	Balance       float64 `json:"balance"`
	IsDeleted     bool    `json:"isDeleted"`
	Version       int     `json:"_v"`
}

type CustomerResponse struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	Code          string    `json:"code"`
	ContactPerson string    `json:"contactPerson"`
	ContactPhone  string    `json:"contactPhone"`
	Email         string    `json:"email"`
	Address       string    `json:"address"`
	Status        string    `json:"status"`
	CreditLimit   float64   `json:"creditLimit"`
	Balance       float64   `json:"balance"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
	IsDeleted     bool      `json:"isDeleted"`
	Version       int       `json:"_v"`
}

type CustomerListHandlerResponse struct {
	Items    []CustomerResponse            `json:"items"`
	Total    int64                         `json:"total"`
	Page     int                           `json:"page"`
	PageSize int                           `json:"pageSize"`
	Metadata services.CustomerListMetadata `json:"metadata"`
}

type BulkSyncCustomerRequest struct {
	ID            string  `json:"id"`
	Name          string  `json:"name"`
	Code          string  `json:"code"`
	ContactPerson string  `json:"contactPerson"`
	ContactPhone  string  `json:"contactPhone"`
	Email         string  `json:"email"`
	Address       string  `json:"address"`
	Status        string  `json:"status"`
	CreditLimit   float64 `json:"creditLimit"`
	Balance       float64 `json:"balance"`
	IsDeleted     bool    `json:"isDeleted"`
	Version       int     `json:"_v"`
}

func mapCustomerRequestToModel(input CustomerRequest) models.Customer {
	return models.Customer{
		ID:            input.ID,
		Name:          input.Name,
		Code:          input.Code,
		ContactPerson: input.ContactPerson,
		ContactPhone:  input.ContactPhone,
		Email:         input.Email,
		Address:       input.Address,
		Status:        input.Status,
		CreditLimit:   input.CreditLimit,
		Balance:       input.Balance,
		IsDeleted:     input.IsDeleted,
		Version:       input.Version,
	}
}

func mapBulkSyncCustomerRequestToModel(input BulkSyncCustomerRequest) models.Customer {
	return models.Customer{
		ID:            input.ID,
		Name:          input.Name,
		Code:          input.Code,
		ContactPerson: input.ContactPerson,
		ContactPhone:  input.ContactPhone,
		Email:         input.Email,
		Address:       input.Address,
		Status:        input.Status,
		CreditLimit:   input.CreditLimit,
		Balance:       input.Balance,
		IsDeleted:     input.IsDeleted,
		Version:       input.Version,
	}
}

func mapCustomerToResponse(model models.Customer) CustomerResponse {
	return CustomerResponse{
		ID:            model.ID,
		Name:          model.Name,
		Code:          model.Code,
		ContactPerson: model.ContactPerson,
		ContactPhone:  model.ContactPhone,
		Email:         model.Email,
		Address:       model.Address,
		Status:        model.Status,
		CreditLimit:   model.CreditLimit,
		Balance:       model.Balance,
		CreatedAt:     model.CreatedAt,
		UpdatedAt:     model.UpdatedAt,
		IsDeleted:     model.IsDeleted,
		Version:       model.Version,
	}
}

func mapCustomersToResponse(items []models.Customer) []CustomerResponse {
	result := make([]CustomerResponse, 0, len(items))
	for _, item := range items {
		result = append(result, mapCustomerToResponse(item))
	}
	return result
}
