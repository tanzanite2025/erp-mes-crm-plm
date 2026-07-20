package audit

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"
	"xdfc-server/models"

	"gorm.io/gorm"
)

const (
	HotRetentionDays = 30
	HotRetention     = HotRetentionDays * 24 * time.Hour
	archiveDir       = "storage/audit_archive"
)

// StartArchiver 启动后台审计归档任务
func StartArchiver(db *gorm.DB) {
	// 每天凌晨 2 点执行
	go func() {
		for {
			now := time.Now()
			next := now.Add(time.Hour * 24)
			next = time.Date(next.Year(), next.Month(), next.Day(), 2, 0, 0, 0, next.Location())
			t := time.NewTimer(next.Sub(now))

			select {
			case <-t.C:
				runArchive(db)
			}
		}
	}()
}

func runArchive(db *gorm.DB) {
	fmt.Println("[AUDIT_ARCHIVER] Starting archival task...")
	cutoff := time.Now().Add(-HotRetention)

	var oldLogs []models.AuditLog
	// 分批处理，避免内存溢出
	batchSize := 500
	for {
		if err := db.Where("created_at < ?", cutoff).Limit(batchSize).Find(&oldLogs).Error; err != nil {
			fmt.Printf("[AUDIT_ARCHIVER_ERROR] failed to fetch old logs: %v\n", err)
			break
		}

		if len(oldLogs) == 0 {
			break
		}

		// 按模块分类并归档
		if err := processBatch(db, oldLogs); err != nil {
			fmt.Printf("[AUDIT_ARCHIVER_ERROR] process batch failed: %v\n", err)
			break
		}

		fmt.Printf("[AUDIT_ARCHIVER] Archived %d records.\n", len(oldLogs))
	}
}

func processBatch(db *gorm.DB, logs []models.AuditLog) error {
	// 按照 Module / Year / Month 组织归档
	for _, log := range logs {
		year, month, _ := log.CreatedAt.Date()
		dir := filepath.Join(archiveDir, fmt.Sprintf("%d", year), fmt.Sprintf("%02d", month))
		if err := os.MkdirAll(dir, 0755); err != nil {
			return err
		}

		filePath := filepath.Join(dir, fmt.Sprintf("%s.json", log.Module))

		// 以追加模式打开文件
		f, err := os.OpenFile(filePath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
		if err != nil {
			return err
		}

		data, _ := json.Marshal(log)
		if _, err := f.Write(append(data, '\n')); err != nil {
			_ = f.Close()
			return err
		}
		_ = f.Close()
	}

	// 物理删除已归档的数据
	ids := make([]string, len(logs))
	for i, l := range logs {
		ids[i] = l.ID
	}
	return db.Unscoped().Where("id IN ?", ids).Delete(&models.AuditLog{}).Error
}
