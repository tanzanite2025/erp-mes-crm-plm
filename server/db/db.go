package db

import (
	"encoding/json"
	"errors"
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

func defaultProductAttributeOptions() []models.ProductAttributeOption {
	return []models.ProductAttributeOption{
		{CategoryKey: "techSeries", Value: "NORMAL", LabelZh: "常规系列", LabelEn: "Standard Series", Description: "常温常规工艺系列", SortOrder: 10, Active: true},
		{CategoryKey: "techSeries", Value: "HIGHTG", LabelZh: "高温系列", LabelEn: "High TG Series", Description: "高温工艺系列", SortOrder: 20, Active: true},
		{CategoryKey: "tireType", Value: "Hooked", LabelZh: "有钩", LabelEn: "Hooked", Description: "有钩车圈类型", SortOrder: 10, Active: true},
		{CategoryKey: "tireType", Value: "Hookless", LabelZh: "无钩", LabelEn: "Hookless", Description: "无钩车圈类型", SortOrder: 20, Active: true},
		{CategoryKey: "tireType", Value: "Tubular", LabelZh: "管胎", LabelEn: "Tubular", Description: "管胎车圈类型", SortOrder: 30, Active: true},
		{CategoryKey: "brakeType", Value: "Disc", LabelZh: "碟刹", LabelEn: "Disc", Description: "碟刹制动类型", SortOrder: 10, Active: true},
		{CategoryKey: "versionLevel", Value: "STD", LabelZh: "标准版", LabelEn: "Standard", Description: "标准版本等级", SortOrder: 10, Active: true},
		{CategoryKey: "versionLevel", Value: "Lightweight", LabelZh: "轻量版", LabelEn: "Lightweight", Description: "轻量化版本等级", SortOrder: 20, Active: true},
		{CategoryKey: "versionLevel", Value: "Ultralight", LabelZh: "超轻版", LabelEn: "Ultralight", Description: "超轻版本等级", SortOrder: 30, Active: true},
		{CategoryKey: "versionLevel", Value: "Reinforced", LabelZh: "加强版", LabelEn: "Reinforced", Description: "加强型版本等级", SortOrder: 40, Active: true},
	}
}

func defaultProductAttributeCategories() []models.ProductAttributeCategory {
	return []models.ProductAttributeCategory{
		{Key: "techSeries", NameZh: "工艺系列", NameEn: "Technical Series", Description: "产品工艺系列分类", SortOrder: 10, Active: true},
		{Key: "tireType", NameZh: "轮圈类型", NameEn: "Rim Type", Description: "产品轮圈类型分类", SortOrder: 20, Active: true},
		{Key: "brakeType", NameZh: "制动类型", NameEn: "Brake Type", Description: "产品制动类型分类", SortOrder: 30, Active: true},
		{Key: "versionLevel", NameZh: "版本等级", NameEn: "Version Level", Description: "产品版本等级分类", SortOrder: 40, Active: true},
	}
}

func ensureDefaultProductAttributeCategories() {
	if DB == nil || !DB.Migrator().HasTable(&models.ProductAttributeCategory{}) {
		return
	}

	for _, category := range defaultProductAttributeCategories() {
		var existing models.ProductAttributeCategory
		err := DB.Where("key = ?", category.Key).First(&existing).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			item := category
			item.MasterDataControl.Normalize("R1")
			item.Version = 1
			if err := DB.Create(&item).Error; err != nil {
				log.Fatal("[CRITICAL] Failed to seed default product attribute category: ", err)
			}
			continue
		}

		if err != nil {
			log.Fatal("[CRITICAL] Failed to query default product attribute category: ", err)
		}
	}
}

func ensureDefaultProductAttributeOptions() {
	if DB == nil || !DB.Migrator().HasTable(&models.ProductAttributeOption{}) {
		return
	}

	for _, option := range defaultProductAttributeOptions() {
		var existing models.ProductAttributeOption
		err := DB.Where("category = ? AND value = ?", option.CategoryKey, option.Value).First(&existing).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			item := option
			item.MasterDataControl.Normalize("R1")
			item.Version = 1
			if err := DB.Create(&item).Error; err != nil {
				log.Fatal("[CRITICAL] Failed to seed default product attribute option: ", err)
			}
			continue
		}

		if err != nil {
			log.Fatal("[CRITICAL] Failed to query default product attribute option: ", err)
		}
	}
}

func ensureDefaultWarehouseCategories() {
	if DB == nil || !DB.Migrator().HasTable(&models.WarehouseCategory{}) {
		return
	}

	for _, category := range models.DefaultWarehouseCategories {
		var existing models.WarehouseCategory
		err := DB.Where("code = ?", category.Code).First(&existing).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			item := category
			if createErr := DB.Create(&item).Error; createErr != nil {
				log.Fatal("[CRITICAL] Failed to seed default warehouse category: ", createErr)
			}
			continue
		}

		if err != nil {
			log.Fatal("[CRITICAL] Failed to query default warehouse category: ", err)
		}

		updates := map[string]interface{}{}
		if !existing.IsSystem {
			updates["is_system"] = true
		}
		if existing.Name == "" {
			updates["name"] = category.Name
		}
		if existing.SortOrder == 0 {
			updates["sort_order"] = category.SortOrder
		}
		if !existing.AllowInbound && !existing.AllowShipment && !existing.AllowStocktake &&
			!existing.AllowPurchaseReceipt && !existing.DefaultForProductInbound &&
			!existing.DefaultForMaterialInbound && !existing.DefaultForPurchaseReceipt {
			updates["allow_inbound"] = category.AllowInbound
			updates["allow_shipment"] = category.AllowShipment
			updates["allow_stocktake"] = category.AllowStocktake
			updates["allow_purchase_receipt"] = category.AllowPurchaseReceipt
			updates["default_for_product_inbound"] = category.DefaultForProductInbound
			updates["default_for_material_inbound"] = category.DefaultForMaterialInbound
			updates["default_for_purchase_receipt"] = category.DefaultForPurchaseReceipt
		}

		if len(updates) == 0 {
			continue
		}
		if updateErr := DB.Model(&existing).Updates(updates).Error; updateErr != nil {
			log.Fatal("[CRITICAL] Failed to align default warehouse category: ", updateErr)
		}
	}

	ensureWarehouseCategoryDefaultFlag("default_for_product_inbound", "FINISHED")
	ensureWarehouseCategoryDefaultFlag("default_for_material_inbound", "MATERIAL")
	ensureWarehouseCategoryDefaultFlag("default_for_purchase_receipt", "MATERIAL")
}

func ensureWarehouseCategoryDefaultFlag(column string, code string) {
	var count int64
	if err := DB.Model(&models.WarehouseCategory{}).Where(column+" = ?", true).Count(&count).Error; err != nil {
		log.Fatal("[CRITICAL] Failed to verify warehouse category default flag: ", err)
	}
	if count > 0 {
		return
	}

	if err := DB.Model(&models.WarehouseCategory{}).
		Where("code = ?", code).
		Update(column, true).Error; err != nil {
		log.Fatal("[CRITICAL] Failed to backfill warehouse category default flag: ", err)
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

func ensureDefaultAdminRoleTemplate() {
	if DB == nil || !DB.Migrator().HasTable(&models.Role{}) {
		return
	}

	fallbackPermissions := authz.DeduplicatePermissionIDs(authz.AdminFallbackPermissions)
	serializedFallbackPermissions, err := json.Marshal(fallbackPermissions)
	if err != nil {
		log.Fatal("Failed to serialize admin fallback permissions:", err)
	}

	var adminRole models.Role
	err = DB.Unscoped().Where("LOWER(role_id) = ?", "admin").First(&adminRole).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		created := models.Role{
			RoleID:      "admin",
			Label:       "Admin",
			Color:       "bg-red-500/10 text-red-600 border-red-200",
			Permissions: string(serializedFallbackPermissions),
		}
		if createErr := DB.Create(&created).Error; createErr != nil {
			log.Fatal("Failed to create default admin role template:", createErr)
		}
		return
	}
	if err != nil {
		log.Fatal("Failed to query admin role template:", err)
	}

	currentPermissions := authz.ParsePermissionIDs(adminRole.Permissions)
	mergedPermissions := authz.DeduplicatePermissionIDs(append(currentPermissions, fallbackPermissions...))
	serializedMergedPermissions, err := json.Marshal(mergedPermissions)
	if err != nil {
		log.Fatal("Failed to serialize merged admin permissions:", err)
	}

	needsUpdate := adminRole.Permissions != string(serializedMergedPermissions)
	if strings.TrimSpace(adminRole.Label) == "" || strings.TrimSpace(adminRole.Color) == "" || adminRole.DeletedAt.Valid {
		needsUpdate = true
	}
	if !needsUpdate {
		return
	}

	updates := map[string]interface{}{
		"permissions": string(serializedMergedPermissions),
	}
	if strings.TrimSpace(adminRole.Label) == "" {
		updates["label"] = "Admin"
	}
	if strings.TrimSpace(adminRole.Color) == "" {
		updates["color"] = "bg-red-500/10 text-red-600 border-red-200"
	}
	if adminRole.DeletedAt.Valid {
		updates["deleted_at"] = nil
	}

	if updateErr := DB.Unscoped().Model(&adminRole).Updates(updates).Error; updateErr != nil {
		log.Fatal("Failed to align default admin role template:", updateErr)
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

func ensureUserRolePrimaryUniqueIndex() {
	if DB == nil || !DB.Migrator().HasTable(&models.UserRole{}) {
		return
	}

	if err := DB.Exec(`
		CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_user_primary_unique
		ON user_roles (user_id)
		WHERE deleted_at IS NULL AND is_primary = true;
	`).Error; err != nil {
		log.Fatal("Failed to enforce unique primary role per user:", err)
	}
}

func logLocalDbAuthHint(dsn string, err error) {
	if err == nil {
		return
	}

	message := strings.ToLower(err.Error())
	if !strings.Contains(message, "password authentication failed") &&
		!strings.Contains(message, "failed sasl auth") &&
		!strings.Contains(message, "sqlstate 28p01") {
		return
	}

	normalizedDSN := strings.ToLower(strings.TrimSpace(dsn))
	if !strings.Contains(normalizedDSN, "127.0.0.1") &&
		!strings.Contains(normalizedDSN, "localhost") &&
		!strings.Contains(normalizedDSN, "@db:5432") &&
		!strings.Contains(normalizedDSN, "host=db") {
		return
	}

	log.Printf("[DEV_HINT] DATABASE_URL credentials were rejected by the local Postgres instance.")
	log.Printf("[DEV_HINT] Current local dev conventions use xdfc_local_dev_password for xdfc_admin.")
	log.Printf("[DEV_HINT] If server/postgres_data was initialized with different credentials before, rebuild it with:")
	log.Printf("[DEV_HINT]   powershell -ExecutionPolicy Bypass -File .\\server\\dev-up.ps1 -ResetDb")
}

// InitDB initializes the database connection and schema.
func InitDB(dsn string) {
	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		logLocalDbAuthHint(dsn, err)
		log.Fatal("Failed to connect to database:", err)
	}

	// Register global audit hooks.
	audit.RegisterHooks(DB)
	// Start background audit archiver task.
	audit.StartArchiver(DB)
	// Migrating database schemas.
	fmt.Println("Migrating database schemas...")
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
		&models.EngineeringSpec{},
		&models.ProductAttributeCategory{},
		&models.ProductAttributeOption{},
		&models.ProductTypeAttributeBinding{},
		&models.ProductAttributeValue{},
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
		&models.PaymentMethod{},
		&models.PaymentTerm{},
		&models.TaxRate{},
		&models.Role{},
		&models.OrgUnit{},
		&models.ProductionUnit{},
		&models.OrgProductionMapping{},
		&models.Position{},
		&models.EmployeeAssignment{},
		&models.OrgDefaultRole{},
		&models.PositionRole{},
		&models.UserRole{},
		&models.EmployeeRole{},
		&models.ProductionPlan{},
		&models.ProductionTask{},

		// 婵犵妲呴崑鎾跺緤娴犲鑸?闂傚倷娴囬褎顨ョ粙鍖¤€块梺顒€绉寸壕濠氭煏閸繍妲归柛瀣戠换娑㈠幢濡搫顫庨梺宕囩帛濮婂綊濡甸崟顖氱閻犻缚妗ㄩ幋閿嬬節?(Experimental Center)
		&models.ExpCategory{},
		&models.ExpEquipment{},
		&models.ExpTask{},
		&models.ExpReport{},

		// 婵犵妲呴崑鎾跺緤娴犲鐤い鏍ㄧ矌閻棗顭块懜闈涘闁?闂傚倷娴囧畷鍨叏閻㈢绀夐柟杈剧畱缁€澶愭煙鏉堝墽鐣遍梻鍌ゅ灦閺屟嗙疀閹剧纭€婵炴垶鎸哥粔褰掑蓟閵娿儮妲堟俊顖欒娴犻箖姊?(Quality Management)
		&models.InspectionStandard{},
		&models.InspectionTask{},
		&models.QualityAbnormality{},

		// 婵犵妲呴崑鎾跺緤娴犲鐤い鏍ㄧ矆閻?闂傚倷娴囧畷鍨叏瀹曞洦濯奸柡灞诲劚閻掑灚銇勯幒鍡椾壕閻庢鍠栭悥濂搞€侀弴銏″仼閻忕偟顭堟禍楣冩偡濞嗗繐顏柛瀣█閺屾稒鎯旈埥鍡楁缂?(Piecework Management)
		&models.Team{},
		&models.PieceworkRate{},
		&models.PieceworkRecord{},

		// 婵犵妲呴崑鎾跺緤娴犲鐤い鏍剱閺?闂傚倷娴囧畷鍨叏瀹ュ绀冩い顓熷灣鏉╂ê鈹戞幊閸婃鎱ㄩ弶鎳ㄦ椽顢橀悜鍡樼稁婵炲濮撮鍛矆鐎ｎ偁浜滈柟鎵虫櫅閻掔儤绻涢懝浼村摵缂佺粯鐩弫鎰板川椤旂虎妲洪梻浣告啞閹歌崵鎹㈤崘顏佸亾?(Asset Metadata)
		&models.EquipmentPartner{},
		&models.MoldDrawing{},
		&models.MoldDrawingLog{},

		// 闂傚倸鍊峰ù鍥р枍閺囩姭鍋撶粭娑樻处閸嬶繝寮堕崼姘珖缂?缂傚倸鍊搁崐椋庢閿熺姴鍨傞梻鍫熺〒閺嗭箓鏌ｉ姀銈嗘锭闁搞劍绻冪换娑橆啅椤旇崵鍑归梺缁樺笧缁垶骞堥妸銉庣喖宕稿Δ鈧幗鐢告⒑閸濆嫭顥滅紒缁樏～蹇撁洪鍕獓闁荤姵浜介崜閬嶅Χ婢跺鍘?(System Configs)
		&models.SystemConfig{},

		// 婵犵妲呴崑鎾跺緤娴犲鐤い鏍剱閺?闂傚倸鍊烽懗鍓佸垝椤栫偛桅婵炴垯鍨归悿鐐節婵犲倹鍣介柣顓炵墦閺屻劑寮撮悙娴嬪亾閸濄儳涓嶉柟鎯板Г閻撳繐鈹戦悙闈涗壕闁哄缍婇弻娑氣偓锝庡亝鐏忎即鏌熷畡鐗堝櫧缂侇喗鐟ч幑鍕Ω閵夈儳鐣?(Logistics Push - Hot-Pluggable)
		// 闂傚倸鍊风粈渚€骞夐敓鐘偓鍐川閺夋垵鍋嶉梺鍝勭Р閸斿海绮绘ィ鍐╃厱闁靛绲芥俊鎸庛亜閳哄啫鍘撮柡灞炬礃瀵板嫰宕煎┑鍐ㄤ壕婵°倕鎳忛崑锟犳煙閸撗呭笡闁稿濮电换娑㈠箣閻愰潧鈪规繝娈垮枓閸嬫挾绱撻崒娆戠獢缂傚倹宀稿畷鎴﹀箛椤旂厧鐏婇梺鍝勫暙閸婂湱鈧碍宀搁幃姗€鎮欓幓鎺嗗亾閻戣棄绾фい鎾卞灪閻撶喖鏌ｅΟ鍝勬毐濠殿喖鍊块弻娑欐償閵堝懎鎯炲┑鈥冲级閸旀洟鍩為幋锕€鐐婇柍鍦亾閻忓啴鏌ｆ惔锛勭暛闁稿酣浜堕獮濠冩償閵婏絺鍋撻崘銊㈡闁靛骏绱曢崢鍗炩攽閻樼粯娑ф俊顐ｇ☉閻☆參姊绘担鍛婂暈闁荤啙鍥х；闁规崘顕х粻顖炴煕濞戝崬骞愰柡瀣叄閺岀喖鏌囬敃鈧晶濠氭煛閸☆厾绡€婵﹥妞藉畷顐﹀礋椤撶儐鏆俊鐐€х€靛矂宕归柆宥呯疄闁靛鍎Σ鍫ユ煏韫囧ň鍋撻搹顐ゆ殸?		&models.DeliveryOrder{},
		&models.DeliveryTrackingDetail{},
		&models.LogisticsAPIProvider{},

		// 缂備緡鍨靛畷鐢靛垝閻戞鈻旈幖绮光偓鑼煑婵炶揪绲剧划宥囩矈閿曞倹鐓€鐎广儱娲ㄩ弸?(System & Workflow)
		&models.EnterpriseConfig{},
		&models.StandardCommand{},
		&models.NotificationRule{},
		&models.AuditLog{},
	)
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}
	// --- 闂傚鍓﹂崑鍌炲船閵堝洠鍋撻棃娑氱Ш缂傚秴鐗婂缁樻媴閻?(v8.7) ---
	DB.Exec("UPDATE users SET role = 'admin' WHERE role = 'superadmin'")
	DB.Exec("UPDATE roles SET role_id = 'admin' WHERE role_id = 'superadmin'")
	hardenSeedAdminRole()
	ensureUserIntegrityConstraints()
	ensureUserRolePrimaryUniqueIndex()

	ensurePackagingRuleMaterialUniqueIndex()
	fmt.Println("Database migration completed.")
	sqlDB, err := DB.DB()
	if err == nil {
		sqlDB.SetMaxIdleConns(10)
		sqlDB.SetMaxOpenConns(100)
		sqlDB.SetConnMaxLifetime(time.Hour)
		fmt.Println("Database connection pool tuned: MaxIdle=10, MaxOpen=100")
	}

	// 3. 闂佸憡甯楃换鍌烇綖閹版澘绀?Seed
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
	ensureDefaultAdminRoleTemplate()
	ensureDefaultProductAttributeCategories()
	ensureDefaultProductAttributeOptions()
	ensureDefaultWarehouseCategories()

	// 6. 闂傚倸鍊风粈渚€骞夐敍鍕殰婵°倕鍟畷鏌ユ煕瀹€鈧崕鎴犵礊閺嶎厽鐓欓梺顓ㄧ畱閺嬫盯鎮楅崹顐ゅ弨闁哄被鍊栭幈銊╁箛椤戣棄浜炬俊銈呮噹閺勩儵鏌ｅΟ鑲╁笡闁绘挻娲樼换娑㈠幢濡ゅ啰顔囬梺閫炲苯澧紓宥咃工椤?Seed
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
