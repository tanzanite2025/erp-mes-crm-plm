package handlers

import (
	"time"
	"xdfc-server/models"
	"xdfc-server/services"
)

type SupplierResponse struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	Code          string    `json:"code"`
	Category      string    `json:"category"`
	MainProducts  string    `json:"mainProducts"`
	ContactPerson string    `json:"contactPerson"`
	ContactPhone  string    `json:"contactPhone"`
	Email         string    `json:"email"`
	Address       string    `json:"address"`
	Status        string    `json:"status"`
	Rating        float64   `json:"rating"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
	IsDeleted     bool      `json:"isDeleted"`
	Version       int       `json:"version"`
}

type SupplierListHandlerResponse struct {
	Items    []SupplierResponse            `json:"items"`
	Total    int64                         `json:"total"`
	Page     int                           `json:"page"`
	PageSize int                           `json:"pageSize"`
	Metadata services.SupplierListMetadata `json:"metadata"`
}

type BulkSyncSupplierRequest struct {
	ID            string  `json:"id"`
	Name          string  `json:"name"`
	Code          string  `json:"code"`
	Category      string  `json:"category"`
	MainProducts  string  `json:"mainProducts"`
	ContactPerson string  `json:"contactPerson"`
	ContactPhone  string  `json:"contactPhone"`
	Email         string  `json:"email"`
	Address       string  `json:"address"`
	Status        string  `json:"status"`
	Rating        float64 `json:"rating"`
	IsDeleted     bool    `json:"isDeleted"`
	Version       int     `json:"version"`
}

func mapBulkSyncSupplierRequestToModel(input BulkSyncSupplierRequest) models.Supplier {
	return models.Supplier{
		ID:            input.ID,
		Name:          input.Name,
		Code:          input.Code,
		Category:      input.Category,
		MainProducts:  input.MainProducts,
		ContactPerson: input.ContactPerson,
		ContactPhone:  input.ContactPhone,
		Email:         input.Email,
		Address:       input.Address,
		Status:        input.Status,
		Rating:        input.Rating,
		IsDeleted:     input.IsDeleted,
		Version:       input.Version,
	}
}

func mapSupplierToResponse(model models.Supplier) SupplierResponse {
	return SupplierResponse{
		ID:            model.ID,
		Name:          model.Name,
		Code:          model.Code,
		Category:      model.Category,
		MainProducts:  model.MainProducts,
		ContactPerson: model.ContactPerson,
		ContactPhone:  model.ContactPhone,
		Email:         model.Email,
		Address:       model.Address,
		Status:        model.Status,
		Rating:        model.Rating,
		CreatedAt:     model.CreatedAt,
		UpdatedAt:     model.UpdatedAt,
		IsDeleted:     model.IsDeleted,
		Version:       model.Version,
	}
}

func mapSuppliersToResponse(items []models.Supplier) []SupplierResponse {
	result := make([]SupplierResponse, 0, len(items))
	for _, item := range items {
		result = append(result, mapSupplierToResponse(item))
	}
	return result
}
