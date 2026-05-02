package services

import (
	"fmt"
	"xdfc-server/audit"
	"xdfc-server/db"
	"xdfc-server/models"
	"xdfc-server/services/trading_audit"

	"gorm.io/gorm"
)

// DeleteCustomer performs a logical delete and records a trading audit event.
func DeleteCustomer(customerID, actorID, username, ip string) error {
	var customer models.Customer
	if err := db.DB.Where("id = ?", customerID).First(&customer).Error; err != nil {
		return fmt.Errorf("delete customer: %w", err)
	}
	if err := db.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&customer).Update("version", customer.Version+1).Error; err != nil {
			return fmt.Errorf("delete customer: %w", err)
		}
		if err := tx.Delete(&customer).Error; err != nil {
			return fmt.Errorf("delete customer: %w", err)
		}
		return recordAuditEventTx(tx, trading_audit.BuildCustomerDeleteEvent(customerID, audit.AuditActor{UserID: actorID, Username: username, IP: ip, Source: "http"}))
	}); err != nil {
		return err
	}
	deleteSearchDocument(customer.ID)
	return nil
}

// DeleteSupplier performs a logical delete and records a trading audit event.
func DeleteSupplier(supplierID, actorID, username, ip string) error {
	var supplier models.Supplier
	if err := db.DB.Where("id = ?", supplierID).First(&supplier).Error; err != nil {
		return fmt.Errorf("delete supplier: %w", err)
	}
	if err := db.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&supplier).Update("version", supplier.Version+1).Error; err != nil {
			return fmt.Errorf("delete supplier: %w", err)
		}
		if err := tx.Delete(&supplier).Error; err != nil {
			return fmt.Errorf("delete supplier: %w", err)
		}
		return recordAuditEventTx(tx, trading_audit.BuildSupplierDeleteEvent(supplierID, audit.AuditActor{UserID: actorID, Username: username, IP: ip, Source: "http"}))
	}); err != nil {
		return err
	}
	deleteSearchDocument(supplier.ID)
	return nil
}
