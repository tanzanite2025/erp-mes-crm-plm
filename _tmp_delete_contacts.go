package main

import (
  "fmt"
  "log"
  "os"

  "gorm.io/driver/postgres"
  "gorm.io/gorm"
)

func main() {
  dsn := os.Getenv("DATABASE_URL")
  if dsn == "" {
    dsn = "postgres://xdfc_admin:xdfc_local_dev_password@127.0.0.1:5432/xdfc_official?sslmode=disable"
  }

  db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
  if err != nil {
    log.Fatal(err)
  }

  res := db.Exec(`DELETE FROM vehicle_contact_bindings WHERE contact_name IN ('陈经理','王师傅','周调度') OR supplier_name IN ('达运物流','演示供应商','Demo Logistics');`)
  if res.Error != nil {
    log.Fatal(res.Error)
  }
  fmt.Println(res.RowsAffected)
}
