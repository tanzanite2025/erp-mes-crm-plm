package handlers

import "xdfc-server/models"

type CustomerRequest struct {
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

type BulkSyncCustomerRequest struct {
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

func mapBulkSyncCustomerRequestToModel(input BulkSyncCustomerRequest) models.Customer {
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
