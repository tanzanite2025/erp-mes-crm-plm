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
	return db.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&models.Customer{}).Where("id = ?", customerID).Update("is_deleted", true).Error; err != nil {
			return fmt.Errorf("delete customer: %w", err)
		}
		return recordAuditEventTx(tx, trading_audit.BuildCustomerDeleteEvent(customerID, audit.AuditActor{UserID: actorID, Username: username, IP: ip, Source: "http"}))
	})
}

// DeleteSupplier performs a logical delete and records a trading audit event.
func DeleteSupplier(supplierID, actorID, username, ip string) error {
	return db.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&models.Supplier{}).Where("id = ?", supplierID).Update("is_deleted", true).Error; err != nil {
			return fmt.Errorf("delete supplier: %w", err)
		}
		return recordAuditEventTx(tx, trading_audit.BuildSupplierDeleteEvent(supplierID, audit.AuditActor{UserID: actorID, Username: username, IP: ip, Source: "http"}))
	})
}
