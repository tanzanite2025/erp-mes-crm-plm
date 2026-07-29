package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"time"
	"xdfc-server/authz"
	"xdfc-server/db"
	"xdfc-server/middleware"
	"xdfc-server/models"
	"xdfc-server/routes"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

const (
	acceptanceGuard      = "PRODUCTION_OUTSOURCE_ACCEPTANCE"
	acceptanceGuardValue = "1"

	fixtureRouteID      = "00000000-0000-0000-0000-000000000101"
	fixtureRouteCode    = "ACCEPTANCE-PRODUCTION-ROUTE"
	fixtureLineID       = "00000000-0000-0000-0000-000000000110"
	fixtureSegmentAID   = "00000000-0000-0000-0000-000000000211"
	fixtureSegmentBID   = "00000000-0000-0000-0000-000000000212"
	fixtureProcessAID   = "00000000-0000-0000-0000-000000000102"
	fixtureProcessBID   = "00000000-0000-0000-0000-000000000103"
	fixturePartnerID    = "00000000-0000-0000-0000-000000000104"
	fixtureOrderID      = "00000000-0000-0000-0000-000000000105"
	fixtureOrderLineID  = "00000000-0000-0000-0000-000000000106"
	fixtureBarcode      = "ACCEPTANCE-BC-001"
	fixtureCommandID    = "00000000-0000-0000-0000-000000000107"
	fixtureRuleID       = "00000000-0000-0000-0000-000000000108"
	fixtureStateEventID = "00000000-0000-0000-0000-000000000214"
	fixtureSourceCode   = "PRODUCTION_OUTSOURCE"
	fixtureActionCode   = "STATUS_CHANGED"
	fixtureEntity       = "SYSTEM"
	fixtureOperator     = "acceptance-fixture"
	fixtureCustomerID   = "acceptance-customer"
	fixtureProductID    = "00000000-0000-0000-0000-000000000109"
	fixtureMaterialID   = "00000000-0000-0000-0000-000000000114"
	fixtureProductName  = "委外验收产品"
	fixturePartnerName  = "委外验收单位"
	fixtureSourceNumber = "ACCEPTANCE-SOURCE-001"
	fixtureOutsourceNo  = "OSO-ACCEPTANCE-001"

	fixtureConcurrencyReleaseOrderID   = "00000000-0000-0000-0000-000000000115"
	fixtureConcurrencyReleaseLineID    = "00000000-0000-0000-0000-000000000116"
	fixtureConcurrencyCancelOrderID    = "00000000-0000-0000-0000-000000000117"
	fixtureConcurrencyCancelLineID     = "00000000-0000-0000-0000-000000000118"
	fixtureConcurrencySendOrderID      = "00000000-0000-0000-0000-000000000119"
	fixtureConcurrencySendLineID       = "00000000-0000-0000-0000-000000000120"
	fixtureConcurrencyDuplicateOrderID = "00000000-0000-0000-0000-000000000121"
	fixtureConcurrencyDuplicateLineID  = "00000000-0000-0000-0000-000000000122"
	fixtureConcurrencyReturnOrderID    = "00000000-0000-0000-0000-000000000123"
	fixtureConcurrencyReturnLineID     = "00000000-0000-0000-0000-000000000124"
	fixtureConcurrencySendBarcodeA     = "ACCEPTANCE-CONC-SEND-A"
	fixtureConcurrencySendBarcodeB     = "ACCEPTANCE-CONC-SEND-B"
	fixtureConcurrencyDuplicateBarcode = "ACCEPTANCE-CONC-DUPLICATE"
	fixtureConcurrencyReturnBarcodeA   = "ACCEPTANCE-CONC-RETURN-A"
	fixtureConcurrencyReturnBarcodeB   = "ACCEPTANCE-CONC-RETURN-B"
	fixtureConcurrencySendStateA       = "00000000-0000-0000-0000-000000000125"
	fixtureConcurrencySendStateB       = "00000000-0000-0000-0000-000000000126"
	fixtureConcurrencyDuplicateState   = "00000000-0000-0000-0000-000000000127"
	fixtureConcurrencyReturnStateA     = "00000000-0000-0000-0000-000000000128"
	fixtureConcurrencyReturnStateB     = "00000000-0000-0000-0000-000000000129"
	fixtureConcurrencySendEventA       = "00000000-0000-0000-0000-000000000130"
	fixtureConcurrencySendEventB       = "00000000-0000-0000-0000-000000000131"
	fixtureConcurrencyDuplicateEvent   = "00000000-0000-0000-0000-000000000132"
	fixtureConcurrencyReturnEventA     = "00000000-0000-0000-0000-000000000133"
	fixtureConcurrencyReturnEventB     = "00000000-0000-0000-0000-000000000134"
	fixtureForeignRouteID              = "00000000-0000-0000-0000-000000000135"
	fixtureForeignRouteStepID          = "00000000-0000-0000-0000-000000000136"
	fixtureAuthorizationUserID         = "00000000-0000-0000-0000-000000000137"
	fixtureAuthorizationPermissionID   = "00000000-0000-0000-0000-000000000138"
)

func main() {
	_ = godotenv.Load(".env.dev", "../.env.dev", "../../.env.dev", "../../server/.env.dev")
	requireDebugGuard()

	dsn := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if dsn == "" {
		log.Fatal("DATABASE_URL is required")
	}
	db.InitDB(dsn)

	command := "seed"
	if len(os.Args) > 1 {
		command = strings.ToLower(strings.TrimSpace(os.Args[1]))
	}

	switch command {
	case "seed":
		if err := cleanupFixture(); err != nil {
			log.Fatal(err)
		}
		if err := seedFixture(); err != nil {
			log.Fatal(err)
		}
		fmt.Printf(
			"fixture=production-outsource-acceptance routeId=%s orderId=%s lineId=%s productBarcode=%s\n",
			fixtureRouteID,
			fixtureOrderID,
			fixtureOrderLineID,
			fixtureBarcode,
		)
	case "cleanup":
		if err := cleanupFixture(); err != nil {
			log.Fatal(err)
		}
		fmt.Println("fixture=production-outsource-acceptance cleaned=true")
	case "redis-notification":
		db.InitRedis()
		if err := runRedisNotificationAcceptance(); err != nil {
			log.Fatal(err)
		}
	case "concurrency":
		if err := runPostgresConcurrencyAcceptance(); err != nil {
			log.Fatal(err)
		}
	case "authorization":
		if err := runAuthorizationAcceptance(); err != nil {
			log.Fatal(err)
		}
	default:
		log.Fatalf("unsupported command %q; use seed, cleanup, redis-notification, concurrency, or authorization", command)
	}
}

func requireDebugGuard() {
	if !strings.EqualFold(strings.TrimSpace(os.Getenv("GIN_MODE")), "debug") {
		log.Fatalf("%s requires GIN_MODE=debug", acceptanceGuard)
	}
	if strings.TrimSpace(os.Getenv(acceptanceGuard)) != acceptanceGuardValue {
		log.Fatalf("set %s=%s to run this command", acceptanceGuard, acceptanceGuardValue)
	}
}

func seedFixture() error {
	return db.DB.Transaction(func(tx *gorm.DB) error {
		processes := []models.ProcessStep{
			{
				BaseModel: models.BaseModel{ID: fixtureProcessAID},
				Code:      "ACCEPTANCE-PROCESS-A",
				Name:      "验收工序一",
				IsActive:  true,
			},
			{
				BaseModel: models.BaseModel{ID: fixtureProcessBID},
				Code:      "ACCEPTANCE-PROCESS-B",
				Name:      "委外验收工序",
				IsActive:  true,
			},
		}
		for _, process := range processes {
			if err := tx.Create(&process).Error; err != nil {
				return err
			}
		}

		route := models.ProductionRoute{
			BaseModel:   models.BaseModel{ID: fixtureRouteID},
			Code:        fixtureRouteCode,
			Name:        "委外真实链路验收路线",
			ProductID:   fixtureProductID,
			ProductName: fixtureProductName,
			Version:     1,
			Status:      "PUBLISHED",
		}
		if err := tx.Create(&route).Error; err != nil {
			return err
		}
		productionLine := models.ProductionLine{
			BaseModel: models.BaseModel{ID: fixtureLineID},
			Code:      "ACCEPTANCE-PRODUCTION-LINE",
			Name:      "委外验收产线",
			Version:   1,
			IsActive:  true,
		}
		if err := tx.Create(&productionLine).Error; err != nil {
			return err
		}
		segments := []models.LineSegment{
			{
				BaseModel: models.BaseModel{ID: fixtureSegmentAID},
				LineID:    fixtureLineID,
				Name:      "验收工段一",
				SortOrder: 1,
			},
			{
				BaseModel: models.BaseModel{ID: fixtureSegmentBID},
				LineID:    fixtureLineID,
				Name:      "委外验收工段",
				SortOrder: 2,
			},
		}
		for _, segment := range segments {
			if err := tx.Create(&segment).Error; err != nil {
				return err
			}
		}
		steps := []models.ProductionRouteStep{
			{
				BaseModel:     models.BaseModel{ID: "00000000-0000-0000-0000-000000000201"},
				RouteID:       fixtureRouteID,
				Sequence:      1,
				SegmentID:     fixtureSegmentAID,
				ProcessStepID: fixtureProcessAID,
				ExecutionMode: "IN_HOUSE",
				QualityGate:   "NONE",
			},
			{
				BaseModel:     models.BaseModel{ID: "00000000-0000-0000-0000-000000000202"},
				RouteID:       fixtureRouteID,
				Sequence:      2,
				SegmentID:     fixtureSegmentBID,
				ProcessStepID: fixtureProcessBID,
				ExecutionMode: "OUTSOURCE_REQUIRED",
				QualityGate:   "NONE",
			},
		}
		for _, step := range steps {
			if err := tx.Create(&step).Error; err != nil {
				return err
			}
		}

		partner := models.OutsourcePartner{
			BaseModel: models.BaseModel{ID: fixturePartnerID},
			Code:      "ACCEPTANCE-OUTSOURCE-PARTNER",
			Name:      fixturePartnerName,
			Status:    "ACTIVE",
			Version:   1,
		}
		if err := tx.Create(&partner).Error; err != nil {
			return err
		}

		order := models.OutsourceOrder{
			BaseModel:           models.BaseModel{ID: fixtureOrderID},
			OrderNo:             fixtureOutsourceNo,
			SourceType:          services.OutsourceOrderSourceProductionPlan,
			SourceID:            "acceptance-production-plan",
			SourceNo:            fixtureSourceNumber,
			CustomerID:          fixtureCustomerID,
			CustomerName:        "委外验收客户",
			PartnerID:           fixturePartnerID,
			PartnerNameSnapshot: fixturePartnerName,
			Status:              services.OutsourceOrderStatusDraft,
			TotalQuantity:       2,
			UOM:                 "PCS",
			Version:             1,
		}
		if err := tx.Create(&order).Error; err != nil {
			return err
		}
		if err := tx.Create(&models.Material{
			BaseModel: models.BaseModel{ID: fixtureMaterialID},
			Code:      "ACCEPTANCE-PRODUCT",
			Name:      fixtureProductName,
			UOM:       "PCS",
		}).Error; err != nil {
			return err
		}
		product := models.Product{
			BaseModel: models.BaseModel{ID: fixtureProductID},
			SKU:       "ACCEPTANCE-PRODUCT-SKU",
			Name:      fixtureProductName,
			Status:    "Active",
			Version:   1,
		}
		product.MasterDataControl.Normalize("R1")
		if err := tx.Omit("type_id", "engineering_spec_id").Create(&product).Error; err != nil {
			return err
		}
		if err := tx.Create(&models.ProductInventoryMaterialMapping{
			BaseModel:     models.BaseModel{ID: "00000000-0000-0000-0000-000000000232"},
			ProductID:     fixtureProductID,
			MaterialID:    fixtureMaterialID,
			Active:        true,
			MappingSource: "ACCEPTANCE",
		}).Error; err != nil {
			return err
		}
		if err := tx.Create(&models.Inventory{
			BaseModel:       models.BaseModel{ID: "00000000-0000-0000-0000-000000000230"},
			MaterialID:      fixtureMaterialID,
			MaterialName:    fixtureProductName,
			MaterialCode:    "ACCEPTANCE-PRODUCT",
			Quantity:        100,
			TotalValue:      1000,
			AverageUnitCost: 10,
			CategoryCode:    "FINISHED",
			UOM:             "PCS",
		}).Error; err != nil {
			return err
		}
		if err := tx.Create(&models.Inventory{
			BaseModel:    models.BaseModel{ID: "00000000-0000-0000-0000-000000000231"},
			MaterialID:   fixtureMaterialID,
			MaterialName: fixtureProductName,
			MaterialCode: "ACCEPTANCE-PRODUCT",
			CategoryCode: services.ProductionOutsourceInventoryCategory,
			UOM:          "PCS",
		}).Error; err != nil {
			return err
		}
		line := models.OutsourceOrderLine{
			BaseModel:        models.BaseModel{ID: fixtureOrderLineID},
			OutsourceOrderID: fixtureOrderID,
			LineNo:           1,
			ProductID:        fixtureProductID,
			ProductCode:      "ACCEPTANCE-PRODUCT",
			ProductName:      fixtureProductName,
			Quantity:         2,
			UOM:              "PCS",
			ProcessStepID:    fixtureProcessBID,
			ProcessCode:      "ACCEPTANCE-PROCESS-B",
			ProcessName:      "委外验收工序",
			Status:           services.OutsourceOrderStatusDraft,
			Version:          1,
		}
		if err := tx.Create(&line).Error; err != nil {
			return err
		}

		state := models.ProductBarcodeState{
			BaseModel:            models.BaseModel{ID: "00000000-0000-0000-0000-000000000213"},
			ProductBarcode:       fixtureBarcode,
			ProductID:            fixtureProductID,
			ProductName:          fixtureProductName,
			RouteID:              fixtureRouteID,
			RouteStepID:          "00000000-0000-0000-0000-000000000201",
			CurrentProcessStepID: fixtureProcessAID,
			Status:               "NOT_STARTED",
			LastEventID:          fixtureStateEventID,
		}
		if err := tx.Create(&state).Error; err != nil {
			return err
		}
		initialEvent := models.ProductBarcodeStateEvent{
			BaseModel:       models.BaseModel{ID: fixtureStateEventID},
			StateID:         state.ID,
			ProductBarcode:  fixtureBarcode,
			EventType:       "INITIALIZED",
			ToProcessStepID: fixtureProcessAID,
			RouteID:         fixtureRouteID,
			RouteStepID:     "00000000-0000-0000-0000-000000000201",
			Operator:        fixtureOperator,
			PayloadSnapshot: "{}",
		}
		if err := tx.Omit("from_process_step_id").Create(&initialEvent).Error; err != nil {
			return err
		}

		if err := seedNotificationRule(tx); err != nil {
			return err
		}
		return nil
	})
}

func seedNotificationRule(tx *gorm.DB) error {
	statusCodes, err := json.Marshal([]string{
		services.OutsourceOrderStatusReleased,
		services.OutsourceOrderStatusSent,
		services.OutsourceOrderStatusReturned,
		"INSPECTION_ACCEPTED",
		services.OutsourceOrderStatusClosed,
	})
	if err != nil {
		return err
	}
	if err := tx.Create(&models.StandardCommand{
		BaseModel:   models.BaseModel{ID: fixtureCommandID},
		ActionType:  "notify",
		BindType:    "workflow",
		NodeType:    "message",
		Title:       "委外验收 [OutsourceOrderNo] [Status]",
		Content:     "产品 [ProductName] / 条码 [ProductBarcode]",
		TargetLink:  "/production-outsourcing/transfers?search=[OutsourceOrderNo]",
		Params:      json.RawMessage(`{}`),
		SourceCode:  fixtureSourceCode,
		ActionCode:  fixtureActionCode,
		StatusCodes: statusCodes,
	}).Error; err != nil {
		return err
	}

	segments, err := json.Marshal([]services.RuleSegmentDTO{
		{
			ID:                "acceptance-outsource-segment",
			Title:             "委外验收通知",
			TargetStatuses:    []string{services.OutsourceOrderStatusReleased, services.OutsourceOrderStatusSent, services.OutsourceOrderStatusReturned, "INSPECTION_ACCEPTED", services.OutsourceOrderStatusClosed},
			CommandIDs:        []string{fixtureCommandID},
			AssigneeUsernames: []string{"admin"},
			ResolveOnStatuses: []string{services.OutsourceOrderStatusClosed},
		},
	})
	if err != nil {
		return err
	}
	return tx.Create(&models.NotificationRule{
		BaseModel:  models.BaseModel{ID: fixtureRuleID},
		Name:       "委外真实链路验收通知",
		Enabled:    true,
		Entity:     fixtureEntity,
		SourceCode: fixtureSourceCode,
		ActionCode: fixtureActionCode,
		Segments:   segments,
		Version:    1,
	}).Error
}

func runRedisNotificationAcceptance() error {
	if db.RDB == nil {
		return fmt.Errorf("redis client is required")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	if err := db.RDB.Ping(ctx).Err(); err != nil {
		return fmt.Errorf("redis ping failed: %w", err)
	}

	if err := runSuccessfulRedisNotificationAcceptance(); err != nil {
		_ = cleanupFixture()
		return err
	}
	if err := runFailedNotificationRetryAcceptance(); err != nil {
		_ = cleanupFixture()
		return err
	}
	if err := cleanupFixture(); err != nil {
		return err
	}
	fmt.Println("fixture=production-outsource-acceptance redisNotification=true normalTarget=admin retryTarget=admin cleaned=true")
	return nil
}

type acceptanceTransactionManager struct {
	database    *gorm.DB
	mu          sync.Mutex
	backendPIDs map[int64]struct{}
}

func (m *acceptanceTransactionManager) DB() *gorm.DB {
	return m.database
}

func (m *acceptanceTransactionManager) WithinTransaction(fn func(tx *gorm.DB) error) error {
	return m.database.Transaction(func(tx *gorm.DB) error {
		var backendPID int64
		if err := tx.Raw("SELECT pg_backend_pid()").Scan(&backendPID).Error; err != nil {
			return fmt.Errorf("read PostgreSQL backend pid: %w", err)
		}
		m.mu.Lock()
		m.backendPIDs[backendPID] = struct{}{}
		m.mu.Unlock()
		return fn(tx)
	})
}

type concurrencyCallResult struct {
	status string
	err    error
}

func runPostgresConcurrencyAcceptance() error {
	if db.DB == nil {
		return fmt.Errorf("postgres database is required")
	}
	sqlDB, err := db.DB.DB()
	if err != nil {
		return fmt.Errorf("get PostgreSQL connection pool: %w", err)
	}
	sqlDB.SetMaxOpenConns(20)
	sqlDB.SetMaxIdleConns(20)

	if err := cleanupFixture(); err != nil {
		return err
	}
	if err := seedConcurrencyFixture(); err != nil {
		return err
	}
	defer cleanupFixture()

	manager := &acceptanceTransactionManager{
		database:    db.DB,
		backendPIDs: make(map[int64]struct{}),
	}
	outsource := services.NewProductionOutsourcingService(manager)

	if err := acceptConcurrentRelease(outsource); err != nil {
		return err
	}
	if err := acceptConcurrentCancel(outsource); err != nil {
		return err
	}
	if err := acceptConcurrentSendQuantity(outsource); err != nil {
		return err
	}
	if err := acceptConcurrentDuplicateSend(outsource); err != nil {
		return err
	}
	if err := acceptConcurrentReturn(outsource); err != nil {
		return err
	}

	manager.mu.Lock()
	backendConnectionCount := len(manager.backendPIDs)
	manager.mu.Unlock()
	if backendConnectionCount < 2 {
		return fmt.Errorf("concurrency acceptance used fewer than two PostgreSQL backend connections: %d", backendConnectionCount)
	}

	fmt.Printf(
		"fixture=production-outsource-acceptance postgresConcurrency=true backendConnections=%d release=ok cancel=ok sendQuantity=ok duplicateSend=ok return=ok cleaned=true\n",
		backendConnectionCount,
	)
	return nil
}

func seedConcurrencyFixture() error {
	if err := seedFixture(); err != nil {
		return err
	}
	return db.DB.Transaction(func(tx *gorm.DB) error {
		orders := []struct {
			orderID string
			lineID  string
			orderNo string
			status  string
		}{
			{fixtureConcurrencyReleaseOrderID, fixtureConcurrencyReleaseLineID, "OSO-ACCEPTANCE-CONC-RELEASE", services.OutsourceOrderStatusDraft},
			{fixtureConcurrencyCancelOrderID, fixtureConcurrencyCancelLineID, "OSO-ACCEPTANCE-CONC-CANCEL", services.OutsourceOrderStatusDraft},
			{fixtureConcurrencySendOrderID, fixtureConcurrencySendLineID, "OSO-ACCEPTANCE-CONC-SEND", services.OutsourceOrderStatusReleased},
			{fixtureConcurrencyDuplicateOrderID, fixtureConcurrencyDuplicateLineID, "OSO-ACCEPTANCE-CONC-DUPLICATE", services.OutsourceOrderStatusReleased},
			{fixtureConcurrencyReturnOrderID, fixtureConcurrencyReturnLineID, "OSO-ACCEPTANCE-CONC-RETURN", services.OutsourceOrderStatusReleased},
		}
		for _, item := range orders {
			order := models.OutsourceOrder{
				BaseModel:           models.BaseModel{ID: item.orderID},
				OrderNo:             item.orderNo,
				SourceType:          services.OutsourceOrderSourceProductionPlan,
				SourceID:            "acceptance-concurrency-plan",
				SourceNo:            "ACCEPTANCE-CONCURRENCY-SOURCE",
				CustomerID:          fixtureCustomerID,
				CustomerName:        "委外并发验收客户",
				PartnerID:           fixturePartnerID,
				PartnerNameSnapshot: fixturePartnerName,
				Status:              item.status,
				TotalQuantity:       2,
				UOM:                 "PCS",
				Version:             1,
			}
			if err := tx.Create(&order).Error; err != nil {
				return err
			}
			line := models.OutsourceOrderLine{
				BaseModel:        models.BaseModel{ID: item.lineID},
				OutsourceOrderID: item.orderID,
				LineNo:           1,
				ProductID:        fixtureProductID,
				ProductCode:      "ACCEPTANCE-CONCURRENCY-PRODUCT",
				ProductName:      fixtureProductName,
				Quantity:         2,
				UOM:              "PCS",
				ProcessStepID:    fixtureProcessBID,
				ProcessCode:      "ACCEPTANCE-PROCESS-B",
				ProcessName:      "委外验收工序",
				Status:           item.status,
				Version:          1,
			}
			if err := tx.Create(&line).Error; err != nil {
				return err
			}
		}

		states := []struct {
			id      string
			eventID string
			barcode string
		}{
			{fixtureConcurrencySendStateA, fixtureConcurrencySendEventA, fixtureConcurrencySendBarcodeA},
			{fixtureConcurrencySendStateB, fixtureConcurrencySendEventB, fixtureConcurrencySendBarcodeB},
			{fixtureConcurrencyDuplicateState, fixtureConcurrencyDuplicateEvent, fixtureConcurrencyDuplicateBarcode},
			{fixtureConcurrencyReturnStateA, fixtureConcurrencyReturnEventA, fixtureConcurrencyReturnBarcodeA},
			{fixtureConcurrencyReturnStateB, fixtureConcurrencyReturnEventB, fixtureConcurrencyReturnBarcodeB},
		}
		for _, item := range states {
			state := models.ProductBarcodeState{
				BaseModel:            models.BaseModel{ID: item.id},
				ProductBarcode:       item.barcode,
				ProductID:            fixtureProductID,
				ProductName:          fixtureProductName,
				RouteID:              fixtureRouteID,
				RouteStepID:          "00000000-0000-0000-0000-000000000202",
				CurrentProcessStepID: fixtureProcessBID,
				Status:               "IN_PROGRESS",
				LastEventID:          item.eventID,
			}
			if err := tx.Create(&state).Error; err != nil {
				return err
			}
			event := models.ProductBarcodeStateEvent{
				BaseModel:         models.BaseModel{ID: item.eventID},
				StateID:           item.id,
				ProductBarcode:    item.barcode,
				EventType:         "INITIALIZED",
				FromProcessStepID: fixtureProcessBID,
				ToProcessStepID:   fixtureProcessBID,
				RouteID:           fixtureRouteID,
				RouteStepID:       "00000000-0000-0000-0000-000000000202",
				Operator:          fixtureOperator,
				PayloadSnapshot:   "{}",
			}
			if err := tx.Create(&event).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func runConcurrentCalls(count int, call func(index int) (string, error)) []concurrencyCallResult {
	results := make([]concurrencyCallResult, count)
	start := make(chan struct{})
	var waitGroup sync.WaitGroup
	waitGroup.Add(count)
	for index := 0; index < count; index++ {
		go func(index int) {
			defer waitGroup.Done()
			<-start
			results[index].status, results[index].err = call(index)
		}(index)
	}
	close(start)
	waitGroup.Wait()
	return results
}

func countSuccessfulCalls(results []concurrencyCallResult) int {
	count := 0
	for _, result := range results {
		if result.err == nil {
			count++
		}
	}
	return count
}

func requireConcurrentSuccessCount(label string, results []concurrencyCallResult, expected int) error {
	actual := countSuccessfulCalls(results)
	if actual == expected {
		return nil
	}
	errorsSeen := make([]string, 0, len(results))
	for _, result := range results {
		if result.err != nil {
			errorsSeen = append(errorsSeen, result.err.Error())
		}
	}
	return fmt.Errorf("%s expected %d successful calls, got %d; errors=%s", label, expected, actual, strings.Join(errorsSeen, " | "))
}

func acceptConcurrentRelease(outsource *services.ProductionOutsourcingService) error {
	results := runConcurrentCalls(2, func(_ int) (string, error) {
		order, err := outsource.ReleaseOutsourceOrder(services.ReleaseOutsourceOrderRequest{
			ID:       fixtureConcurrencyReleaseOrderID,
			ActorID:  fixtureOperator,
			Operator: fixtureOperator,
			IP:       "127.0.0.1",
		})
		if err != nil {
			return "", err
		}
		return order.Status, nil
	})
	if err := requireConcurrentSuccessCount("concurrent release", results, 1); err != nil {
		return err
	}
	var order models.OutsourceOrder
	if err := db.DB.First(&order, "id = ?", fixtureConcurrencyReleaseOrderID).Error; err != nil {
		return fmt.Errorf("load concurrently released order: %w", err)
	}
	if order.Status != services.OutsourceOrderStatusReleased {
		return fmt.Errorf("concurrent release final status expected RELEASED, got %s", order.Status)
	}
	return nil
}

func acceptConcurrentCancel(outsource *services.ProductionOutsourcingService) error {
	results := runConcurrentCalls(2, func(_ int) (string, error) {
		order, err := outsource.CancelOutsourceOrder(services.CancelOutsourceOrderRequest{
			ID:       fixtureConcurrencyCancelOrderID,
			ActorID:  fixtureOperator,
			Operator: fixtureOperator,
			IP:       "127.0.0.1",
		})
		if err != nil {
			return "", err
		}
		return order.Status, nil
	})
	if err := requireConcurrentSuccessCount("concurrent cancel", results, 1); err != nil {
		return err
	}
	var order models.OutsourceOrder
	if err := db.DB.First(&order, "id = ?", fixtureConcurrencyCancelOrderID).Error; err != nil {
		return fmt.Errorf("load concurrently canceled order: %w", err)
	}
	if order.Status != services.OutsourceOrderStatusCanceled {
		return fmt.Errorf("concurrent cancel final status expected CANCELED, got %s", order.Status)
	}
	return nil
}

func acceptConcurrentSendQuantity(outsource *services.ProductionOutsourcingService) error {
	results := runConcurrentCalls(2, func(index int) (string, error) {
		barcode := fixtureConcurrencySendBarcodeA
		if index == 1 {
			barcode = fixtureConcurrencySendBarcodeB
		}
		order, err := outsource.SendOutsourceOrderLine(services.OutsourceTransferRequest{
			OutsourceOrderLineID: fixtureConcurrencySendLineID,
			ProductBarcode:       barcode,
			Quantity:             2,
			UOM:                  "PCS",
			SourceCategory:       "FINISHED",
			TargetCategory:       services.ProductionOutsourceInventoryCategory,
			ActorID:              fixtureOperator,
			Operator:             fixtureOperator,
			IP:                   "127.0.0.1",
		})
		if err != nil {
			return "", err
		}
		return order.Order.Status, nil
	})
	if err := requireConcurrentSuccessCount("concurrent send quantity", results, 1); err != nil {
		return err
	}
	var line models.OutsourceOrderLine
	if err := db.DB.First(&line, "id = ?", fixtureConcurrencySendLineID).Error; err != nil {
		return fmt.Errorf("load concurrently sent line: %w", err)
	}
	if math.Abs(line.SentQuantity-2) > 0.000001 {
		return fmt.Errorf("concurrent send quantity expected 2, got %v", line.SentQuantity)
	}
	var transferCount int64
	if err := db.DB.Model(&models.OutsourceTransfer{}).
		Where("outsource_order_line_id = ?", fixtureConcurrencySendLineID).
		Count(&transferCount).Error; err != nil {
		return fmt.Errorf("count concurrent send transfers: %w", err)
	}
	if transferCount != 1 {
		return fmt.Errorf("concurrent send expected one transfer fact, got %d", transferCount)
	}
	var order models.OutsourceOrder
	if err := db.DB.First(&order, "id = ?", fixtureConcurrencySendOrderID).Error; err != nil {
		return fmt.Errorf("load concurrently sent order: %w", err)
	}
	if order.Status != services.OutsourceOrderStatusSent {
		return fmt.Errorf("concurrent send final status expected SENT, got %s", order.Status)
	}
	return nil
}

func acceptConcurrentDuplicateSend(outsource *services.ProductionOutsourcingService) error {
	results := runConcurrentCalls(2, func(_ int) (string, error) {
		order, err := outsource.SendOutsourceOrderLine(services.OutsourceTransferRequest{
			OutsourceOrderLineID: fixtureConcurrencyDuplicateLineID,
			ProductBarcode:       fixtureConcurrencyDuplicateBarcode,
			Quantity:             1,
			UOM:                  "PCS",
			SourceCategory:       "FINISHED",
			TargetCategory:       services.ProductionOutsourceInventoryCategory,
			ActorID:              fixtureOperator,
			Operator:             fixtureOperator,
			IP:                   "127.0.0.1",
		})
		if err != nil {
			return "", err
		}
		return order.Order.Status, nil
	})
	if err := requireConcurrentSuccessCount("concurrent duplicate send", results, 1); err != nil {
		return err
	}
	var transferCount int64
	if err := db.DB.Model(&models.OutsourceTransfer{}).
		Where("outsource_order_line_id = ?", fixtureConcurrencyDuplicateLineID).
		Count(&transferCount).Error; err != nil {
		return fmt.Errorf("count duplicate send transfers: %w", err)
	}
	if transferCount != 1 {
		return fmt.Errorf("concurrent duplicate send expected one transfer fact, got %d", transferCount)
	}
	return nil
}

func acceptConcurrentReturn(outsource *services.ProductionOutsourcingService) error {
	for _, barcode := range []string{fixtureConcurrencyReturnBarcodeA, fixtureConcurrencyReturnBarcodeB} {
		if _, err := outsource.SendOutsourceOrderLine(services.OutsourceTransferRequest{
			OutsourceOrderLineID: fixtureConcurrencyReturnLineID,
			ProductBarcode:       barcode,
			Quantity:             1,
			UOM:                  "PCS",
			SourceCategory:       "FINISHED",
			TargetCategory:       services.ProductionOutsourceInventoryCategory,
			ActorID:              fixtureOperator,
			Operator:             fixtureOperator,
			IP:                   "127.0.0.1",
		}); err != nil {
			return fmt.Errorf("seed sent quantity for concurrent return %s: %w", barcode, err)
		}
	}

	results := runConcurrentCalls(2, func(index int) (string, error) {
		barcode := fixtureConcurrencyReturnBarcodeA
		if index == 1 {
			barcode = fixtureConcurrencyReturnBarcodeB
		}
		order, err := outsource.ReturnOutsourceOrderLine(services.OutsourceTransferRequest{
			OutsourceOrderLineID: fixtureConcurrencyReturnLineID,
			ProductBarcode:       barcode,
			Quantity:             1,
			UOM:                  "PCS",
			SourceCategory:       services.ProductionOutsourceInventoryCategory,
			TargetCategory:       "FINISHED",
			ActorID:              fixtureOperator,
			Operator:             fixtureOperator,
			IP:                   "127.0.0.1",
		})
		if err != nil {
			return "", err
		}
		return order.Order.Status, nil
	})
	if err := requireConcurrentSuccessCount("concurrent return", results, 2); err != nil {
		return err
	}
	var line models.OutsourceOrderLine
	if err := db.DB.First(&line, "id = ?", fixtureConcurrencyReturnLineID).Error; err != nil {
		return fmt.Errorf("load concurrently returned line: %w", err)
	}
	if math.Abs(line.ReturnedQuantity-2) > 0.000001 {
		return fmt.Errorf("concurrent return quantity expected 2, got %v", line.ReturnedQuantity)
	}
	var transferCount int64
	if err := db.DB.Model(&models.OutsourceTransfer{}).
		Where("outsource_order_line_id = ? AND transfer_type = ?", fixtureConcurrencyReturnLineID, services.OutsourceTransferTypeReturn).
		Count(&transferCount).Error; err != nil {
		return fmt.Errorf("count concurrent return transfers: %w", err)
	}
	if transferCount != 2 {
		return fmt.Errorf("concurrent return expected two transfer facts, got %d", transferCount)
	}
	var order models.OutsourceOrder
	if err := db.DB.First(&order, "id = ?", fixtureConcurrencyReturnOrderID).Error; err != nil {
		return fmt.Errorf("load concurrently returned order: %w", err)
	}
	if order.Status != services.OutsourceOrderStatusReturned {
		return fmt.Errorf("concurrent return final status expected RETURNED, got %s", order.Status)
	}
	return nil
}

func runAuthorizationAcceptance() error {
	if db.DB == nil {
		return fmt.Errorf("postgres database is required")
	}
	if err := cleanupFixture(); err != nil {
		return err
	}
	if err := seedAuthorizationFixture(); err != nil {
		return err
	}
	defer cleanupFixture()

	manager := &acceptanceTransactionManager{
		database:    db.DB,
		backendPIDs: make(map[int64]struct{}),
	}
	scan := services.NewProductionScanCommandService(manager)
	outsource := services.NewProductionOutsourcingService(manager)

	if err := acceptCrossRouteScanDenied(scan); err != nil {
		return err
	}
	if err := acceptCanceledOutsourceExecutionDenied(outsource); err != nil {
		return err
	}
	if err := acceptHTTPScanPermissionDenied(); err != nil {
		return err
	}

	fmt.Println("fixture=production-outsource-acceptance authorization=true crossRoute=denied canceledOutsource=denied httpScanPermission=denied cleaned=true")
	return nil
}

func seedAuthorizationFixture() error {
	if err := seedFixture(); err != nil {
		return err
	}
	return db.DB.Transaction(func(tx *gorm.DB) error {
		foreignRoute := models.ProductionRoute{
			BaseModel:   models.BaseModel{ID: fixtureForeignRouteID},
			Code:        "ACCEPTANCE-FOREIGN-ROUTE",
			Name:        "委外跨路线拒绝验收路线",
			ProductID:   fixtureProductID,
			ProductName: fixtureProductName,
			Version:     1,
			Status:      "PUBLISHED",
		}
		if err := tx.Create(&foreignRoute).Error; err != nil {
			return err
		}
		foreignStep := models.ProductionRouteStep{
			BaseModel:     models.BaseModel{ID: fixtureForeignRouteStepID},
			RouteID:       fixtureForeignRouteID,
			Sequence:      1,
			SegmentID:     fixtureSegmentBID,
			ProcessStepID: fixtureProcessBID,
			ExecutionMode: "IN_HOUSE",
			QualityGate:   "NONE",
		}
		if err := tx.Create(&foreignStep).Error; err != nil {
			return err
		}

		user := models.User{
			ID:       fixtureAuthorizationUserID,
			Username: "acceptance-scan-reader",
			Password: "acceptance-fixture-password",
			Status:   "active",
		}
		if err := tx.Create(&user).Error; err != nil {
			return err
		}
		permission := models.UserPermission{
			BaseModel:    models.BaseModel{ID: fixtureAuthorizationPermissionID},
			UserID:       fixtureAuthorizationUserID,
			PermissionID: authz.MenuProdConfig,
			Source:       "acceptance",
			Reason:       "production acceptance fixture",
		}
		return tx.Create(&permission).Error
	})
}

func acceptCrossRouteScanDenied(scan *services.ProductionScanCommandService) error {
	var beforeCount int64
	if err := db.DB.Model(&models.ProductionOperationExecution{}).
		Where("product_barcode = ?", fixtureBarcode).
		Count(&beforeCount).Error; err != nil {
		return fmt.Errorf("count operations before cross-route rejection: %w", err)
	}

	_, err := scan.ExecuteProductionScanCommand(services.ExecuteProductionScanCommandRequest{
		ProductBarcode:      fixtureBarcode,
		Action:              services.ProductionOperationActionComplete,
		TargetRouteStepID:   fixtureForeignRouteStepID,
		TargetProcessStepID: fixtureProcessBID,
		CommandSource:       services.ProductionScanCommandSourceWeb,
		Operator:            fixtureOperator,
		ActorID:             fixtureAuthorizationUserID,
		IP:                  "127.0.0.1",
	})
	if !errors.Is(err, services.ErrInvalidProductionScanCommand) {
		return fmt.Errorf("cross-route scan expected ErrInvalidProductionScanCommand, got %v", err)
	}

	var afterCount int64
	if err := db.DB.Model(&models.ProductionOperationExecution{}).
		Where("product_barcode = ?", fixtureBarcode).
		Count(&afterCount).Error; err != nil {
		return fmt.Errorf("count operations after cross-route rejection: %w", err)
	}
	if afterCount != beforeCount {
		return fmt.Errorf("cross-route scan wrote an operation fact: before=%d after=%d", beforeCount, afterCount)
	}

	var state models.ProductBarcodeState
	if err := db.DB.First(&state, "product_barcode = ?", fixtureBarcode).Error; err != nil {
		return fmt.Errorf("load barcode state after cross-route rejection: %w", err)
	}
	if state.RouteID != fixtureRouteID || state.RouteStepID != "00000000-0000-0000-0000-000000000201" {
		return fmt.Errorf("cross-route scan changed barcode route state: route=%s step=%s", state.RouteID, state.RouteStepID)
	}
	return nil
}

func acceptCanceledOutsourceExecutionDenied(outsource *services.ProductionOutsourcingService) error {
	if _, err := outsource.CancelOutsourceOrder(services.CancelOutsourceOrderRequest{
		ID:       fixtureOrderID,
		ActorID:  fixtureAuthorizationUserID,
		Operator: "acceptance-scan-reader",
		IP:       "127.0.0.1",
	}); err != nil {
		return fmt.Errorf("cancel authorization fixture outsource order: %w", err)
	}

	_, err := outsource.SendOutsourceOrderLine(services.OutsourceTransferRequest{
		OutsourceOrderLineID: fixtureOrderLineID,
		ProductBarcode:       fixtureBarcode,
		Quantity:             1,
		UOM:                  "PCS",
		SourceCategory:       "FINISHED",
		TargetCategory:       services.ProductionOutsourceInventoryCategory,
		ActorID:              fixtureAuthorizationUserID,
		Operator:             "acceptance-scan-reader",
		IP:                   "127.0.0.1",
	})
	if !errors.Is(err, services.ErrInvalidOutsourceOrder) {
		return fmt.Errorf("canceled outsource execution expected ErrInvalidOutsourceOrder, got %v", err)
	}

	var transferCount int64
	if err := db.DB.Model(&models.OutsourceTransfer{}).
		Where("outsource_order_line_id = ?", fixtureOrderLineID).
		Count(&transferCount).Error; err != nil {
		return fmt.Errorf("count canceled outsource transfers: %w", err)
	}
	if transferCount != 0 {
		return fmt.Errorf("canceled outsource execution wrote %d transfer facts", transferCount)
	}
	return nil
}

func acceptHTTPScanPermissionDenied() error {
	middleware.InitJwt()
	gin.SetMode(gin.TestMode)
	router := gin.New()
	routes.SetupRoutes(router)

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": fixtureAuthorizationUserID,
		"exp": time.Now().Add(time.Hour).Unix(),
	})
	signedToken, err := token.SignedString(middleware.JwtSecret)
	if err != nil {
		return fmt.Errorf("sign authorization acceptance token: %w", err)
	}

	csrfRequest := httptest.NewRequest(http.MethodGet, "/api/v1/csrf-token", nil)
	csrfRecorder := httptest.NewRecorder()
	router.ServeHTTP(csrfRecorder, csrfRequest)
	if csrfRecorder.Code != http.StatusOK {
		return fmt.Errorf("fetch CSRF token for permission acceptance returned %d", csrfRecorder.Code)
	}
	csrfToken := strings.TrimSpace(csrfRecorder.Header().Get("X-CSRF-Token"))
	if csrfToken == "" {
		return fmt.Errorf("permission acceptance CSRF token is empty")
	}
	cookies := csrfRecorder.Result().Cookies()
	if len(cookies) == 0 {
		return fmt.Errorf("permission acceptance CSRF cookie is missing")
	}

	request := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/production/scan-commands/execute",
		strings.NewReader(`{"productBarcode":"`+fixtureBarcode+`","action":"START","commandSource":"WEB"}`),
	)
	request.Header.Set("Authorization", "Bearer "+signedToken)
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("X-CSRF-Token", csrfToken)
	request.AddCookie(cookies[0])
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)
	if recorder.Code != http.StatusForbidden {
		return fmt.Errorf("scan without execution permission expected HTTP 403, got %d body=%s", recorder.Code, recorder.Body.String())
	}
	if !strings.Contains(strings.ToLower(recorder.Body.String()), "insufficient permissions") {
		return fmt.Errorf("scan without execution permission returned unexpected body: %s", recorder.Body.String())
	}
	return nil
}

func runSuccessfulRedisNotificationAcceptance() error {
	if err := cleanupFixture(); err != nil {
		return err
	}
	if err := seedFixture(); err != nil {
		return err
	}

	pubsub, messages, err := subscribeAcceptanceNotifications()
	if err != nil {
		return err
	}
	defer pubsub.Close()

	if _, err := services.ReleaseOutsourceOrder(services.ReleaseOutsourceOrderRequest{
		ID:       fixtureOrderID,
		ActorID:  fixtureOperator,
		Operator: fixtureOperator,
		IP:       "127.0.0.1",
	}); err != nil {
		return fmt.Errorf("release fixture order for redis notification: %w", err)
	}

	message, err := waitForAcceptanceNotification(messages, func(payload map[string]any) bool {
		inner := notificationPayload(payload)
		return payload["module"] == "Workflow" &&
			payload["action"] == fixtureActionCode &&
			payload["targetUser"] == "admin" &&
			inner["eventKey"] == fixtureReleaseEventKey() &&
			inner["sourceCode"] == fixtureSourceCode &&
			inner["status"] == services.OutsourceOrderStatusReleased
	})
	if err != nil {
		return err
	}
	if _, err := findFixtureNotifyExecutionLog(services.OutsourceOrderStatusReleased, "success"); err != nil {
		return err
	}
	fmt.Printf("redisNotification=normal received=true target=%s title=%s\n", message["targetUser"], message["title"])
	return nil
}

func runFailedNotificationRetryAcceptance() error {
	if err := cleanupFixture(); err != nil {
		return err
	}
	if err := seedFixture(); err != nil {
		return err
	}

	realRDB := db.RDB
	failingRDB := redis.NewClient(&redis.Options{
		Addr:         "127.0.0.1:1",
		DB:           0,
		DialTimeout:  100 * time.Millisecond,
		ReadTimeout:  100 * time.Millisecond,
		WriteTimeout: 100 * time.Millisecond,
		MaxRetries:   0,
	})
	db.RDB = failingRDB
	_, releaseErr := services.ReleaseOutsourceOrder(services.ReleaseOutsourceOrderRequest{
		ID:       fixtureOrderID,
		ActorID:  fixtureOperator,
		Operator: fixtureOperator,
		IP:       "127.0.0.1",
	})
	_ = failingRDB.Close()
	db.RDB = realRDB
	if releaseErr != nil {
		return fmt.Errorf("release fixture order with failing redis should keep business fact: %w", releaseErr)
	}

	failedLog, err := findFixtureNotifyExecutionLog(services.OutsourceOrderStatusReleased, "failed")
	if err != nil {
		return err
	}
	if strings.TrimSpace(failedLog.ErrorMessage) == "" {
		return fmt.Errorf("expected failed notification log to keep redis error message")
	}

	pubsub, messages, err := subscribeAcceptanceNotifications()
	if err != nil {
		return err
	}
	defer pubsub.Close()

	retryLog, err := services.RetryRuleExecutionNotificationLog(failedLog.ID)
	if err != nil {
		return fmt.Errorf("retry failed notification log: %w", err)
	}
	if retryLog.ExecutionStatus != "success" {
		return fmt.Errorf("expected retry log success, got %s: %s", retryLog.ExecutionStatus, retryLog.ErrorMessage)
	}

	message, err := waitForAcceptanceNotification(messages, func(payload map[string]any) bool {
		inner := notificationPayload(payload)
		return payload["module"] == "Workflow" &&
			payload["targetUser"] == "admin" &&
			inner["retryOfLogId"] == failedLog.ID &&
			inner["eventKey"] == failedLog.EventKey
	})
	if err != nil {
		return err
	}
	fmt.Printf(
		"redisNotification=retry received=true failedLogId=%s retryLogId=%s target=%s title=%s\n",
		failedLog.ID,
		retryLog.ID,
		message["targetUser"],
		message["title"],
	)
	return nil
}

func subscribeAcceptanceNotifications() (*redis.PubSub, <-chan *redis.Message, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	pubsub := db.RDB.Subscribe(ctx, "xdfc_notifications")
	if _, err := pubsub.Receive(ctx); err != nil {
		_ = pubsub.Close()
		return nil, nil, fmt.Errorf("subscribe redis notification channel: %w", err)
	}
	return pubsub, pubsub.Channel(), nil
}

func waitForAcceptanceNotification(messages <-chan *redis.Message, matches func(map[string]any) bool) (map[string]any, error) {
	timeout := time.After(5 * time.Second)
	for {
		select {
		case <-timeout:
			return nil, fmt.Errorf("timed out waiting for acceptance notification on Redis")
		case message, ok := <-messages:
			if !ok {
				return nil, fmt.Errorf("redis notification channel closed")
			}
			var payload map[string]any
			if err := json.Unmarshal([]byte(message.Payload), &payload); err != nil {
				continue
			}
			if matches(payload) {
				return payload, nil
			}
		}
	}
}

func notificationPayload(message map[string]any) map[string]any {
	payload, ok := message["payload"].(map[string]any)
	if !ok || payload == nil {
		return map[string]any{}
	}
	return payload
}

func fixtureReleaseEventKey() string {
	return strings.Join([]string{
		fixtureSourceCode,
		fixtureOrderID,
		fixtureActionCode,
		services.OutsourceOrderStatusDraft,
		services.OutsourceOrderStatusReleased,
	}, ":")
}

func findFixtureNotifyExecutionLog(statusCode string, executionStatus string) (models.RuleExecutionLog, error) {
	var logEntry models.RuleExecutionLog
	err := db.DB.
		Where("rule_id = ? AND command_id = ? AND status_code = ? AND execution_type = ? AND execution_status = ?",
			fixtureRuleID,
			fixtureCommandID,
			statusCode,
			"notify",
			executionStatus,
		).
		Order("created_at desc").
		First(&logEntry).Error
	if err != nil {
		return models.RuleExecutionLog{}, fmt.Errorf("find %s fixture notify execution log: %w", executionStatus, err)
	}
	return logEntry, nil
}

func cleanupFixture() error {
	return db.DB.Transaction(func(tx *gorm.DB) error {
		concurrencyOrderIDs := []string{
			fixtureConcurrencyReleaseOrderID,
			fixtureConcurrencyCancelOrderID,
			fixtureConcurrencySendOrderID,
			fixtureConcurrencyDuplicateOrderID,
			fixtureConcurrencyReturnOrderID,
		}
		concurrencyLineIDs := []string{
			fixtureConcurrencyReleaseLineID,
			fixtureConcurrencyCancelLineID,
			fixtureConcurrencySendLineID,
			fixtureConcurrencyDuplicateLineID,
			fixtureConcurrencyReturnLineID,
		}
		concurrencyBarcodes := []string{
			fixtureConcurrencySendBarcodeA,
			fixtureConcurrencySendBarcodeB,
			fixtureConcurrencyDuplicateBarcode,
			fixtureConcurrencyReturnBarcodeA,
			fixtureConcurrencyReturnBarcodeB,
		}
		orderIDs := append([]string{fixtureOrderID}, concurrencyOrderIDs...)
		lineIDs := append([]string{fixtureOrderLineID}, concurrencyLineIDs...)
		barcodes := append([]string{fixtureBarcode}, concurrencyBarcodes...)

		var operationIDs []string
		if err := tx.Model(&models.ProductionOperationExecution{}).
			Where("product_barcode IN ?", barcodes).
			Pluck("id", &operationIDs).Error; err != nil {
			return err
		}
		var transferEventIDs []string
		if err := tx.Model(&models.ProductBarcodeTransferEvent{}).
			Where("product_barcode IN ?", barcodes).
			Pluck("id", &transferEventIDs).Error; err != nil {
			return err
		}
		auditTargetIDs := append([]string{fixturePartnerID}, orderIDs...)
		auditTargetIDs = append(auditTargetIDs, lineIDs...)
		auditTargetIDs = append(auditTargetIDs, barcodes...)
		auditTargetIDs = append(auditTargetIDs, operationIDs...)
		auditTargetIDs = append(auditTargetIDs, transferEventIDs...)
		if len(auditTargetIDs) > 0 {
			if err := tx.Unscoped().Where("target_id IN ?", auditTargetIDs).Delete(&models.AuditLog{}).Error; err != nil {
				return err
			}
		}
		if err := tx.Unscoped().Where("rule_id = ? OR command_id = ?", fixtureRuleID, fixtureCommandID).Delete(&models.RuleExecutionLog{}).Error; err != nil {
			return err
		}
		deleteTargets := []struct {
			model any
			where string
			args  []any
		}{
			{&models.OutsourceInspection{}, "outsource_order_id IN ?", []any{orderIDs}},
			{&models.OutsourceTransfer{}, "outsource_order_id IN ?", []any{orderIDs}},
			{&models.InventoryLedgerEntry{}, "source_id IN ?", []any{orderIDs}},
			{&models.ProductBarcodeStateEvent{}, "product_barcode IN ?", []any{barcodes}},
			{&models.ProductBarcodeState{}, "product_barcode IN ?", []any{barcodes}},
			{&models.ProductionOperationExecution{}, "product_barcode IN ?", []any{barcodes}},
			{&models.ProductBarcodeTransferEvent{}, "product_barcode IN ?", []any{barcodes}},
			{&models.OutsourceOrderLine{}, "id IN ?", []any{lineIDs}},
			{&models.OutsourceOrder{}, "id IN ?", []any{orderIDs}},
			{&models.UserPermission{}, "id = ?", []any{fixtureAuthorizationPermissionID}},
			{&models.User{}, "id = ?", []any{fixtureAuthorizationUserID}},
			{&models.ProductionRouteStep{}, "id = ?", []any{fixtureForeignRouteStepID}},
			{&models.ProductionRoute{}, "id = ?", []any{fixtureForeignRouteID}},
			{&models.ProductionRouteStep{}, "route_id = ?", []any{fixtureRouteID}},
			{&models.ProductionRoute{}, "id = ?", []any{fixtureRouteID}},
			{&models.LineSegment{}, "line_id = ?", []any{fixtureLineID}},
			{&models.ProductionLine{}, "id = ?", []any{fixtureLineID}},
			{&models.ProcessStep{}, "id IN ?", []any{[]string{fixtureProcessAID, fixtureProcessBID}}},
			{&models.OutsourcePartner{}, "id = ?", []any{fixturePartnerID}},
			{&models.StandardCommand{}, "id = ?", []any{fixtureCommandID}},
			{&models.NotificationRule{}, "id = ?", []any{fixtureRuleID}},
			{&models.ProductInventoryMaterialMapping{}, "product_id = ?", []any{fixtureProductID}},
			{&models.Product{}, "id = ?", []any{fixtureProductID}},
			{&models.Inventory{}, "material_id = ?", []any{fixtureMaterialID}},
			{&models.Material{}, "id = ?", []any{fixtureMaterialID}},
		}
		for _, target := range deleteTargets {
			if err := tx.Unscoped().Where(target.where, target.args...).Delete(target.model).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					continue
				}
				return err
			}
		}
		return nil
	})
}
