package handlers

import "xdfc-server/models"

type BulkSyncSupplierRequest struct {
	ID            string  `json:"id"`
	Name          string  `json:"name"`
	Code          string  `json:"code"`
	Category      string  `json:"category"`
	MainProducts  string  `json:"mainProducts"`
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
		WeChat:        input.WeChat,
		WhatsApp:      input.WhatsApp,
		Facebook:      input.Facebook,
		Instagram:     input.Instagram,
		Telegram:      input.Telegram,
		Email:         input.Email,
		Address:       input.Address,
		Status:        input.Status,
		Rating:        input.Rating,
		IsDeleted:     input.IsDeleted,
		Version:       input.Version,
	}
}
