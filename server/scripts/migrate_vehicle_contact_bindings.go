package main

import (
	"fmt"
	"log"
	"os"

	"xdfc-server/db"
	"xdfc-server/models"
)

func main() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL is required")
	}

	db.InitDB(dsn)
	if db.DB == nil {
		log.Fatal("database not initialized")
	}

	if err := db.DB.AutoMigrate(&models.VehicleContactBinding{}); err != nil {
		log.Fatal(err)
	}

	fmt.Println("vehicle_contact_bindings migration completed")
}
