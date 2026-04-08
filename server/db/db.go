package db

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"xdfc-server/audit"
	"xdfc-server/authz"
	"xdfc-server/models"

	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

type duplicatePackagingRuleRow struct {
	MaterialID string
	Count      int64
}

func failOnDuplicatePackagingRules() {
	if DB == nil || !DB.Migrator().HasTable(&models.PackagingRule{}) {
		return
	}

	var duplicates []duplicatePackagingRuleRow
	err := DB.Table("packaging_rules").
		Select("material_id, COUNT(*) AS count").
		Group("material_id").
		Having("COUNT(*) > 1").
		Scan(&duplicates).Error
	if err != nil {
		log.Fatal("Failed to verify packaging_rules uniqueness before migration:", err)
	}

	if len(duplicates) == 0 {
		return
	}

	samples := make([]string, 0, len(duplicates))
	for _, dup := range duplicates {
		samples = append(samples, fmt.Sprintf("%s(x%d)", dup.MaterialID, dup.Count))
	}
	log.Fatalf("[CRITICAL_DATA_INTEGRITY] packaging_rules contains duplicate material_id values. Clean these duplicates before startup: %s", strings.Join(samples, ", "))
}

func ensurePackagingRuleMaterialUniqueIndex() {
	if DB == nil || !DB.Migrator().HasTable(&models.PackagingRule{}) {
		return
	}

	if err := DB.Exec("DROP INDEX IF EXISTS idx_packaging_rules_material_id").Error; err != nil {
		log.Fatal("Failed to drop stale packaging_rules material_id index:", err)
	}
	if err := DB.Exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_packaging_rules_material_id ON packaging_rules (material_id)").Error; err != nil {
		log.Fatal("Failed to enforce packaging_rules material_id uniqueness:", err)
	}
}

func hardenSeedAdminRole() {
	if DB == nil || !DB.Migrator().HasTable(&models.User{}) {
		return
	}

	if err := DB.Exec(`
		UPDATE users
		SET role = 'admin'
		WHERE LOWER(username) = 'admin'
		  AND (role IS NULL OR length(btrim(role)) = 0)
	`).Error; err != nil {
		log.Fatal("Failed to harden seed admin role:", err)
	}
}

func ensureUserIntegrityConstraints() {
	if DB == nil || !DB.Migrator().HasTable(&models.User{}) {
		return
	}

	if err := DB.Exec(`
		DO $$
		BEGIN
			IF NOT EXISTS (
				SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_role_not_blank'
			) THEN
				ALTER TABLE users
				ADD CONSTRAINT chk_users_role_not_blank
				CHECK (role IS NOT NULL AND length(btrim(role)) > 0) NOT VALID;
			END IF;
		END
		$$;
	`).Error; err != nil {
		log.Fatal("Failed to add users role integrity constraint:", err)
	}

	if err := DB.Exec(`
		DO $$
		BEGIN
			IF NOT EXISTS (
				SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_status_allowed'
			) THEN
				ALTER TABLE users
				ADD CONSTRAINT chk_users_status_allowed
				CHECK (
					status IS NOT NULL
					AND status IN ('active', 'inactive', 'suspended')
				) NOT VALID;
			END IF;
		END
		$$;
	`).Error; err != nil {
		log.Fatal("Failed to add users status integrity constraint:", err)
	}
}

// InitDB 闁告帗绻傞～鎰板礌閺嶃劍娈堕柟璇″枛缁ㄨ鲸娼婚悙鏉戝
func InitDB(dsn string) {
	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// 注册全局审计对比钩子
	audit.RegisterHooks(DB)
	// 启动后台审计归档任务
	audit.StartArchiver(DB)

	// 闁煎浜滄慨鈺傛交娴ｇ洅鈺冩偘閵娧呮尝闁?	fmt.Println("Migrating database schemas...")
	failOnDuplicatePackagingRules()

	err = DB.AutoMigrate(
		&models.User{},
		&models.SalesOrder{},
		&models.SalesOrderLine{},
		&models.Customer{},
		&models.Supplier{},
		&models.Inventory{},
		&models.InboundRecord{},
		&models.ShipmentRecord{},
		&models.PrintBatch{},
		&models.Sequence{},
		&models.DictGroup{},
		&models.DictEntry{},
		&models.ProductType{},
		&models.LogisticsRecord{},
		&models.Product{},
		&models.ChangeOrder{},
		&models.BOM{},
		&models.BOMItem{},
		&models.BOMSubstituteItem{},
		&models.NumberingRule{},
		&models.ProcessStep{},
		&models.ProductionLine{},
		&models.LineSegment{},
		&models.JobCategory{},
		&models.Station{},
		&models.EngineeringSpec{},
		&models.Unit{},
		&models.ProductTemplate{},
		&models.Mold{},
		&models.Furnace{},
		&models.MoldLoan{},
		&models.Material{},
		&models.PackagingRule{},
		&models.Organization{},
		&models.Employee{},
		&models.WarehouseCategory{},
		&models.ApprovalConfig{},
		&models.ApprovalRequest{},
		&models.WorkflowDefinition{},
		&models.WorkflowInstance{},
		&models.WorkflowTask{},
		&models.LeaveRequest{},
		&models.FinancialVoucher{},
		&models.ClearingEntry{},
		&models.InventoryAdjustment{},
		&models.InventoryAdjustmentItem{},
		&models.StocktakeTask{},
		&models.StocktakeItem{},
		&models.PurchaseOrder{},
		&models.PurchaseOrderLine{},
		&models.Currency{},
		&models.PaymentTerm{},
		&models.TaxRate{},
		&models.Role{},
		&models.ProductionPlan{},
		&models.ProductionTask{},

		// 妫ｅ唭?閻庡湱鍋ら悰娆愮▔椤撶偟濡?(Experimental Center)
		&models.ExpCategory{},
		&models.ExpEquipment{},
		&models.ExpTask{},
		&models.ExpReport{},

		// 妫ｅ啯绀夐柨?閻犳劑鍔戦崳铏圭不閿涘嫭鍊?(Quality Management)
		&models.InspectionStandard{},
		&models.InspectionTask{},
		&models.QualityAbnormality{},

		// 妫ｅ啯灏?閻犱讲鈧弶顐界€规悶鍎寸粊?(Piecework Management)
		&models.Team{},
		&models.PieceworkRate{},
		&models.PieceworkRecord{},

		// 妫ｅ啯顔?閻犙冨妤犲洭姊介崟顐㈩潱濞ｅ洠鍓濇导?(Asset Metadata)
		&models.EquipmentPartner{},
		&models.MoldDrawing{},
		&models.MoldDrawingLog{},

		// 闁虫寧鐟辩粭?缂侇垵宕电划娲焻濮樿鲸鏆忛梺鏉跨Ф閻?(System Configs)
		&models.SystemConfig{},

		// 妫ｅ啯顔?闁绘せ鏅滅粊锕傚箳閵娾斁鍋撴担绋跨厬 (Logistics Push - Hot-Pluggable)
		// 闁告鍘栨繛鍥ㄧ閵夈倗鐟撻悶娑栧姀缁鸿偐绮旂拠灞備杭閻犳劑鍎荤槐婵囩▔瀹ュ懎顨涢柛婵嗙Т閸欑偓鎷呭▎鎰暡闁哄牆顦慨娑㈡嚄?		&models.DeliveryOrder{},
		&models.DeliveryTrackingDetail{},
		&models.LogisticsAPIProvider{},

		// 系统与工作流配置 (System & Workflow)
		&models.EnterpriseConfig{},
		&models.StandardCommand{},
		&models.NotificationRule{},
		&models.AuditLog{},
	)
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}
	// --- 身份对齐迁移 (v8.7) ---
	DB.Exec("UPDATE users SET role = 'admin' WHERE role = 'superadmin'")
	DB.Exec("UPDATE roles SET role_id = 'admin' WHERE role_id = 'superadmin'")
	hardenSeedAdminRole()
	ensureUserIntegrityConstraints()

	ensurePackagingRuleMaterialUniqueIndex()
	fmt.Println("Database migration completed.")

	// 4. Tune database connection pool.
	sqlDB, err := DB.DB()
	if err == nil {
		sqlDB.SetMaxIdleConns(10)
		sqlDB.SetMaxOpenConns(100)
		sqlDB.SetConnMaxLifetime(time.Hour)
		fmt.Println("Database connection pool tuned: MaxIdle=10, MaxOpen=100")
	}

	// 3. 初始化 Seed
	var count int64
	DB.Model(&models.User{}).Count(&count)
	if count == 0 {
		fmt.Println("No users found. Seeding initial admin...")

		adminPass := os.Getenv("INITIAL_ADMIN_PASSWORD")
		ginMode := os.Getenv("GIN_MODE")
		if adminPass == "" {
			if ginMode == "release" {
				log.Fatal("[CRITICAL_SECURITY] INITIAL_ADMIN_PASSWORD is required in release mode. Please set it in your environment.")
			} else {
				adminPass = "Wang622575"
				fmt.Println("[DEV_SEC_NOTICE] INITIAL_ADMIN_PASSWORD not set. Using debug fallback password.")
			}
		}

		// Use bcrypt cost 11 to balance security and startup latency.
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(adminPass), 11)
		if err != nil {
			log.Fatal("[CRITICAL_SECURITY] Failed to hash initial admin password: ", err)
		}
		admin := models.User{
			Username: "admin",
			Password: string(hashedPassword),
			Role:     "admin",
			Status:   "active",
		}
		DB.Create(&admin)
		fmt.Println("Initial admin 'admin' created.")
	}

	// 5. Seed default role
	var roleCount int64
	DB.Model(&models.Role{}).Count(&roleCount)
	if roleCount == 0 {
		fmt.Println("No roles found. Seeding initial admin role...")

		permissionJSON, err := json.Marshal(authz.AdminFallbackPermissions)
		if err != nil {
			log.Fatal("[CRITICAL_SECURITY] Failed to serialize initial role permissions: ", err)
		}

		superRole := models.Role{
			RoleID:      "admin",
			Label:       "Admin",
			Color:       "bg-red-500/10 text-red-600 border-red-200",
			Permissions: string(permissionJSON),
		}
		DB.Create(&superRole)
		fmt.Println("Initial role 'admin' created with full permissions.")
	}

	// 4. 闁煎浜滄慨鈺呭触鐏炵虎鍔勯柡浣哄瀹撲胶鈧稒顨呴崥鈧紒澶婄Т閻?(Seed)
	fmt.Println("Migrating database schemas completed. Seeding system dictionary...")

	// 妫ｅ啯鐦?鐎殿喖鎼慨蹇撱€掗崨顖涘€為柨娑欐皑婢у潡鎮堕崱妯盒梻鍕╁€栭悾顐︽偩濞嗘垶鐣遍柍銉︾矊閻牗鎷呭浣插亾濠靛浂娲ら煫?	DB.Where("code = ?", "EMPLOYEE_POSITION").Delete(&models.DictEntry{})
	DB.Where("code = ?", "PERSONNEL").Delete(&models.DictGroup{})

	// 濞ｅ浂鍠楅婊堟晬濮樺崬绠涢柛?SeedDictionary 闁革负鍔岄幃鎾寸▔閳ь剚绋夐鍕樁闁挎稑娼恇闁挎稑顦崬鎾晬瀹€鈧ú鍧楀箳閵夈劎娈堕柣顫妼瀹撳棝宕?	fmt.Println("Calling SeedDictionary...")
	if err := SeedDictionary(DB); err != nil {
		fmt.Printf("[ERROR] Failed to seed dictionary: %v\n", err)
	} else {
		fmt.Println("System dictionary seeded successfully.")
	}

	// 6. 闁告帗绻傞～鎰寲閼姐倗鍩犻柛娆忓€归弳?Seed
	var configCount int64
	DB.Model(&models.SystemConfig{}).Where("key = ?", "topology_auth_password").Count(&configCount)
	if configCount == 0 {
		topoPass := os.Getenv("TOPOLOGY_AUTH_PASSWORD")
		ginMode := os.Getenv("GIN_MODE")
		if topoPass == "" {
			if ginMode == "release" {
				log.Fatal("[CRITICAL_SECURITY] TOPOLOGY_AUTH_PASSWORD is required in release mode for production safety.")
			} else {
				topoPass = "622575"
				fmt.Println("[DEV_SEC_NOTICE] TOPOLOGY_AUTH_PASSWORD not set. Using debug fallback.")
			}
		}

		config := models.SystemConfig{
			Key:         "topology_auth_password",
			Value:       topoPass,
			Label:       "Topology Auth Password",
			Description: "Password used by topology-related endpoints. Must be at least 6 characters.",
		}
		DB.Create(&config)
		fmt.Println("Initial system config seeded.")
	}

}
