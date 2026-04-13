package services

import (
	"encoding/json"
	"time"
	"xdfc-server/models"
)

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

type SaveCustomerRequest struct {
	ID            string  `json:"id"`
	Name          string  `json:"name"`
	Code          string  `json:"code"`
	ContactPerson string  `json:"contactPerson"`
	ContactPhone  string  `json:"contactPhone"`
	WeChat        string  `json:"wechat"`
	WhatsApp      string  `json:"whatsapp"`
	Facebook      string  `json:"facebook"`
	Instagram     string  `json:"instagram"`
	Telegram      string  `json:"telegram"`
	Email         string  `json:"email"`
	Address       string  `json:"address"`
	Status        string  `json:"status"`
	CreditLimit   float64 `json:"creditLimit"`
	Balance       float64 `json:"balance"`
	IsDeleted     bool    `json:"isDeleted"`
	Version       int     `json:"version"`
}

type PatchCustomerRequest struct {
	ID            string
	Version       int
	Name          *string
	Code          *string
	ContactPerson *string
	ContactPhone  *string
	WeChat        *string
	WhatsApp      *string
	Facebook      *string
	Instagram     *string
	Telegram      *string
	Email         *string
	Address       *string
	Status        *string
	CreditLimit   *float64
	Balance       *float64
}

type CustomerResponse struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	Code          string    `json:"code"`
	ContactPerson string    `json:"contactPerson"`
	ContactPhone  string    `json:"contactPhone"`
	WeChat        string    `json:"wechat"`
	WhatsApp      string    `json:"whatsapp"`
	Facebook      string    `json:"facebook"`
	Instagram     string    `json:"instagram"`
	Telegram      string    `json:"telegram"`
	Email         string    `json:"email"`
	Address       string    `json:"address"`
	Status        string    `json:"status"`
	CreditLimit   float64   `json:"creditLimit"`
	Balance       float64   `json:"balance"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
	IsDeleted     bool      `json:"isDeleted"`
	Version       int       `json:"version"`
}

type CustomerListResponse struct {
	Items    []CustomerResponse   `json:"items"`
	Total    int64                `json:"total"`
	Page     int                  `json:"page"`
	PageSize int                  `json:"pageSize"`
	Metadata CustomerListMetadata `json:"metadata"`
}

type SupplierResponse struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	Code          string    `json:"code"`
	Category      string    `json:"category"`
	MainProducts  string    `json:"mainProducts"`
	ContactPerson string    `json:"contactPerson"`
	ContactPhone  string    `json:"contactPhone"`
	WeChat        string    `json:"wechat"`
	WhatsApp      string    `json:"whatsapp"`
	Facebook      string    `json:"facebook"`
	Instagram     string    `json:"instagram"`
	Telegram      string    `json:"telegram"`
	Email         string    `json:"email"`
	Address       string    `json:"address"`
	Status        string    `json:"status"`
	Rating        float64   `json:"rating"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
	IsDeleted     bool      `json:"isDeleted"`
	Version       int       `json:"version"`
}

type SupplierListResponse struct {
	Items    []SupplierResponse   `json:"items"`
	Total    int64                `json:"total"`
	Page     int                  `json:"page"`
	PageSize int                  `json:"pageSize"`
	Metadata SupplierListMetadata `json:"metadata"`
}

func MapSaveCustomerRequestToModel(input SaveCustomerRequest) models.Customer {
	return models.Customer{
		ID:            input.ID,
		Name:          input.Name,
		Code:          input.Code,
		ContactPerson: input.ContactPerson,
		ContactPhone:  input.ContactPhone,
		WeChat:        input.WeChat,
		WhatsApp:      input.WhatsApp,
		Facebook:      input.Facebook,
		Instagram:     input.Instagram,
		Telegram:      input.Telegram,
		Email:         input.Email,
		Address:       input.Address,
		Status:        input.Status,
		CreditLimit:   input.CreditLimit,
		Balance:       input.Balance,
		IsDeleted:     input.IsDeleted,
		Version:       input.Version,
	}
}

func MapCustomerToResponse(model models.Customer) CustomerResponse {
	return CustomerResponse{
		ID:            model.ID,
		Name:          model.Name,
		Code:          model.Code,
		ContactPerson: model.ContactPerson,
		ContactPhone:  model.ContactPhone,
		WeChat:        model.WeChat,
		WhatsApp:      model.WhatsApp,
		Facebook:      model.Facebook,
		Instagram:     model.Instagram,
		Telegram:      model.Telegram,
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

func MapCustomersToResponse(items []models.Customer) []CustomerResponse {
	result := make([]CustomerResponse, 0, len(items))
	for _, item := range items {
		result = append(result, MapCustomerToResponse(item))
	}
	return result
}

func MapSupplierToResponse(model models.Supplier) SupplierResponse {
	return SupplierResponse{
		ID:            model.ID,
		Name:          model.Name,
		Code:          model.Code,
		Category:      model.Category,
		MainProducts:  model.MainProducts,
		ContactPerson: model.ContactPerson,
		ContactPhone:  model.ContactPhone,
		WeChat:        model.WeChat,
		WhatsApp:      model.WhatsApp,
		Facebook:      model.Facebook,
		Instagram:     model.Instagram,
		Telegram:      model.Telegram,
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

func MapSuppliersToResponse(items []models.Supplier) []SupplierResponse {
	result := make([]SupplierResponse, 0, len(items))
	for _, item := range items {
		result = append(result, MapSupplierToResponse(item))
	}
	return result
}

func MapCustomerToSaveSnapshot(model models.Customer) CustomerSaveSnapshot {
	return CustomerSaveSnapshot{
		Name:          model.Name,
		Code:          model.Code,
		ContactPerson: model.ContactPerson,
		ContactPhone:  model.ContactPhone,
		WeChat:        model.WeChat,
		WhatsApp:      model.WhatsApp,
		Facebook:      model.Facebook,
		Instagram:     model.Instagram,
		Telegram:      model.Telegram,
		Email:         model.Email,
		Address:       model.Address,
		Status:        model.Status,
		CreditLimit:   model.CreditLimit,
		Balance:       model.Balance,
	}
}

func MapPatchCustomerRequestToSaveSnapshot(current models.Customer, patch PatchCustomerRequest) CustomerSaveSnapshot {
	snapshot := MapCustomerToSaveSnapshot(current)
	if patch.Name != nil {
		snapshot.Name = *patch.Name
	}
	if patch.Code != nil {
		snapshot.Code = *patch.Code
	}
	if patch.ContactPerson != nil {
		snapshot.ContactPerson = *patch.ContactPerson
	}
	if patch.ContactPhone != nil {
		snapshot.ContactPhone = *patch.ContactPhone
	}
	if patch.WeChat != nil {
		snapshot.WeChat = *patch.WeChat
	}
	if patch.WhatsApp != nil {
		snapshot.WhatsApp = *patch.WhatsApp
	}
	if patch.Facebook != nil {
		snapshot.Facebook = *patch.Facebook
	}
	if patch.Instagram != nil {
		snapshot.Instagram = *patch.Instagram
	}
	if patch.Telegram != nil {
		snapshot.Telegram = *patch.Telegram
	}
	if patch.Email != nil {
		snapshot.Email = *patch.Email
	}
	if patch.Address != nil {
		snapshot.Address = *patch.Address
	}
	if patch.Status != nil {
		snapshot.Status = *patch.Status
	}
	if patch.CreditLimit != nil {
		snapshot.CreditLimit = *patch.CreditLimit
	}
	if patch.Balance != nil {
		snapshot.Balance = *patch.Balance
	}
	return snapshot
}

func MapSaveSupplierSnapshotFromModel(model models.Supplier) SupplierSaveSnapshot {
	var mainProducts []string
	if strings := model.MainProducts; strings != "" {
		_ = json.Unmarshal([]byte(strings), &mainProducts)
	}
	return SupplierSaveSnapshot{
		Name:          model.Name,
		Code:          model.Code,
		Category:      model.Category,
		MainProducts:  mainProducts,
		ContactPerson: model.ContactPerson,
		ContactPhone:  model.ContactPhone,
		WeChat:        model.WeChat,
		WhatsApp:      model.WhatsApp,
		Facebook:      model.Facebook,
		Instagram:     model.Instagram,
		Telegram:      model.Telegram,
		Email:         model.Email,
		Address:       model.Address,
		Status:        model.Status,
		Rating:        model.Rating,
	}
}

func MapPatchSupplierRequestToSaveSnapshot(current models.Supplier, patch PatchSupplierRequest) SupplierSaveSnapshot {
	snapshot := MapSaveSupplierSnapshotFromModel(current)
	if patch.Name != nil {
		snapshot.Name = *patch.Name
	}
	if patch.Code != nil {
		snapshot.Code = *patch.Code
	}
	if patch.Category != nil {
		snapshot.Category = *patch.Category
	}
	if patch.MainProducts != nil {
		_ = json.Unmarshal([]byte(*patch.MainProducts), &snapshot.MainProducts)
	}
	if patch.ContactPerson != nil {
		snapshot.ContactPerson = *patch.ContactPerson
	}
	if patch.ContactPhone != nil {
		snapshot.ContactPhone = *patch.ContactPhone
	}
	if patch.WeChat != nil {
		snapshot.WeChat = *patch.WeChat
	}
	if patch.WhatsApp != nil {
		snapshot.WhatsApp = *patch.WhatsApp
	}
	if patch.Facebook != nil {
		snapshot.Facebook = *patch.Facebook
	}
	if patch.Instagram != nil {
		snapshot.Instagram = *patch.Instagram
	}
	if patch.Telegram != nil {
		snapshot.Telegram = *patch.Telegram
	}
	if patch.Email != nil {
		snapshot.Email = *patch.Email
	}
	if patch.Address != nil {
		snapshot.Address = *patch.Address
	}
	if patch.Status != nil {
		snapshot.Status = *patch.Status
	}
	if patch.Rating != nil {
		snapshot.Rating = *patch.Rating
	}
	return snapshot
}
