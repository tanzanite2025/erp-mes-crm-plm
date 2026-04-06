//go:build stress
// +build stress

package handlers

import (
	"fmt"
	"sync"
	"testing"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"
)

// TestHighConcurrencyStatusSwitches 高并发状态切换压力测试
// 使用方法: go test -v -tags=stress ./handlers/stress_test.go
func TestHighConcurrencyStatusSwitches(t *testing.T) {
	// 准备 10 个测试模具
	var molds []models.Mold
	for i := 0; i < 10; i++ {
		m := models.Mold{SN: fmt.Sprintf("STRESS-%d", i), Status: "IDLE"}
		db.DB.Create(&m)
		molds = append(molds, m)
	}

	const concurrentWorkers = 50
	const iterationsPerWorker = 20
	var wg sync.WaitGroup
	wg.Add(concurrentWorkers)

	start := time.Now()
	for i := 0; i < concurrentWorkers; i++ {
		go func(workerID int) {
			defer wg.Done()
			for j := 0; j < iterationsPerWorker; j++ {
				m := &molds[workerID%10]
				// 模拟随机状态切换
				status := "IN_USE"
				if j%2 == 0 {
					status = "IDLE"
				}

				db.DB.Model(m).Update("status", status)
			}
		}(i)
	}

	wg.Wait()
	duration := time.Since(start)

	t.Logf("Completed %d updates across %d workers in %v", concurrentWorkers*iterationsPerWorker, concurrentWorkers, duration)
}
