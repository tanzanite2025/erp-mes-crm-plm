package services

import (
	"xdfc-server/db"

	"gorm.io/gorm"
)

type transactionManager interface {
	DB() *gorm.DB
	WithinTransaction(fn func(tx *gorm.DB) error) error
}

type serviceRuntime struct {
	txManager   transactionManager
	auditLogger auditLogger
}

type gormTransactionManager struct{}

func (gormTransactionManager) DB() *gorm.DB {
	return db.DB
}

func (gormTransactionManager) WithinTransaction(fn func(tx *gorm.DB) error) error {
	return db.DB.Transaction(fn)
}

func defaultServiceRuntime() serviceRuntime {
	return serviceRuntime{
		txManager:   gormTransactionManager{},
		auditLogger: defaultAuditLogger{},
	}
}
