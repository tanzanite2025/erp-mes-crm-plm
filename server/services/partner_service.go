package services

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

type CustomerListQuery struct {
	Page     int
	PageSize int
	Options  bool
}

type SupplierListQuery struct {
	Page     int
	PageSize int
	Options  bool
}

func BuildCustomerListMetadata(total int64, page int, pageSize int) (CustomerListMetadata, error) {
	statsBaseQuery := db.DB.Model(&models.Customer{})

	var totalCustomers int64
	if err := statsBaseQuery.Session(&gorm.Session{}).Count(&totalCustomers).Error; err != nil {
		return CustomerListMetadata{}, err
	}

	var active int64
	if err := statsBaseQuery.Session(&gorm.Session{}).Where("status = ?", "Active").Count(&active).Error; err != nil {
		return CustomerListMetadata{}, err
	}

	startOfMonth := time.Now().UTC()
	startOfMonth = time.Date(startOfMonth.Year(), startOfMonth.Month(), 1, 0, 0, 0, 0, time.UTC)

	var newThisMonth int64
	if err := statsBaseQuery.Session(&gorm.Session{}).Where("created_at >= ?", startOfMonth).Count(&newThisMonth).Error; err != nil {
		return CustomerListMetadata{}, err
	}

	return CustomerListMetadata{
		Pagination: PartnerListPaginationMeta{
			Total:    total,
			Page:     page,
			PageSize: pageSize,
		},
		Stats: CustomerListStats{
			Total:        totalCustomers,
			Active:       active,
			NewThisMonth: newThisMonth,
		},
	}, nil
}

func ListCustomers(query CustomerListQuery) (CustomerListResponse, error) {
	page := query.Page
	if page < 1 {
		page = 1
	}
	pageSize := query.PageSize
	if pageSize < 1 {
		pageSize = 50
	}

	baseQuery := db.DB.Model(&models.Customer{})

	if query.Options {
		var customers []models.Customer
		if err := baseQuery.Order("name asc").Find(&customers).Error; err != nil {
			return CustomerListResponse{}, err
		}
		return CustomerListResponse{Items: MapCustomersToResponse(customers)}, nil
	}
	var total int64
	if err := db.DB.Model(&models.Customer{}).Count(&total).Error; err != nil {
		return CustomerListResponse{}, err
	}

	var items []models.Customer
	if err := baseQuery.Order("name asc").Limit(pageSize).Offset((page - 1) * pageSize).Find(&items).Error; err != nil {
		return CustomerListResponse{}, err
	}

	metadata, err := BuildCustomerListMetadata(total, page, pageSize)
	if err != nil {
		return CustomerListResponse{}, err
	}

	return CustomerListResponse{
		Items:    MapCustomersToResponse(items),
		Total:    total,
		Page:     page,
		PageSize: pageSize,
		Metadata: metadata,
	}, nil
}

func ListSuppliers(query SupplierListQuery) (SupplierListResponse, error) {
	page := query.Page
	if page < 1 {
		page = 1
	}
	pageSize := query.PageSize
	if pageSize < 1 {
		pageSize = 50
	}

	baseQuery := db.DB.Model(&models.Supplier{})

	if query.Options {
		var suppliers []models.Supplier
		if err := baseQuery.Order("name asc").Find(&suppliers).Error; err != nil {
			return SupplierListResponse{}, err
		}
		return SupplierListResponse{Items: MapSuppliersToResponse(suppliers)}, nil
	}

	statsBaseQuery := db.DB.Model(&models.Supplier{})
	var total int64
	if err := statsBaseQuery.Session(&gorm.Session{}).Count(&total).Error; err != nil {
		return SupplierListResponse{}, err
	}

	var active int64
	if err := statsBaseQuery.Session(&gorm.Session{}).Where("status = ?", "Active").Count(&active).Error; err != nil {
		return SupplierListResponse{}, err
	}

	var pendingReview int64
	if err := statsBaseQuery.Session(&gorm.Session{}).Where("status = ?", "OnReview").Count(&pendingReview).Error; err != nil {
		return SupplierListResponse{}, err
	}

	var items []models.Supplier
	if err := baseQuery.Order("name asc").Limit(pageSize).Offset((page - 1) * pageSize).Find(&items).Error; err != nil {
		return SupplierListResponse{}, err
	}

	return SupplierListResponse{
		Items:    MapSuppliersToResponse(items),
		Total:    total,
		Page:     page,
		PageSize: pageSize,
		Metadata: SupplierListMetadata{
			Pagination: PartnerListPaginationMeta{
				Total:    total,
				Page:     page,
				PageSize: pageSize,
			},
			Stats: SupplierListStats{
				Total:         total,
				Active:        active,
				PendingReview: pendingReview,
			},
		},
	}, nil
}

func SaveCustomer(input SaveCustomerRequest, actorID string, operator string, ip string) (CustomerResponse, error) {
	model := MapSaveCustomerRequestToModel(input)
	model.Name = strings.TrimSpace(model.Name)
	model.Code = strings.TrimSpace(model.Code)
	if model.Name == "" || model.Code == "" {
		return CustomerResponse{}, wrapPartnerIdentityRequiredError(ErrCustomerTransactionInvalidPayload)
	}
	if strings.TrimSpace(model.ID) == "" {
		model.Version = 1
		if err := db.DB.Create(&model).Error; err != nil {
			return CustomerResponse{}, err
		}
		return MapCustomerToResponse(model), nil
	}

	payload, err := json.Marshal(CustomerSavePayload{
		Delta: map[string]json.RawMessage{
			"name": json.RawMessage(`{"o":null,"n":null}`),
		},
		FinalData: MapCustomerToSaveSnapshot(model),
		Operator:  strings.TrimSpace(operator),
	})
	if err != nil {
		return CustomerResponse{}, err
	}

	updated, err := ExecuteCustomerTransaction(ExecuteCustomerTransactionInput{
		CustomerID:      model.ID,
		Intent:          CustomerTransactionIntentSave,
		ActorID:         strings.TrimSpace(actorID),
		Operator:        strings.TrimSpace(operator),
		ExpectedVersion: input.Version,
		Payload:         payload,
		IP:              strings.TrimSpace(ip),
	})
	if err != nil {
		return CustomerResponse{}, err
	}

	return MapCustomerToResponse(*updated), nil
}

func PatchCustomer(input PatchCustomerRequest, actorID string, operator string, ip string) (CustomerResponse, error) {
	var current models.Customer
	if err := db.DB.Where("id = ?", input.ID).First(&current).Error; err != nil {
		return CustomerResponse{}, err
	}

	delta := make(map[string]json.RawMessage)
	appendStringDelta := func(key string, value *string, currentValue string) {
		if value == nil {
			return
		}
		delta[key] = json.RawMessage([]byte(`{"o":` + marshalJSONString(currentValue) + `,"n":` + marshalJSONString(*value) + `}`))
	}
	appendFloatDelta := func(key string, value *float64, currentValue float64) {
		if value == nil {
			return
		}
		delta[key] = json.RawMessage([]byte(marshalFloatDelta(currentValue, *value)))
	}

	appendStringDelta("name", input.Name, current.Name)
	appendStringDelta("code", input.Code, current.Code)
	appendStringDelta("contactPerson", input.ContactPerson, current.ContactPerson)
	appendStringDelta("contactPhone", input.ContactPhone, current.ContactPhone)
	appendStringDelta("wechat", input.WeChat, current.WeChat)
	appendStringDelta("whatsapp", input.WhatsApp, current.WhatsApp)
	appendStringDelta("facebook", input.Facebook, current.Facebook)
	appendStringDelta("instagram", input.Instagram, current.Instagram)
	appendStringDelta("telegram", input.Telegram, current.Telegram)
	appendStringDelta("email", input.Email, current.Email)
	appendStringDelta("address", input.Address, current.Address)
	appendStringDelta("status", input.Status, current.Status)
	appendFloatDelta("creditLimit", input.CreditLimit, current.CreditLimit)
	appendFloatDelta("balance", input.Balance, current.Balance)

	payload, err := json.Marshal(CustomerSavePayload{
		Delta:     delta,
		FinalData: MapPatchCustomerRequestToSaveSnapshot(current, input),
		Operator:  strings.TrimSpace(operator),
	})
	if err != nil {
		return CustomerResponse{}, err
	}

	updated, err := ExecuteCustomerTransaction(ExecuteCustomerTransactionInput{
		CustomerID:      input.ID,
		Intent:          CustomerTransactionIntentSave,
		ActorID:         strings.TrimSpace(actorID),
		Operator:        strings.TrimSpace(operator),
		ExpectedVersion: input.Version,
		Payload:         payload,
		IP:              strings.TrimSpace(ip),
	})
	if err != nil {
		return CustomerResponse{}, err
	}

	return MapCustomerToResponse(*updated), nil
}

func SaveSupplier(input SaveSupplierRequest, actorID string, operator string, ip string) (SupplierResponse, error) {
	model := MapSaveSupplierRequestToModel(input)
	model.Name = strings.TrimSpace(model.Name)
	model.Code = strings.TrimSpace(model.Code)
	if model.Name == "" || model.Code == "" {
		return SupplierResponse{}, wrapPartnerIdentityRequiredError(ErrSupplierTransactionInvalidPayload)
	}
	if strings.TrimSpace(model.ID) == "" {
		model.Version = 1
		if err := db.DB.Create(&model).Error; err != nil {
			return SupplierResponse{}, err
		}
		syncSupplierToSearch(model)
		return MapSupplierToResponse(model), nil
	}

	payload, err := json.Marshal(SupplierSavePayload{
		Delta: map[string]json.RawMessage{
			"name": json.RawMessage(`{"o":null,"n":null}`),
		},
		FinalData: MapSaveSupplierSnapshotFromModel(model),
		Operator:  strings.TrimSpace(operator),
	})
	if err != nil {
		return SupplierResponse{}, err
	}

	updated, err := ExecuteSupplierTransaction(ExecuteSupplierTransactionInput{
		SupplierID:      model.ID,
		Intent:          SupplierTransactionIntentSave,
		ActorID:         strings.TrimSpace(actorID),
		Operator:        strings.TrimSpace(operator),
		ExpectedVersion: input.Version,
		Payload:         payload,
		IP:              strings.TrimSpace(ip),
	})
	if err != nil {
		return SupplierResponse{}, err
	}

	return MapSupplierToResponse(*updated), nil
}

func PatchSupplier(input PatchSupplierRequest, actorID string, operator string, ip string) (SupplierResponse, error) {
	var current models.Supplier
	if err := db.DB.Where("id = ?", input.ID).First(&current).Error; err != nil {
		return SupplierResponse{}, err
	}

	delta := make(map[string]json.RawMessage)
	appendStringDelta := func(key string, value *string, currentValue string) {
		if value == nil {
			return
		}
		delta[key] = json.RawMessage([]byte(`{"o":` + marshalJSONString(currentValue) + `,"n":` + marshalJSONString(*value) + `}`))
	}
	appendFloatDelta := func(key string, value *float64, currentValue float64) {
		if value == nil {
			return
		}
		delta[key] = json.RawMessage([]byte(marshalFloatDelta(currentValue, *value)))
	}

	appendStringDelta("name", input.Name, current.Name)
	appendStringDelta("code", input.Code, current.Code)
	appendStringDelta("category", input.Category, current.Category)
	appendStringDelta("mainProducts", input.MainProducts, current.MainProducts)
	appendStringDelta("contactPerson", input.ContactPerson, current.ContactPerson)
	appendStringDelta("contactPhone", input.ContactPhone, current.ContactPhone)
	appendStringDelta("wechat", input.WeChat, current.WeChat)
	appendStringDelta("whatsapp", input.WhatsApp, current.WhatsApp)
	appendStringDelta("facebook", input.Facebook, current.Facebook)
	appendStringDelta("instagram", input.Instagram, current.Instagram)
	appendStringDelta("telegram", input.Telegram, current.Telegram)
	appendStringDelta("email", input.Email, current.Email)
	appendStringDelta("address", input.Address, current.Address)
	appendStringDelta("status", input.Status, current.Status)
	appendFloatDelta("rating", input.Rating, current.Rating)

	payload, err := json.Marshal(SupplierSavePayload{
		Delta:     delta,
		FinalData: MapPatchSupplierRequestToSaveSnapshot(current, input),
		Operator:  strings.TrimSpace(operator),
	})
	if err != nil {
		return SupplierResponse{}, err
	}

	updated, err := ExecuteSupplierTransaction(ExecuteSupplierTransactionInput{
		SupplierID:      input.ID,
		Intent:          SupplierTransactionIntentSave,
		ActorID:         strings.TrimSpace(actorID),
		Operator:        strings.TrimSpace(operator),
		ExpectedVersion: input.Version,
		Payload:         payload,
		IP:              strings.TrimSpace(ip),
	})
	if err != nil {
		return SupplierResponse{}, err
	}

	return MapSupplierToResponse(*updated), nil
}

func marshalJSONString(value string) string {
	encoded, _ := json.Marshal(value)
	return string(encoded)
}

func wrapPartnerIdentityRequiredError(base error) error {
	return fmt.Errorf("%w: code and name must not be empty", base)
}

func marshalFloatDelta(oldValue float64, newValue float64) string {
	oldEncoded, _ := json.Marshal(oldValue)
	newEncoded, _ := json.Marshal(newValue)
	return `{"o":` + string(oldEncoded) + `,"n":` + string(newEncoded) + `}`
}
