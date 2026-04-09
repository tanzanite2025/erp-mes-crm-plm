package services

import "xdfc-server/models"

type PartnerListPaginationMeta struct {
	Total    int64 `json:"total"`
	Page     int   `json:"page"`
	PageSize int   `json:"pageSize"`
}

type CustomerListStats struct {
	Total        int64 `json:"total"`
	Active       int64 `json:"active"`
	NewThisMonth int64 `json:"newThisMonth"`
}

type SupplierListStats struct {
	Total         int64 `json:"total"`
	Active        int64 `json:"active"`
	PendingReview int64 `json:"pendingReview"`
}

type CustomerListMetadata struct {
	Pagination PartnerListPaginationMeta `json:"pagination"`
	Stats      CustomerListStats         `json:"stats"`
}

type SupplierListMetadata struct {
	Pagination PartnerListPaginationMeta `json:"pagination"`
	Stats      SupplierListStats         `json:"stats"`
}

type CustomerListResponse struct {
	Items    []models.Customer      `json:"items"`
	Total    int64                  `json:"total"`
	Page     int                    `json:"page"`
	PageSize int                    `json:"pageSize"`
	Metadata CustomerListMetadata   `json:"metadata"`
}

type SupplierListResponse struct {
	Items    []models.Supplier      `json:"items"`
	Total    int64                  `json:"total"`
	Page     int                    `json:"page"`
	PageSize int                    `json:"pageSize"`
	Metadata SupplierListMetadata   `json:"metadata"`
}
