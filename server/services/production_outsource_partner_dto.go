package services

import (
	"time"
	"xdfc-server/models"
)

type OutsourcePartnerDTO struct {
	ID                   string    `json:"id"`
	CreatedAt            time.Time `json:"createdAt"`
	UpdatedAt            time.Time `json:"updatedAt"`
	Code                 string    `json:"code"`
	Name                 string    `json:"name"`
	SupplierID           string    `json:"supplierId"`
	SupplierNameSnapshot string    `json:"supplierNameSnapshot"`
	ContactPerson        string    `json:"contactPerson"`
	ContactPhone         string    `json:"contactPhone"`
	Email                string    `json:"email"`
	Address              string    `json:"address"`
	QualityGrade         string    `json:"qualityGrade"`
	Status               string    `json:"status"`
	LeadTimeDays         int       `json:"leadTimeDays"`
	SettlementPolicy     string    `json:"settlementPolicy"`
	Notes                string    `json:"notes"`
	Operator             string    `json:"operator"`
	Version              int64     `json:"version"`
}

type OutsourcePartnerListQuery struct {
	Search string
	Status string
}

type OutsourcePartnerListStats struct {
	Total    int `json:"total"`
	Active   int `json:"active"`
	OnReview int `json:"onReview"`
	Inactive int `json:"inactive"`
}

type OutsourcePartnerListResponse struct {
	Items    []OutsourcePartnerDTO     `json:"items"`
	Metadata OutsourcePartnerListStats `json:"metadata"`
}

func mapOutsourcePartnerToDTO(partner models.OutsourcePartner) OutsourcePartnerDTO {
	return OutsourcePartnerDTO{
		ID:                   partner.ID,
		CreatedAt:            partner.CreatedAt,
		UpdatedAt:            partner.UpdatedAt,
		Code:                 partner.Code,
		Name:                 partner.Name,
		SupplierID:           partner.SupplierID,
		SupplierNameSnapshot: partner.SupplierNameSnapshot,
		ContactPerson:        partner.ContactPerson,
		ContactPhone:         partner.ContactPhone,
		Email:                partner.Email,
		Address:              partner.Address,
		QualityGrade:         partner.QualityGrade,
		Status:               partner.Status,
		LeadTimeDays:         partner.LeadTimeDays,
		SettlementPolicy:     partner.SettlementPolicy,
		Notes:                partner.Notes,
		Operator:             partner.Operator,
		Version:              partner.Version,
	}
}

func mapOutsourcePartnersToDTO(partners []models.OutsourcePartner) []OutsourcePartnerDTO {
	result := make([]OutsourcePartnerDTO, 0, len(partners))
	for _, partner := range partners {
		result = append(result, mapOutsourcePartnerToDTO(partner))
	}
	return result
}

func mapOutsourcePartnerDTOToModel(partner OutsourcePartnerDTO) models.OutsourcePartner {
	return models.OutsourcePartner{
		BaseModel: models.BaseModel{
			ID:        partner.ID,
			CreatedAt: partner.CreatedAt,
			UpdatedAt: partner.UpdatedAt,
		},
		Code:                 partner.Code,
		Name:                 partner.Name,
		SupplierID:           partner.SupplierID,
		SupplierNameSnapshot: partner.SupplierNameSnapshot,
		ContactPerson:        partner.ContactPerson,
		ContactPhone:         partner.ContactPhone,
		Email:                partner.Email,
		Address:              partner.Address,
		QualityGrade:         partner.QualityGrade,
		Status:               partner.Status,
		LeadTimeDays:         partner.LeadTimeDays,
		SettlementPolicy:     partner.SettlementPolicy,
		Notes:                partner.Notes,
		Operator:             partner.Operator,
		Version:              partner.Version,
	}
}

func applyOutsourcePartnerDTO(partner *models.OutsourcePartner, dto OutsourcePartnerDTO) {
	partner.Code = dto.Code
	partner.Name = dto.Name
	partner.SupplierID = dto.SupplierID
	partner.SupplierNameSnapshot = dto.SupplierNameSnapshot
	partner.ContactPerson = dto.ContactPerson
	partner.ContactPhone = dto.ContactPhone
	partner.Email = dto.Email
	partner.Address = dto.Address
	partner.QualityGrade = dto.QualityGrade
	partner.Status = dto.Status
	partner.LeadTimeDays = dto.LeadTimeDays
	partner.SettlementPolicy = dto.SettlementPolicy
	partner.Notes = dto.Notes
}

func buildOutsourcePartnerListStats(items []OutsourcePartnerDTO) OutsourcePartnerListStats {
	stats := OutsourcePartnerListStats{Total: len(items)}
	for _, item := range items {
		switch item.Status {
		case OutsourcePartnerStatusActive:
			stats.Active++
		case OutsourcePartnerStatusOnReview:
			stats.OnReview++
		case OutsourcePartnerStatusInactive:
			stats.Inactive++
		}
	}
	return stats
}
