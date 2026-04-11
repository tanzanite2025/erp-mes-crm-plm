package main

import (
	"fmt"
	"log"
	"os"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"
	"xdfc-server/services"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	dsn := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if dsn == "" {
		log.Fatal("[CRITICAL] DATABASE_URL is required for finance dictionary migration.")
	}

	conn, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("[CRITICAL] Failed to connect to database: %v", err)
	}

	db.DB = conn

	if err := services.EnsureFinanceDictionaryCompatibility(); err != nil {
		log.Fatalf("[CRITICAL] Failed to migrate finance dictionaries: %v", err)
	}

	var paymentTermCount int64
	if err := conn.Model(&models.PaymentTerm{}).Count(&paymentTermCount).Error; err != nil {
		log.Fatalf("[CRITICAL] Failed to count payment_terms: %v", err)
	}

	var paymentMethodCount int64
	if err := conn.Model(&models.PaymentMethod{}).Count(&paymentMethodCount).Error; err != nil {
		log.Fatalf("[CRITICAL] Failed to count payment_methods: %v", err)
	}

	fmt.Printf("finance dictionary migration completed: payment_terms=%d payment_methods=%d\n", paymentTermCount, paymentMethodCount)
}
